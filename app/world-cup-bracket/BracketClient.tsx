'use client'

import { useEffect, useRef, useState } from 'react'
import {
  groups,
  roundOf32,
  roundOf16,
  quarterFinals,
  semiFinals,
  thirdPlaceMatch,
  finalMatch,
  allMatches,
  allThirdSlotLabels,
  getMatch,
  teamById,
  type Group,
  type Matchup,
  type SlotRef,
  type TeamId,
} from '@/data/tournament-data'
import { matchupOdds, probabilitySource } from '@/lib/probability'

/* ---------- state model ----------------------------------------------- */

interface Picks {
  bracketName: string
  groupFirst: Record<string, TeamId | ''>
  groupSecond: Record<string, TeamId | ''>
  groupThird: Record<string, TeamId | ''>
  thirdSlot: Record<string, TeamId | ''>
  winner: Record<string, TeamId | ''>
}

const thirdSlots = allThirdSlotLabels()

const emptyPicks = (): Picks => ({
  bracketName: '',
  groupFirst: Object.fromEntries(groups.map((g) => [g.id, ''])),
  groupSecond: Object.fromEntries(groups.map((g) => [g.id, ''])),
  groupThird: Object.fromEntries(groups.map((g) => [g.id, ''])),
  thirdSlot: Object.fromEntries(thirdSlots.map((s) => [s.label, ''])),
  winner: Object.fromEntries(allMatches.map((m) => [m.id, ''])),
})

function resolveSide(side: SlotRef, picks: Picks): TeamId | '' {
  if (side.kind === 'GROUP') {
    return side.place === 1 ? picks.groupFirst[side.group] : picks.groupSecond[side.group]
  }
  if (side.kind === 'THIRD') {
    return picks.thirdSlot[side.label]
  }
  if (side.kind === 'WINNER') {
    return picks.winner[side.from]
  }
  const w = picks.winner[side.from]
  if (!w) return ''
  const m = getMatch(side.from)
  if (!m) return ''
  const top = resolveSide(m.top, picks)
  const bottom = resolveSide(m.bottom, picks)
  if (w === top) return bottom
  if (w === bottom) return top
  return ''
}

function reconcile(picks: Picks): Picks {
  const next: Picks = {
    ...picks,
    thirdSlot: { ...picks.thirdSlot },
    winner: { ...picks.winner },
  }

  // 1. Clear wildcard-slot assignments whose team is no longer a third-place
  //    pick in any of that slot's eligible groups (e.g. user changed a
  //    groupThird pick out from under a previously-assigned slot).
  for (const s of thirdSlots) {
    const assigned = next.thirdSlot[s.label]
    if (!assigned) continue
    const stillEligible = s.eligibleGroups.some((g) => next.groupThird[g] === assigned)
    if (!stillEligible) next.thirdSlot[s.label] = ''
  }

  // 2. Clear matchup winners whose team is no longer in {top, bottom}. The
  //    walk is in upstream-to-downstream order via `allMatches`, so a single
  //    pass cascades through R32 → R16 → QF → SF → Final.
  for (const m of allMatches) {
    const top = resolveSide(m.top, next)
    const bottom = resolveSide(m.bottom, next)
    const w = next.winner[m.id]
    if (w && w !== top && w !== bottom) {
      next.winner[m.id] = ''
    }
  }
  return next
}

/* ---------- helpers --------------------------------------------------- */

const teamLabel = (id: TeamId | ''): string => {
  if (!id) return ''
  const t = teamById[id]
  return t ? `${t.flag ?? ''} ${t.name}`.trim() : id
}

const slotPlaceholder = (side: SlotRef): string => {
  switch (side.kind) {
    case 'GROUP':
      return `${side.place === 1 ? 'Winner' : 'Runner-up'} of Group ${side.group}`
    case 'THIRD':
      return `Third place ${side.label}`
    case 'WINNER':
      return `Winner of ${side.from}`
    case 'LOSER':
      return `Loser of ${side.from}`
  }
}

const teamShort = (id: TeamId | ''): string => {
  if (!id) return ''
  const t = teamById[id]
  return t ? `${t.flag ?? ''} ${t.short}`.trim() : id
}

const slotShortLabel = (side: SlotRef): string => {
  switch (side.kind) {
    case 'GROUP':
      return `${side.place}${side.group}`
    case 'THIRD':
      return `3 ${side.eligibleGroups.join('')}`
    case 'WINNER':
      return `→ ${side.from}`
    case 'LOSER':
      return `L ${side.from}`
  }
}

const selectClass =
  'block w-full rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm text-gray-900 ' +
  'focus:border-primary-500 focus:ring-primary-500 focus:outline-none ' +
  'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

/* ---------- main component ------------------------------------------- */

export default function BracketClient() {
  const [picks, setPicks] = useState<Picks>(emptyPicks)
  const lastFinalWinner = useRef<TeamId | ''>('')

  const setBracketName = (name: string) => setPicks((p) => ({ ...p, bracketName: name }))

  const setGroupPlace = (
    place: 'groupFirst' | 'groupSecond' | 'groupThird',
    groupId: string,
    teamId: TeamId | ''
  ) => setPicks((p) => reconcile({ ...p, [place]: { ...p[place], [groupId]: teamId } }))

  const setThirdSlot = (label: string, teamId: TeamId | '') =>
    setPicks((p) => reconcile({ ...p, thirdSlot: { ...p.thirdSlot, [label]: teamId } }))

  const setWinner = (matchId: string, teamId: TeamId | '') =>
    setPicks((p) => reconcile({ ...p, winner: { ...p.winner, [matchId]: teamId } }))

  const finalWinner = picks.winner['FINAL']

  /* Fire confetti only when FINAL transitions from empty → a team. */
  useEffect(() => {
    if (finalWinner && finalWinner !== lastFinalWinner.current) {
      fireConfetti()
    }
    lastFinalWinner.current = finalWinner
  }, [finalWinner])

  return (
    <div className="bracket-root space-y-10">
      <BracketHeader
        bracketName={picks.bracketName}
        setBracketName={setBracketName}
        finalWinner={finalWinner}
        onReset={() => setPicks(emptyPicks())}
        onPrint={() => window.print()}
      />

      <GroupStageSection picks={picks} setGroupPlace={setGroupPlace} />

      <ThirdPlaceSlotSection picks={picks} setThirdSlot={setThirdSlot} />

      <KnockoutPicksSection picks={picks} setWinner={setWinner} />

      {/* Stacked rounds — shown only below `lg` on screen, hidden at print. */}
      <div className="space-y-10 lg:hidden print:!hidden">
        <RoundSection title="Round of 32" matches={roundOf32} picks={picks} />
        <RoundSection title="Round of 16" matches={roundOf16} picks={picks} />
        <RoundSection title="Quarterfinals" matches={quarterFinals} picks={picks} />
        <RoundSection title="Semifinals" matches={semiFinals} picks={picks} />
        <RoundSection title="Third-place playoff" matches={[thirdPlaceMatch]} picks={picks} />
        <RoundSection title="Final" matches={[finalMatch]} picks={picks} />
      </div>

      {/* Horizontal funnel bracket — desktop screens (lg+) AND print at any
          size. Print rules in css/tailwind.css scale it to one landscape
          page. Breakout (`lg:w-screen` + negative margin) lets the full
          1360px grid fit on wide displays without horizontal scroll. */}
      <div
        data-bracket-horizontal
        className="hidden lg:[margin-left:calc(50%-50vw)] lg:block lg:w-screen print:[margin-left:0] print:!block print:[width:100%]"
      >
        <HorizontalBracket picks={picks} />
      </div>

      <ChampionBanner finalWinner={finalWinner} />

      <FooterNote />
    </div>
  )
}

/* ---------- bracket header (name + print + reset) -------------------- */

function BracketHeader({
  bracketName,
  setBracketName,
  finalWinner,
  onReset,
  onPrint,
}: {
  bracketName: string
  setBracketName: (v: string) => void
  finalWinner: TeamId | ''
  onReset: () => void
  onPrint: () => void
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex-1">
        <label
          htmlFor="bracket-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 print:hidden"
        >
          Bracket name
        </label>
        <input
          id="bracket-name"
          type="text"
          value={bracketName}
          onChange={(e) => setBracketName(e.target.value)}
          placeholder="e.g. Samir's Picks"
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full max-w-sm rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 print:border-0 print:bg-transparent print:p-0 print:text-base print:font-semibold"
          aria-describedby="bracket-name-hint"
        />
        <p
          id="bracket-name-hint"
          className="no-print mt-1 text-xs text-gray-500 dark:text-gray-400"
        >
          Shown in the print header for the office pool.
        </p>
      </div>
      <div className="no-print flex items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className="focus-visible:ring-primary-500 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onPrint}
          className="bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500 rounded-md px-3 py-1.5 text-sm font-medium text-white focus:outline-none focus-visible:ring-2"
        >
          Print my bracket
        </button>
      </div>
      {finalWinner && (
        <div className="no-print hidden text-right sm:block">
          <div className="text-xs tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Your champion
          </div>
          <div className="text-primary-600 dark:text-primary-400 text-2xl font-bold">
            {teamLabel(finalWinner)}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- group stage ----------------------------------------------- */

function GroupStageSection({
  picks,
  setGroupPlace,
}: {
  picks: Picks
  setGroupPlace: (
    place: 'groupFirst' | 'groupSecond' | 'groupThird',
    groupId: string,
    teamId: TeamId | ''
  ) => void
}) {
  return (
    <section aria-labelledby="group-stage-heading" className="no-print">
      <h2
        id="group-stage-heading"
        className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
      >
        Group stage
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Pick each group's top two finishers (advance automatically) and a third-place team
        (candidate for the wildcard slots).
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => {
          const first = picks.groupFirst[g.id]
          const second = picks.groupSecond[g.id]
          const third = picks.groupThird[g.id]

          const opts = (exclude: (TeamId | '')[]) => g.teams.filter((id) => !exclude.includes(id))

          return (
            <div
              key={g.id}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Group {g.id}
              </h3>
              <ul className="mt-2 mb-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {g.teams.map((tid) => (
                  <li key={tid}>{teamLabel(tid)}</li>
                ))}
              </ul>
              <div className="space-y-2">
                <PickRow
                  id={`group-${g.id}-first`}
                  label="1st place"
                  value={first}
                  options={opts([second, third]).map((t) => ({ value: t, label: teamLabel(t) }))}
                  onChange={(v) => setGroupPlace('groupFirst', g.id, v)}
                />
                <PickRow
                  id={`group-${g.id}-second`}
                  label="2nd place"
                  value={second}
                  options={opts([first, third]).map((t) => ({ value: t, label: teamLabel(t) }))}
                  onChange={(v) => setGroupPlace('groupSecond', g.id, v)}
                />
                <PickRow
                  id={`group-${g.id}-third`}
                  label="3rd place"
                  value={third}
                  options={opts([first, second]).map((t) => ({ value: t, label: teamLabel(t) }))}
                  onChange={(v) => setGroupPlace('groupThird', g.id, v)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- one pick row that toggles between <select> (screen) and
              static value (print) so the printed sheet is clean.    --- */

function PickRow({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  placeholder = '— pick —',
}: {
  id: string
  label: string
  value: TeamId | ''
  options: { value: TeamId; label: string }[]
  onChange: (v: TeamId | '') => void
  disabled?: boolean
  placeholder?: string
}) {
  const selectedLabel = options.find((o) => o.value === value)?.label || teamLabel(value)
  return (
    <div>
      <label htmlFor={id} className="block text-xs text-gray-500 dark:text-gray-400">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as TeamId | '')}
        disabled={disabled}
        className={`${selectClass} disabled:opacity-60 print:hidden`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div aria-hidden="true" className="hidden text-sm font-medium text-gray-900 print:block">
        {selectedLabel || '—'}
      </div>
    </div>
  )
}

/* ---------- third-place wildcard allocation -------------------------- */

function ThirdPlaceSlotSection({
  picks,
  setThirdSlot,
}: {
  picks: Picks
  setThirdSlot: (label: string, teamId: TeamId | '') => void
}) {
  return (
    <section aria-labelledby="third-place-heading" className="no-print">
      <h2
        id="third-place-heading"
        className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
      >
        Best third-place wildcards
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Eight third-place teams advance. Assign which group's third-place pick fills each
        Round-of-32 wildcard slot.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {thirdSlots.map((s) => {
          // Teams already assigned to a different slot are hidden here, so no
          // team can occupy two wildcard slots simultaneously.
          const takenElsewhere = new Set(
            thirdSlots
              .filter((other) => other.label !== s.label)
              .map((other) => picks.thirdSlot[other.label])
              .filter(Boolean) as TeamId[]
          )
          const options = s.eligibleGroups
            .map((g) => ({ group: g, team: picks.groupThird[g] }))
            .filter((o): o is { group: string; team: TeamId } => Boolean(o.team))
            .filter((o) => !takenElsewhere.has(o.team))
            .map((o) => ({ value: o.team, label: `${teamLabel(o.team)} (Group ${o.group})` }))

          return (
            <div
              key={s.label}
              className="rounded-md border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <PickRow
                id={`third-${s.label}`}
                label={`Slot ${s.label}`}
                value={picks.thirdSlot[s.label] || ''}
                options={options}
                onChange={(v) => setThirdSlot(s.label, v)}
              />
              {options.length === 0 && (
                <p className="no-print mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Pick third-place teams in Groups {s.eligibleGroups.join(', ')} first.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ---------- knockout picks (one place that owns all winner selects) -- */

function KnockoutPicksSection({
  picks,
  setWinner,
}: {
  picks: Picks
  setWinner: (matchId: string, teamId: TeamId | '') => void
}) {
  const groupsByRound: { title: string; matches: Matchup[]; cols: string }[] = [
    {
      title: 'Round of 32',
      matches: roundOf32,
      cols: 'sm:grid-cols-2 lg:grid-cols-4',
    },
    {
      title: 'Round of 16',
      matches: roundOf16,
      cols: 'sm:grid-cols-2 lg:grid-cols-4',
    },
    { title: 'Quarterfinals', matches: quarterFinals, cols: 'sm:grid-cols-2 lg:grid-cols-4' },
    { title: 'Semifinals', matches: semiFinals, cols: 'sm:grid-cols-2' },
    { title: 'Third-place playoff', matches: [thirdPlaceMatch], cols: '' },
    { title: 'Final', matches: [finalMatch], cols: '' },
  ]

  return (
    <section aria-labelledby="knockout-picks-heading" className="no-print">
      <h2
        id="knockout-picks-heading"
        className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
      >
        Knockout picks
      </h2>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Pick the winner of each knockout match. Each row unlocks once the upstream picks decide its
        two teams. The bracket diagram below updates live.
      </p>
      <div className="mt-4 space-y-6">
        {groupsByRound.map((round) => (
          <div key={round.title}>
            <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              {round.title}
            </h3>
            <div className={`mt-2 grid grid-cols-1 gap-2 ${round.cols}`}>
              {round.matches.map((m) => (
                <KnockoutPickRow key={m.id} match={m} picks={picks} setWinner={setWinner} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function KnockoutPickRow({
  match,
  picks,
  setWinner,
}: {
  match: Matchup
  picks: Picks
  setWinner: (matchId: string, teamId: TeamId | '') => void
}) {
  const top = resolveSide(match.top, picks)
  const bottom = resolveSide(match.bottom, picks)
  const ready = Boolean(top && bottom)
  const odds = ready ? matchupOdds(top, bottom) : null
  const winner = picks.winner[match.id] || ''
  const options: { value: TeamId; label: string }[] = []
  if (top)
    options.push({ value: top, label: `${teamLabel(top)}${odds ? ` (${odds.topPct}%)` : ''}` })
  if (bottom)
    options.push({
      value: bottom,
      label: `${teamLabel(bottom)}${odds ? ` (${odds.bottomPct}%)` : ''}`,
    })
  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
      <PickRow
        id={`winner-${match.id}`}
        label={match.id}
        value={winner}
        options={options}
        disabled={!ready}
        placeholder={ready ? '— pick winner —' : '— waiting for upstream picks —'}
        onChange={(v) => setWinner(match.id, v)}
      />
    </div>
  )
}

/* ---------- knockout round + matchup row (display only) -------------- */

function RoundSection({
  title,
  matches,
  picks,
}: {
  title: string
  matches: Matchup[]
  picks: Picks
}) {
  return (
    <section aria-labelledby={`round-${title}`}>
      <h2
        id={`round-${title}`}
        className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100"
      >
        {title}
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {matches.map((m) => (
          <MatchupRow key={m.id} match={m} picks={picks} />
        ))}
      </div>
    </section>
  )
}

/* Display-only matchup row (stacked bracket view). All winner-picking moved
   to `<KnockoutPicksSection>` above the bracket — Issue B2. */
function MatchupRow({ match, picks }: { match: Matchup; picks: Picks }) {
  const top = resolveSide(match.top, picks)
  const bottom = resolveSide(match.bottom, picks)
  const ready = Boolean(top && bottom)
  const odds = ready ? matchupOdds(top, bottom) : null
  const winner = picks.winner[match.id] || ''

  const labelTop = top
    ? `${teamLabel(top)}${odds ? ` (${odds.topPct}%)` : ''}`
    : slotPlaceholder(match.top)
  const labelBottom = bottom
    ? `${teamLabel(bottom)}${odds ? ` (${odds.bottomPct}%)` : ''}`
    : slotPlaceholder(match.bottom)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="text-xs text-gray-500 dark:text-gray-400">{match.id}</div>
      <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
        <span
          className={winner === top ? 'text-primary-600 dark:text-primary-400 font-semibold' : ''}
        >
          {labelTop}
        </span>
        <span className="mx-2 text-gray-400">v</span>
        <span
          className={
            winner === bottom ? 'text-primary-600 dark:text-primary-400 font-semibold' : ''
          }
        >
          {labelBottom}
        </span>
      </div>
      {winner ? (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Winner:{' '}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {teamLabel(winner)}
          </span>
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">No pick yet</div>
      )}
    </div>
  )
}

/* ---------- champion celebration banner ------------------------------ */

function ChampionBanner({ finalWinner }: { finalWinner: TeamId | '' }) {
  if (!finalWinner) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950 no-print flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-8 text-center"
    >
      <TrophySvg />
      <div className="text-primary-700 dark:text-primary-300 text-sm tracking-wide uppercase">
        Your World Cup 2026 champion
      </div>
      <div className="text-primary-700 dark:text-primary-300 text-3xl font-extrabold">
        {teamLabel(finalWinner)}
      </div>
    </div>
  )
}

function TrophySvg() {
  return (
    <svg
      aria-hidden="true"
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 8h32v10c0 8.84-7.16 16-16 16s-16-7.16-16-16V8z"
        fill="#FFC940"
        stroke="#A66A00"
        strokeWidth="2"
      />
      <path
        d="M16 12H8a4 4 0 004 8h4M48 12h8a4 4 0 01-4 8h-4"
        stroke="#A66A00"
        strokeWidth="2"
        fill="none"
      />
      <path d="M26 34h12v8H26z" fill="#FFC940" stroke="#A66A00" strokeWidth="2" />
      <path d="M20 50h24v6H20z" fill="#A66A00" />
      <path d="M22 42h20l-2 8H24l-2-8z" fill="#FFC940" stroke="#A66A00" strokeWidth="2" />
    </svg>
  )
}

/* ---------- horizontal bracket (desktop, lg+) ------------------------ */

function HorizontalBracket({ picks }: { picks: Picks }) {
  const leftGroups = groups.slice(0, 6) // A–F
  const rightGroups = groups.slice(6, 12) // G–L

  return (
    <div className="overflow-x-auto">
      <div className="mx-auto grid w-[1360px] min-w-[1360px] [grid-template-columns:7rem_repeat(4,7rem)_10rem_repeat(4,7rem)_7rem] [grid-template-rows:720px] gap-2">
        {/* Left edge — Groups A–F */}
        <GroupLabelColumn groupList={leftGroups} />

        {/* Knockout columns funneling rightward.
            R32 only emits forward; R16/QF receive AND emit; SF only receives
            (SF→Final connector is custom in CenterColumn). */}
        <PairColumn
          matches={roundOf32.slice(0, 8)}
          pairsOf={2}
          side="left"
          picks={picks}
          hasOutgoing
        />
        <PairColumn
          matches={roundOf16.slice(0, 4)}
          pairsOf={2}
          side="left"
          picks={picks}
          hasIncoming
          hasOutgoing
        />
        <PairColumn
          matches={quarterFinals.slice(0, 2)}
          pairsOf={2}
          side="left"
          picks={picks}
          hasIncoming
          hasOutgoing
        />
        <PairColumn
          matches={[semiFinals[0]]}
          pairsOf={1}
          side="left"
          picks={picks}
          hasIncoming
          hasOutgoing
        />

        {/* Center — Final + Trophy + Third-place */}
        <CenterColumn picks={picks} />

        {/* Mirror right side, funneling leftward */}
        <PairColumn
          matches={[semiFinals[1]]}
          pairsOf={1}
          side="right"
          picks={picks}
          hasIncoming
          hasOutgoing
        />
        <PairColumn
          matches={quarterFinals.slice(2, 4)}
          pairsOf={2}
          side="right"
          picks={picks}
          hasIncoming
          hasOutgoing
        />
        <PairColumn
          matches={roundOf16.slice(4, 8)}
          pairsOf={2}
          side="right"
          picks={picks}
          hasIncoming
          hasOutgoing
        />
        <PairColumn
          matches={roundOf32.slice(8, 16)}
          pairsOf={2}
          side="right"
          picks={picks}
          hasOutgoing
        />

        {/* Right edge — Groups G–L */}
        <GroupLabelColumn groupList={rightGroups} />
      </div>
    </div>
  )
}

function GroupLabelColumn({ groupList }: { groupList: Group[] }) {
  return (
    <div className="flex h-full flex-col justify-around">
      {groupList.map((g) => (
        <div
          key={g.id}
          className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
        >
          <div className="text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            Group {g.id}
          </div>
          <ul className="mt-0.5 space-y-0.5 text-[11px] text-gray-800 dark:text-gray-200">
            {g.teams.map((tid) => (
              <li key={tid} className="truncate">
                {teamShort(tid)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

function PairColumn({
  matches,
  pairsOf,
  side,
  picks,
  hasIncoming = false,
  hasOutgoing = false,
}: {
  matches: Matchup[]
  pairsOf: number
  side: 'left' | 'right'
  picks: Picks
  hasIncoming?: boolean
  hasOutgoing?: boolean
}) {
  const pairs: Matchup[][] = []
  for (let i = 0; i < matches.length; i += pairsOf) {
    pairs.push(matches.slice(i, i + pairsOf))
  }
  // Each pair fills an equal share of the column (`flex-1`). Inside, two
  // cells with `justify-around` land at 25% / 75% of the pair height. That
  // makes pair midpoints land exactly at 50% of each pair slot — which is
  // where the next round's cell sits in its own pair slot. So cells in
  // adjacent rounds line up cleanly without any pixel math.
  return (
    <div className="flex h-full flex-col">
      {pairs.map((pair, i) => {
        const pairClass =
          hasOutgoing && pair.length > 1
            ? side === 'left'
              ? 'bracket-pair-left'
              : 'bracket-pair-right'
            : ''
        return (
          <div key={i} className={`flex flex-1 flex-col justify-around ${pairClass}`}>
            {pair.map((m) => (
              <MatchCellH
                key={m.id}
                match={m}
                picks={picks}
                side={side}
                hasIncoming={hasIncoming}
                hasOutgoing={hasOutgoing}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

/* Display-only horizontal cell. Picks are made in `<KnockoutPicksSection>`
   above the bracket — Issue B2.
   `side="center"` is for the Final cell, which receives from both SFs and
   therefore gets incoming stubs on both edges. */
function MatchCellH({
  match,
  picks,
  side,
  hasIncoming = false,
  hasOutgoing = false,
}: {
  match: Matchup
  picks: Picks
  side: 'left' | 'right' | 'center'
  hasIncoming?: boolean
  hasOutgoing?: boolean
}) {
  const top = resolveSide(match.top, picks)
  const bottom = resolveSide(match.bottom, picks)
  const ready = Boolean(top && bottom)
  const odds = ready ? matchupOdds(top as TeamId, bottom as TeamId) : null
  const winner = picks.winner[match.id] || ''
  const inClass = hasIncoming
    ? side === 'center'
      ? 'bracket-cell-in-left bracket-cell-in-right'
      : side === 'left'
        ? 'bracket-cell-in-left'
        : 'bracket-cell-in-right'
    : ''
  const outClass = hasOutgoing
    ? side === 'left'
      ? 'bracket-cell-out-left'
      : side === 'right'
        ? 'bracket-cell-out-right'
        : ''
    : ''

  const renderRow = (id: TeamId | '', fallback: string, pct?: number) => {
    const picked = id !== '' && winner === id
    const isResolved = Boolean(id)
    return (
      <div
        className={`flex items-center justify-between gap-1 text-[11px] leading-tight ${
          picked
            ? 'text-primary-600 dark:text-primary-400 font-semibold'
            : isResolved
              ? 'text-gray-800 dark:text-gray-200'
              : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <span className="truncate">{isResolved ? teamShort(id) : fallback}</span>
        {pct !== undefined && (
          <span className="text-[10px] text-gray-500 tabular-nums dark:text-gray-400">{pct}%</span>
        )}
      </div>
    )
  }

  return (
    <div
      data-side={side}
      data-match-id={match.id}
      className={`rounded-md border border-gray-200 bg-white px-1.5 py-1 dark:border-gray-700 dark:bg-gray-900 ${inClass} ${outClass}`}
    >
      <div className="text-[9px] tracking-wide text-gray-400 uppercase">{match.id}</div>
      {renderRow(top, slotShortLabel(match.top), odds?.topPct)}
      {renderRow(bottom, slotShortLabel(match.bottom), odds?.bottomPct)}
    </div>
  )
}

function CenterColumn({ picks }: { picks: Picks }) {
  const champion = picks.winner['FINAL']
  const thirdWinner = picks.winner['THIRD']
  return (
    // Final box sits at exact vertical center of the column so its incoming
    // stubs (`bracket-cell-in-left bracket-cell-in-right`) land at the same
    // y as the SF cells (which are also at 50% of their columns). Trophy +
    // "World Champions" label fill the top half; Bronze label + Third-place
    // box fill the bottom half.
    <div className="flex h-full flex-col items-stretch">
      <div className="flex flex-1 flex-col items-center justify-end gap-2 pb-3">
        <TrophySvg />
        <div className="text-center text-[10px] font-bold tracking-wider text-gray-700 uppercase dark:text-gray-300">
          World Champions
        </div>
      </div>
      <div>
        <MatchCellH match={finalMatch} picks={picks} side="center" hasIncoming />
        {champion && (
          <div className="text-primary-600 dark:text-primary-400 mt-1 text-center text-xs font-bold">
            {teamLabel(champion)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-start gap-2 pt-3">
        <div className="text-center text-[10px] font-bold tracking-wider text-gray-700 uppercase dark:text-gray-300">
          Bronze Winner
        </div>
        <div className="w-full">
          <MatchCellH match={thirdPlaceMatch} picks={picks} side="left" />
        </div>
        {thirdWinner && (
          <div className="text-center text-xs font-semibold text-amber-700 dark:text-amber-400">
            {teamLabel(thirdWinner)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- footer note ---------------------------------------------- */

function FooterNote() {
  return (
    <footer className="no-print border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
      <p>
        Win probabilities use Elo win expectancy:{' '}
        <code className="font-mono text-[0.7rem]">1 / (1 + 10^((Rb − Ra) / 400))</code>.
      </p>
      <p className="mt-1">Source: {probabilitySource}</p>
    </footer>
  )
}

/* ---------- confetti ------------------------------------------------- */

async function fireConfetti() {
  if (typeof window === 'undefined') return
  const mod = await import('canvas-confetti')
  const confetti = mod.default
  const end = Date.now() + 1200
  const colors = ['#FFC940', '#A66A00', '#0ea5e9', '#ef4444']
  ;(function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
    })
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
    })
    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  })()
}
