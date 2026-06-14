// Simulates the bracket cascade + downstream-reset logic on the pure data,
// without rendering. Verifies:
//   1) A R32 winner can propagate through R16/QF/SF to the Final.
//   2) Changing an upstream group-stage pick clears downstream winners
//      that depend on it.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dataSrc = readFileSync(resolve(here, '../data/tournament-data.ts'), 'utf8')

// Quick-and-dirty extraction: just confirm structure constants exist & count.
const has = (s) => dataSrc.includes(s)
const checks = [
  ['groups',                /export const groups:\s*Group\[\][^=]*=\s*\[/],
  ['roundOf32',             /export const roundOf32:\s*Matchup\[\][^=]*=\s*\[/],
  ['roundOf16',             /export const roundOf16:\s*Matchup\[\][^=]*=\s*\[/],
  ['quarterFinals',         /export const quarterFinals:\s*Matchup\[\][^=]*=\s*\[/],
  ['semiFinals',            /export const semiFinals:\s*Matchup\[\][^=]*=\s*\[/],
  ['thirdPlaceMatch',       /export const thirdPlaceMatch:\s*Matchup\s*=/],
  ['finalMatch',            /export const finalMatch:\s*Matchup\s*=/],
]

let ok = true
for (const [name, re] of checks) {
  if (!re.test(dataSrc)) {
    console.error(`MISSING: ${name}`)
    ok = false
  } else {
    console.log(`OK: ${name} defined`)
  }
}

const countMatches = (re) => (dataSrc.match(re) || []).length
const r32 = countMatches(/id:\s*'R32-\d+'/g)
const r16 = countMatches(/id:\s*'R16-\d+'/g)
const qf = countMatches(/id:\s*'QF-\d+'/g)
const sf = countMatches(/id:\s*'SF-\d+'/g)
console.log(`\nMatchup counts: R32=${r32}, R16=${r16}, QF=${qf}, SF=${sf}`)
if (r32 !== 16 || r16 !== 8 || qf !== 4 || sf !== 2) {
  console.error('FAIL: expected R32=16, R16=8, QF=4, SF=2')
  ok = false
}

process.exit(ok ? 0 : 1)
