// Sanity-check the Elo win-expectancy helper against a few sample matchups.
// Runs as a plain ESM script so it doesn't need a TS toolchain.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const probs = JSON.parse(readFileSync(resolve(here, '../data/probabilities.json'), 'utf8'))
const ratings = probs.ratings

const winExpectancy = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400))
const pct = (a, b) => {
  const top = Math.round(winExpectancy(ratings[a], ratings[b]) * 100)
  return { a, b, top, bottom: 100 - top }
}

// 1) Equal ratings → 50/50 (sanity check on the formula itself).
const equal = winExpectancy(1800, 1800)
if (Math.abs(equal - 0.5) > 1e-9) {
  console.error(`FAIL: equal ratings should yield 0.5, got ${equal}`)
  process.exit(1)
}
console.log('OK: equal ratings → 50.0%')

// 2) Sample matchups across the strength spectrum.
const samples = [
  ['ARG', 'NED'],
  ['FRA', 'ENG'],
  ['BRA', 'KOR'],
  ['ESP', 'POR'],
  ['MAR', 'USA'],
  ['ARG', 'QAT'],
  ['CAN', 'MEX'],
]

console.log('\nSample matchups (top% / bottom%):')
for (const [a, b] of samples) {
  const r = pct(a, b)
  console.log(`  ${a} (${ratings[a]}) vs ${b} (${ratings[b]}) → ${r.top}% / ${r.bottom}%`)
}

// 3) Round-trip invariant: percentages always sum to 100.
for (const [a, b] of samples) {
  const r = pct(a, b)
  if (r.top + r.bottom !== 100) {
    console.error(`FAIL: ${a} vs ${b} sums to ${r.top + r.bottom}, not 100`)
    process.exit(1)
  }
}
console.log('\nOK: all sample matchups sum to 100.')
