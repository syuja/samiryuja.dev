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
  const next: Picks = { ...picks, winner: { ...picks.winner } }
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

      <RoundSection title="Round of 32" matches={roundOf32} picks={picks} setWinner={setWinner} />
      <RoundSection title="Round of 16" matches={roundOf16} picks={picks} setWinner={setWinner} />
      <RoundSection
        title="Quarterfinals"
        matches={quarterFinals}
        picks={picks}
        setWinner={setWinner}
      />
      <RoundSection title="Semifinals" matches={semiFinals} picks={picks} setWinner={setWinner} />
      <RoundSection
        title="Third-place playoff"
        matches={[thirdPlaceMatch]}
        picks={picks}
        setWinner={setWinner}
      />
      <RoundSection title="Final" matches={[finalMatch]} picks={picks} setWinner={setWinner} />

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
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
    <section aria-labelledby="group-stage-heading">
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
    <section aria-labelledby="third-place-heading">
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
          const options = s.eligibleGroups
            .map((g) => ({ group: g, team: picks.groupThird[g] }))
            .filter((o): o is { group: string; team: TeamId } => Boolean(o.team))
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

/* ---------- knockout round + matchup row ----------------------------- */

function RoundSection({
  title,
  matches,
  picks,
  setWinner,
}: {
  title: string
  matches: Matchup[]
  picks: Picks
  setWinner: (matchId: string, teamId: TeamId | '') => void
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
          <MatchupRow key={m.id} match={m} picks={picks} setWinner={setWinner} />
        ))}
      </div>
    </section>
  )
}

function MatchupRow({
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

  const labelTop = top
    ? `${teamLabel(top)}${odds ? ` (${odds.topPct}%)` : ''}`
    : slotPlaceholder(match.top)
  const labelBottom = bottom
    ? `${teamLabel(bottom)}${odds ? ` (${odds.bottomPct}%)` : ''}`
    : slotPlaceholder(match.bottom)

  const options: { value: TeamId; label: string }[] = []
  if (top)
    options.push({ value: top, label: `${teamLabel(top)}${odds ? ` (${odds.topPct}%)` : ''}` })
  if (bottom)
    options.push({
      value: bottom,
      label: `${teamLabel(bottom)}${odds ? ` (${odds.bottomPct}%)` : ''}`,
    })

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
      <div className="mt-2">
        <PickRow
          id={`winner-${match.id}`}
          label="Winner"
          value={winner}
          options={options}
          disabled={!ready}
          placeholder={ready ? '— pick winner —' : '— waiting for upstream picks —'}
          onChange={(v) => setWinner(match.id, v)}
        />
      </div>
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
      className="border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950 flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-8 text-center"
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

/* ---------- footer note ---------------------------------------------- */

function FooterNote() {
  return (
    <footer className="border-t border-gray-200 pt-6 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
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
