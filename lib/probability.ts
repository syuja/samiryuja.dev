import probabilities from '@/data/probabilities.json'
import type { TeamId } from '@/data/tournament-data'

const ratings = probabilities.ratings as Record<string, number>

export const probabilitySource = probabilities._source
export const probabilityMethod = probabilities._method

export function ratingFor(id: TeamId): number {
  return ratings[id] ?? 1500
}

export function winExpectancy(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export interface MatchupOdds {
  topPct: number
  bottomPct: number
}

/** Whole-number percentages that always sum to 100. */
export function matchupOdds(topId: TeamId, bottomId: TeamId): MatchupOdds {
  const pTop = winExpectancy(ratingFor(topId), ratingFor(bottomId))
  const topPct = Math.round(pTop * 100)
  return { topPct, bottomPct: 100 - topPct }
}
