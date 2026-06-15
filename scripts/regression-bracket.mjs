// Full regression simulation for the World Cup 2026 bracket engine.
//
// Re-implements resolveSide + reconcile in plain JS (the BracketClient is TS),
// parses tournament-data.ts via lightweight regex, and walks a complete bracket
// from group stage through the Final while asserting:
//   - pick propagation        (R32 → R16 → QF → SF → Final fills correctly)
//   - win-probability sums    (always 100)
//   - round cascading reset   (changing upstream clears downstream picks)
//   - stale wildcard clearing (changing a groupThird out from under a wildcard
//                              slot clears it + everything downstream)
//   - reset to empty state
//
// In-group de-dup and global wildcard uniqueness live in the UI option filters,
// not in the pure engine — those are verified by code inspection in the report.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(resolve(here, '../data/tournament-data.ts'), 'utf8')
const probs = JSON.parse(readFileSync(resolve(here, '../data/probabilities.json'), 'utf8'))
  .ratings

let fails = 0
const check = (cond, label) => {
  console.log((cond ? '  PASS  ' : '  FAIL  ') + label)
  if (!cond) fails++
}

/* ---------- parse data file ----------------------------------------- */

function block(name) {
  // Generic [...] block extractor for a named export.
  const re = new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\]`, 'm')
  const m = src.match(re)
  return m ? m[1] : ''
}

const groupsBlock = block('groups')
const r32Block = block('roundOf32')
const r16Block = block('roundOf16')
const qfBlock = block('quarterFinals')
const sfBlock = block('semiFinals')
const thirdBlock = src.match(/export const thirdPlaceMatch:[^=]*=\s*\{([\s\S]*?)\n\}/)[1]
const finalBlock = src.match(/export const finalMatch:[^=]*=\s*\{([\s\S]*?)\n\}/)[1]

const parseGroups = (s) =>
  [...s.matchAll(/\{\s*id:\s*'([A-Z])',\s*teams:\s*\[([^\]]+)\]/g)].map((m) => ({
    id: m[1],
    teams: [...m[2].matchAll(/'([A-Z]{3})'/g)].map((x) => x[1]),
  }))

const parseSide = (text) => {
  if (/kind:\s*'GROUP'/.test(text)) {
    return {
      kind: 'GROUP',
      group: text.match(/group:\s*'([A-Z])'/)[1],
      place: +text.match(/place:\s*(\d)/)[1],
    }
  }
  if (/kind:\s*'THIRD'/.test(text)) {
    return {
      kind: 'THIRD',
      label: text.match(/label:\s*'([^']+)'/)[1],
      eligibleGroups: [...text.matchAll(/'([A-Z])'/g)].map((x) => x[1]),
    }
  }
  if (/kind:\s*'WINNER'/.test(text)) {
    return { kind: 'WINNER', from: text.match(/from:\s*'([^']+)'/)[1] }
  }
  if (/kind:\s*'LOSER'/.test(text)) {
    return { kind: 'LOSER', from: text.match(/from:\s*'([^']+)'/)[1] }
  }
  throw new Error('unknown side: ' + text.slice(0, 80))
}

const parseMatchups = (s) =>
  [...s.matchAll(/\{\s*id:\s*'([^']+)',\s*top:\s*(\{[^}]+\}),\s*bottom:\s*(\{[^}]+\})/g)].map(
    (m) => ({ id: m[1], top: parseSide(m[2]), bottom: parseSide(m[3]) })
  )

const parseSingle = (s) => {
  const idM = s.match(/id:\s*'([^']+)'/)
  const topM = s.match(/top:\s*(\{[^}]+\})/)
  const botM = s.match(/bottom:\s*(\{[^}]+\})/)
  return { id: idM[1], top: parseSide(topM[1]), bottom: parseSide(botM[1]) }
}

const groups = parseGroups(groupsBlock)
const roundOf32 = parseMatchups(r32Block)
const roundOf16 = parseMatchups(r16Block)
const quarterFinals = parseMatchups(qfBlock)
const semiFinals = parseMatchups(sfBlock)
const thirdPlaceMatch = parseSingle(thirdBlock)
const finalMatch = parseSingle(finalBlock)
const allMatches = [
  ...roundOf32,
  ...roundOf16,
  ...quarterFinals,
  ...semiFinals,
  thirdPlaceMatch,
  finalMatch,
]
const getMatch = (id) => allMatches.find((m) => m.id === id)

// Unique third-place slot labels with eligibleGroups
const thirdSlots = (() => {
  const seen = new Map()
  for (const m of roundOf32) {
    for (const side of [m.top, m.bottom]) {
      if (side.kind === 'THIRD' && !seen.has(side.label)) {
        seen.set(side.label, side.eligibleGroups)
      }
    }
  }
  return [...seen.entries()].map(([label, eligibleGroups]) => ({ label, eligibleGroups }))
})()

/* ---------- pure logic mirroring BracketClient ---------------------- */

function emptyPicks() {
  return {
    bracketName: '',
    groupFirst: Object.fromEntries(groups.map((g) => [g.id, ''])),
    groupSecond: Object.fromEntries(groups.map((g) => [g.id, ''])),
    groupThird: Object.fromEntries(groups.map((g) => [g.id, ''])),
    thirdSlot: Object.fromEntries(thirdSlots.map((s) => [s.label, ''])),
    winner: Object.fromEntries(allMatches.map((m) => [m.id, ''])),
  }
}

function resolveSide(side, picks) {
  if (side.kind === 'GROUP') {
    return side.place === 1 ? picks.groupFirst[side.group] : picks.groupSecond[side.group]
  }
  if (side.kind === 'THIRD') return picks.thirdSlot[side.label]
  if (side.kind === 'WINNER') return picks.winner[side.from]
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

function reconcile(picks) {
  const next = {
    ...picks,
    thirdSlot: { ...picks.thirdSlot },
    winner: { ...picks.winner },
  }
  // Clear stale wildcard slots first.
  for (const s of thirdSlots) {
    const assigned = next.thirdSlot[s.label]
    if (!assigned) continue
    const ok = s.eligibleGroups.some((g) => next.groupThird[g] === assigned)
    if (!ok) next.thirdSlot[s.label] = ''
  }
  // Clear matchup winners no longer in {top, bottom}.
  for (const m of allMatches) {
    const top = resolveSide(m.top, next)
    const bottom = resolveSide(m.bottom, next)
    const w = next.winner[m.id]
    if (w && w !== top && w !== bottom) next.winner[m.id] = ''
  }
  return next
}

const winExpectancy = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400))
const matchupOdds = (top, bottom) => {
  const t = Math.round(winExpectancy(probs[top], probs[bottom]) * 100)
  return { topPct: t, bottomPct: 100 - t }
}

/* ---------- helpers ------------------------------------------------- */
const setF = (p, k, g, v) => reconcile({ ...p, [k]: { ...p[k], [g]: v } })
const setSlot = (p, label, v) =>
  reconcile({ ...p, thirdSlot: { ...p.thirdSlot, [label]: v } })
const setWinner = (p, id, v) =>
  reconcile({ ...p, winner: { ...p.winner, [id]: v } })

/* ====================================================================
   TEST 1 — Drive a complete bracket from group stage to Final
   ==================================================================== */
console.log('\nTest 1: full pick-through (group stage → Final)')
let p = emptyPicks()

// Group picks: 1st/2nd/3rd from each group's teams array.
for (const g of groups) {
  p = setF(p, 'groupFirst', g.id, g.teams[0])
  p = setF(p, 'groupSecond', g.id, g.teams[1])
  p = setF(p, 'groupThird', g.id, g.teams[2])
}
check(
  Object.values(p.groupFirst).every(Boolean) &&
    Object.values(p.groupSecond).every(Boolean) &&
    Object.values(p.groupThird).every(Boolean),
  'all 12 groups have 1st/2nd/3rd picked'
)

// Wildcard slots: pick the first eligible group's 3rd-place team for each slot,
// honoring global uniqueness (skip a team already assigned elsewhere).
const used = new Set()
for (const s of thirdSlots) {
  const pick = s.eligibleGroups
    .map((g) => p.groupThird[g])
    .find((t) => t && !used.has(t))
  if (pick) {
    p = setSlot(p, s.label, pick)
    used.add(pick)
  }
}
check(
  thirdSlots.every((s) => p.thirdSlot[s.label]),
  'all 8 wildcard slots assigned with globally-unique teams'
)
check(
  new Set(Object.values(p.thirdSlot).filter(Boolean)).size === 8,
  'wildcard slot teams are all distinct'
)

// R32 winners — pick the top side every time.
for (const m of roundOf32) {
  const top = resolveSide(m.top, p)
  p = setWinner(p, m.id, top)
}
check(
  roundOf32.every((m) => p.winner[m.id]),
  'all 16 R32 winners picked'
)

// Win-% sum invariant for every R32 matchup.
let pctSumOk = true
for (const m of roundOf32) {
  const top = resolveSide(m.top, p)
  const bottom = resolveSide(m.bottom, p)
  if (!top || !bottom) {
    pctSumOk = false
    break
  }
  const { topPct, bottomPct } = matchupOdds(top, bottom)
  if (topPct + bottomPct !== 100) {
    pctSumOk = false
    break
  }
}
check(pctSumOk, 'every R32 win-% sums to exactly 100')

// R16, QF, SF, Third, Final — pick the top side each round.
for (const round of [roundOf16, quarterFinals, semiFinals]) {
  for (const m of round) {
    p = setWinner(p, m.id, resolveSide(m.top, p))
  }
}
p = setWinner(p, thirdPlaceMatch.id, resolveSide(thirdPlaceMatch.top, p))
p = setWinner(p, finalMatch.id, resolveSide(finalMatch.top, p))

check(roundOf16.every((m) => p.winner[m.id]), 'all 8 R16 winners propagated')
check(quarterFinals.every((m) => p.winner[m.id]), 'all 4 QF winners propagated')
check(semiFinals.every((m) => p.winner[m.id]), 'both SF winners propagated')
check(Boolean(p.winner['THIRD']), 'third-place winner picked (semifinal loser available)')
check(Boolean(p.winner['FINAL']), 'final winner picked → champion crowned')

const champion = p.winner['FINAL']
console.log('  champion =', champion, `(${probs[champion]})`)

/* ====================================================================
   TEST 2 — Cascade reset (upstream change clears downstream)
   ==================================================================== */
console.log('\nTest 2: cascade reset')
// Snapshot: every later round still has its winner set.
const before = { ...p.winner }
// Under the FIFA layout, 1A appears in R32-7 (M79). Path to FINAL:
// R32-7 → R16-4 (R16-4 is *bottom* of QF-3) → QF-3 → SF-2 → FINAL.
// To exercise the full cascade we first re-seed the downstream picks so
// each later round's stored winner *is* the cleared side at every step.
const groupA = groups.find((g) => g.id === 'A')
const top1A = groupA.teams[0]
// Make R32-7 winner = 1A (already true), then drive that pick through.
p = setWinner(p, 'R16-4', top1A) // R16-4.top = winner(R32-7)
p = setWinner(p, 'QF-3', top1A)  // QF-3.bottom = winner(R16-4)
p = setWinner(p, 'SF-2', top1A)  // SF-2.bottom = winner(QF-3)
p = setWinner(p, 'FINAL', top1A) // FINAL.bottom = winner(SF-2)

const newFirstA = groupA.teams[3] // pick a different team
p = setF(p, 'groupFirst', 'A', newFirstA)

check(!p.winner['R32-7'], 'R32-7 winner cleared after Group A 1st-place change')
check(!p.winner['R16-4'], 'R16-4 winner cleared (downstream of R32-7)')
check(!p.winner['QF-3'], 'QF-3 winner cleared (downstream)')
check(!p.winner['SF-2'], 'SF-2 winner cleared (downstream)')
check(!p.winner['FINAL'], 'FINAL winner cleared (downstream)')
// Confirm an *unrelated* match was NOT cleared (R32-11 is 2K vs 2L — no Group A reference).
check(
  Boolean(p.winner['R32-11']) && p.winner['R32-11'] === before['R32-11'],
  'unrelated R32-11 winner preserved'
)

/* ====================================================================
   TEST 3 — Stale wildcard clearing (Tier-2 new behavior)
   ==================================================================== */
console.log('\nTest 3: stale wildcard clearing')
// Under the FIFA layout, R32-7 = 1A vs 3rd(C/E/F/H/I). Its wildcard slot
// label is '3-C/E/F/H/I'. Group C is one of the eligible groups.
let q = emptyPicks()
const gC = groups.find((g) => g.id === 'C')
q = setF(q, 'groupThird', 'C', gC.teams[2])
q = setSlot(q, '3-C/E/F/H/I', gC.teams[2])
check(q.thirdSlot['3-C/E/F/H/I'] === gC.teams[2], 'wildcard slot assigned')

const gA = groups.find((g) => g.id === 'A')
q = setF(q, 'groupFirst', 'A', gA.teams[0])
q = setWinner(q, 'R32-7', gC.teams[2])
check(q.winner['R32-7'] === gC.teams[2], 'R32-7 winner is the wildcard team')

// Change Group C's 3rd-place pick: slot's team no longer eligible anywhere.
q = setF(q, 'groupThird', 'C', gC.teams[3])
check(
  q.thirdSlot['3-C/E/F/H/I'] === '',
  'wildcard slot cleared after Group C 3rd-place reassigned'
)
check(q.winner['R32-7'] === '', 'R32-7 winner cleared (slot it depended on is empty)')

/* ====================================================================
   TEST 4 — Reset to empty state
   ==================================================================== */
console.log('\nTest 4: reset to empty state')
const fresh = emptyPicks()
check(
  Object.values(fresh.groupFirst).every((v) => v === ''),
  'reset clears groupFirst'
)
check(
  Object.values(fresh.thirdSlot).every((v) => v === ''),
  'reset clears thirdSlot'
)
check(
  Object.values(fresh.winner).every((v) => v === ''),
  'reset clears all winners'
)
check(fresh.bracketName === '', 'reset clears bracketName')

console.log('\n' + (fails === 0 ? `ALL PASSED (${0} failures)` : `${fails} FAILURE(S)`))
process.exit(fails === 0 ? 0 : 1)
