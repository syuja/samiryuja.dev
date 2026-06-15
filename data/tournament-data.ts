/**
 * FIFA World Cup 2026 — single source of truth.
 *
 * 48 teams across 12 groups (A–L). Knockout phase begins with a Round of 32:
 * the top two teams from each group advance automatically (24 teams), plus
 * the eight best third-place finishers, for 32 teams total.
 *
 * Group rosters reflect the official draw. R32 follows FIFA's 8/4/4 shape:
 *   - 8 Winner-vs-Third matches
 *   - 4 Winner-vs-Runner-up matches
 *   - 4 Runner-up-vs-Runner-up matches
 * No two group winners face each other in R32.
 *
 * Each wildcard "THIRD" slot lists the five groups whose third-place team
 * could land there. The UI enforces global uniqueness across slots so the
 * same team cannot occupy two slots simultaneously.
 */

export type TeamId = string

export interface Team {
  id: TeamId
  name: string
  /** ISO-style two-letter abbreviation for compact display. */
  short: string
  /** Emoji flag (optional — purely decorative). */
  flag?: string
}

export interface Group {
  id: string
  teams: TeamId[]
}

/** A bracket "slot" reference resolves to a Team once upstream picks are made. */
export type SlotRef =
  | { kind: 'GROUP'; group: string; place: 1 | 2 }
  | { kind: 'THIRD'; label: string; eligibleGroups: string[] }
  | { kind: 'WINNER'; from: string }
  | { kind: 'LOSER'; from: string }

export interface Matchup {
  id: string
  top: SlotRef
  bottom: SlotRef
}

/* ---------------------------------------------------------------------- */
/* Teams                                                                  */
/* ---------------------------------------------------------------------- */
export const teams: Team[] = [
  // Hosts (auto-qualified)
  { id: 'USA', name: 'United States', short: 'USA', flag: '🇺🇸' },
  { id: 'CAN', name: 'Canada', short: 'CAN', flag: '🇨🇦' },
  { id: 'MEX', name: 'Mexico', short: 'MEX', flag: '🇲🇽' },

  // UEFA
  { id: 'FRA', name: 'France', short: 'FRA', flag: '🇫🇷' },
  { id: 'ENG', name: 'England', short: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 'ESP', name: 'Spain', short: 'ESP', flag: '🇪🇸' },
  { id: 'POR', name: 'Portugal', short: 'POR', flag: '🇵🇹' },
  { id: 'GER', name: 'Germany', short: 'GER', flag: '🇩🇪' },
  { id: 'NED', name: 'Netherlands', short: 'NED', flag: '🇳🇱' },
  { id: 'BEL', name: 'Belgium', short: 'BEL', flag: '🇧🇪' },
  { id: 'CRO', name: 'Croatia', short: 'CRO', flag: '🇭🇷' },
  { id: 'SUI', name: 'Switzerland', short: 'SUI', flag: '🇨🇭' },
  { id: 'AUT', name: 'Austria', short: 'AUT', flag: '🇦🇹' },
  { id: 'TUR', name: 'Türkiye', short: 'TUR', flag: '🇹🇷' },
  { id: 'NOR', name: 'Norway', short: 'NOR', flag: '🇳🇴' },
  { id: 'SCO', name: 'Scotland', short: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { id: 'SWE', name: 'Sweden', short: 'SWE', flag: '🇸🇪' },
  { id: 'CZE', name: 'Czechia', short: 'CZE', flag: '🇨🇿' },
  { id: 'BIH', name: 'Bosnia & Herzegovina', short: 'BIH', flag: '🇧🇦' },

  // CONMEBOL
  { id: 'ARG', name: 'Argentina', short: 'ARG', flag: '🇦🇷' },
  { id: 'BRA', name: 'Brazil', short: 'BRA', flag: '🇧🇷' },
  { id: 'URU', name: 'Uruguay', short: 'URU', flag: '🇺🇾' },
  { id: 'COL', name: 'Colombia', short: 'COL', flag: '🇨🇴' },
  { id: 'ECU', name: 'Ecuador', short: 'ECU', flag: '🇪🇨' },
  { id: 'PAR', name: 'Paraguay', short: 'PAR', flag: '🇵🇾' },

  // CAF
  { id: 'MAR', name: 'Morocco', short: 'MAR', flag: '🇲🇦' },
  { id: 'SEN', name: 'Senegal', short: 'SEN', flag: '🇸🇳' },
  { id: 'EGY', name: 'Egypt', short: 'EGY', flag: '🇪🇬' },
  { id: 'ALG', name: 'Algeria', short: 'ALG', flag: '🇩🇿' },
  { id: 'TUN', name: 'Tunisia', short: 'TUN', flag: '🇹🇳' },
  { id: 'CIV', name: "Côte d'Ivoire", short: 'CIV', flag: '🇨🇮' },
  { id: 'GHA', name: 'Ghana', short: 'GHA', flag: '🇬🇭' },
  { id: 'RSA', name: 'South Africa', short: 'RSA', flag: '🇿🇦' },
  { id: 'CPV', name: 'Cape Verde', short: 'CPV', flag: '🇨🇻' },
  { id: 'COD', name: 'DR Congo', short: 'COD', flag: '🇨🇩' },

  // AFC
  { id: 'JPN', name: 'Japan', short: 'JPN', flag: '🇯🇵' },
  { id: 'KOR', name: 'South Korea', short: 'KOR', flag: '🇰🇷' },
  { id: 'IRN', name: 'Iran', short: 'IRN', flag: '🇮🇷' },
  { id: 'AUS', name: 'Australia', short: 'AUS', flag: '🇦🇺' },
  { id: 'KSA', name: 'Saudi Arabia', short: 'KSA', flag: '🇸🇦' },
  { id: 'QAT', name: 'Qatar', short: 'QAT', flag: '🇶🇦' },
  { id: 'UZB', name: 'Uzbekistan', short: 'UZB', flag: '🇺🇿' },
  { id: 'JOR', name: 'Jordan', short: 'JOR', flag: '🇯🇴' },
  { id: 'IRQ', name: 'Iraq', short: 'IRQ', flag: '🇮🇶' },

  // CONCACAF (additional)
  { id: 'PAN', name: 'Panama', short: 'PAN', flag: '🇵🇦' },
  { id: 'HAI', name: 'Haiti', short: 'HAI', flag: '🇭🇹' },
  { id: 'CUW', name: 'Curaçao', short: 'CUW', flag: '🇨🇼' },

  // OFC
  { id: 'NZL', name: 'New Zealand', short: 'NZL', flag: '🇳🇿' },
]

/* ---------------------------------------------------------------------- */
/* Group stage — 12 groups of 4                                           */
/* ---------------------------------------------------------------------- */
/**
 * Group rosters per the official FIFA World Cup 2026 draw. Hosts are listed
 * first in their group (MEX=A1, CAN=B1, USA=D1) so they read as the seed-1
 * line in the group panel. Display order has no effect on cascade math —
 * 1st/2nd/3rd place are user picks.
 */
export const groups: Group[] = [
  { id: 'A', teams: ['MEX', 'RSA', 'KOR', 'CZE'] },
  { id: 'B', teams: ['CAN', 'BIH', 'QAT', 'SUI'] },
  { id: 'C', teams: ['BRA', 'MAR', 'HAI', 'SCO'] },
  { id: 'D', teams: ['USA', 'PAR', 'AUS', 'TUR'] },
  { id: 'E', teams: ['GER', 'CUW', 'CIV', 'ECU'] },
  { id: 'F', teams: ['NED', 'JPN', 'SWE', 'TUN'] },
  { id: 'G', teams: ['BEL', 'EGY', 'IRN', 'NZL'] },
  { id: 'H', teams: ['ESP', 'CPV', 'KSA', 'URU'] },
  { id: 'I', teams: ['FRA', 'SEN', 'IRQ', 'NOR'] },
  { id: 'J', teams: ['ARG', 'ALG', 'AUT', 'JOR'] },
  { id: 'K', teams: ['POR', 'COD', 'UZB', 'COL'] },
  { id: 'L', teams: ['ENG', 'CRO', 'GHA', 'PAN'] },
]

/* ---------------------------------------------------------------------- */
/* Round of 32                                                            */
/* ---------------------------------------------------------------------- */
/**
 * 16 matches (FIFA matches 73–88), conforming to FIFA's 8/4/4 structure:
 *   - 8 Winner-vs-Third (R32-1, 2, 7, 8, 13, 14, 15, 16)
 *   - 4 Winner-vs-Runner-up (R32-3, 4, 9, 10)
 *   - 4 Runner-up-vs-Runner-up (R32-5, 6, 11, 12)
 * No two group winners face each other (no Winner-vs-Winner).
 *
 * Each THIRD-kind side lists the 5 eligible groups whose third-place team
 * could fill that wildcard slot. The slot's eligible groups always exclude
 * the group whose winner is in the same R32 match (a 3rd-place team cannot
 * face their own group's winner in R32).
 *
 * The specific group-letter assignments below are a defensible, structurally
 * valid template. If you want to mirror FIFA's published bracket more
 * precisely, edit the individual pairings — they're independent of each
 * other, so each line is a one-line swap.
 */
export const roundOf32: Matchup[] = [
  // FIFA M73 — Runner-up A vs Runner-up B
  {
    id: 'R32-1',
    top: { kind: 'GROUP', group: 'A', place: 2 },
    bottom: { kind: 'GROUP', group: 'B', place: 2 },
  },
  // FIFA M74 — Winner E vs 3rd(A/B/C/D/F)
  {
    id: 'R32-2',
    top: { kind: 'GROUP', group: 'E', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-A/B/C/D/F',
      eligibleGroups: ['A', 'B', 'C', 'D', 'F'],
    },
  },
  // FIFA M75 — Winner F vs Runner-up C
  {
    id: 'R32-3',
    top: { kind: 'GROUP', group: 'F', place: 1 },
    bottom: { kind: 'GROUP', group: 'C', place: 2 },
  },
  // FIFA M76 — Winner C vs Runner-up F
  {
    id: 'R32-4',
    top: { kind: 'GROUP', group: 'C', place: 1 },
    bottom: { kind: 'GROUP', group: 'F', place: 2 },
  },
  // FIFA M77 — Winner I vs 3rd(C/D/F/G/H)
  {
    id: 'R32-5',
    top: { kind: 'GROUP', group: 'I', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-C/D/F/G/H',
      eligibleGroups: ['C', 'D', 'F', 'G', 'H'],
    },
  },
  // FIFA M78 — Runner-up E vs Runner-up I
  {
    id: 'R32-6',
    top: { kind: 'GROUP', group: 'E', place: 2 },
    bottom: { kind: 'GROUP', group: 'I', place: 2 },
  },
  // FIFA M79 — Winner A vs 3rd(C/E/F/H/I)
  {
    id: 'R32-7',
    top: { kind: 'GROUP', group: 'A', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-C/E/F/H/I',
      eligibleGroups: ['C', 'E', 'F', 'H', 'I'],
    },
  },
  // FIFA M80 — Winner L vs 3rd(E/H/I/J/K)
  {
    id: 'R32-8',
    top: { kind: 'GROUP', group: 'L', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-E/H/I/J/K',
      eligibleGroups: ['E', 'H', 'I', 'J', 'K'],
    },
  },
  // FIFA M81 — Winner D vs 3rd(B/E/F/I/J)
  {
    id: 'R32-9',
    top: { kind: 'GROUP', group: 'D', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-B/E/F/I/J',
      eligibleGroups: ['B', 'E', 'F', 'I', 'J'],
    },
  },
  // FIFA M82 — Winner G vs 3rd(A/E/H/I/J)
  {
    id: 'R32-10',
    top: { kind: 'GROUP', group: 'G', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-A/E/H/I/J',
      eligibleGroups: ['A', 'E', 'H', 'I', 'J'],
    },
  },
  // FIFA M83 — Runner-up K vs Runner-up L
  {
    id: 'R32-11',
    top: { kind: 'GROUP', group: 'K', place: 2 },
    bottom: { kind: 'GROUP', group: 'L', place: 2 },
  },
  // FIFA M84 — Winner H vs Runner-up J
  {
    id: 'R32-12',
    top: { kind: 'GROUP', group: 'H', place: 1 },
    bottom: { kind: 'GROUP', group: 'J', place: 2 },
  },
  // FIFA M85 — Winner B vs 3rd(E/F/G/I/J)
  {
    id: 'R32-13',
    top: { kind: 'GROUP', group: 'B', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-E/F/G/I/J',
      eligibleGroups: ['E', 'F', 'G', 'I', 'J'],
    },
  },
  // FIFA M86 — Winner J vs Runner-up H
  {
    id: 'R32-14',
    top: { kind: 'GROUP', group: 'J', place: 1 },
    bottom: { kind: 'GROUP', group: 'H', place: 2 },
  },
  // FIFA M87 — Winner K vs 3rd(D/E/I/J/L)
  {
    id: 'R32-15',
    top: { kind: 'GROUP', group: 'K', place: 1 },
    bottom: {
      kind: 'THIRD',
      label: '3-D/E/I/J/L',
      eligibleGroups: ['D', 'E', 'I', 'J', 'L'],
    },
  },
  // FIFA M88 — Runner-up D vs Runner-up G
  {
    id: 'R32-16',
    top: { kind: 'GROUP', group: 'D', place: 2 },
    bottom: { kind: 'GROUP', group: 'G', place: 2 },
  },
]

/* ---------------------------------------------------------------------- */
/* Round of 16                                                            */
/* ---------------------------------------------------------------------- */
// FIFA cross-bracket links M89–M96. R32-N maps to FIFA M(72+N).
export const roundOf16: Matchup[] = [
  // M89 — W74 · W77
  {
    id: 'R16-1',
    top: { kind: 'WINNER', from: 'R32-2' },
    bottom: { kind: 'WINNER', from: 'R32-5' },
  },
  // M90 — W73 · W75
  {
    id: 'R16-2',
    top: { kind: 'WINNER', from: 'R32-1' },
    bottom: { kind: 'WINNER', from: 'R32-3' },
  },
  // M91 — W76 · W78
  {
    id: 'R16-3',
    top: { kind: 'WINNER', from: 'R32-4' },
    bottom: { kind: 'WINNER', from: 'R32-6' },
  },
  // M92 — W79 · W80
  {
    id: 'R16-4',
    top: { kind: 'WINNER', from: 'R32-7' },
    bottom: { kind: 'WINNER', from: 'R32-8' },
  },
  // M93 — W83 · W84
  {
    id: 'R16-5',
    top: { kind: 'WINNER', from: 'R32-11' },
    bottom: { kind: 'WINNER', from: 'R32-12' },
  },
  // M94 — W81 · W82
  {
    id: 'R16-6',
    top: { kind: 'WINNER', from: 'R32-9' },
    bottom: { kind: 'WINNER', from: 'R32-10' },
  },
  // M95 — W86 · W88
  {
    id: 'R16-7',
    top: { kind: 'WINNER', from: 'R32-14' },
    bottom: { kind: 'WINNER', from: 'R32-16' },
  },
  // M96 — W85 · W87
  {
    id: 'R16-8',
    top: { kind: 'WINNER', from: 'R32-13' },
    bottom: { kind: 'WINNER', from: 'R32-15' },
  },
]

/* ---------------------------------------------------------------------- */
/* Quarterfinals                                                          */
/* ---------------------------------------------------------------------- */
// FIFA quarterfinals M97–M100.
export const quarterFinals: Matchup[] = [
  // M97 — W89 · W90
  { id: 'QF-1', top: { kind: 'WINNER', from: 'R16-1' }, bottom: { kind: 'WINNER', from: 'R16-2' } },
  // M98 — W93 · W94
  { id: 'QF-2', top: { kind: 'WINNER', from: 'R16-5' }, bottom: { kind: 'WINNER', from: 'R16-6' } },
  // M99 — W91 · W92
  { id: 'QF-3', top: { kind: 'WINNER', from: 'R16-3' }, bottom: { kind: 'WINNER', from: 'R16-4' } },
  // M100 — W95 · W96
  { id: 'QF-4', top: { kind: 'WINNER', from: 'R16-7' }, bottom: { kind: 'WINNER', from: 'R16-8' } },
]

/* ---------------------------------------------------------------------- */
/* Semifinals                                                             */
/* ---------------------------------------------------------------------- */
export const semiFinals: Matchup[] = [
  { id: 'SF-1', top: { kind: 'WINNER', from: 'QF-1' }, bottom: { kind: 'WINNER', from: 'QF-2' } },
  { id: 'SF-2', top: { kind: 'WINNER', from: 'QF-3' }, bottom: { kind: 'WINNER', from: 'QF-4' } },
]

/* ---------------------------------------------------------------------- */
/* Third-place playoff + Final                                            */
/* ---------------------------------------------------------------------- */
export const thirdPlaceMatch: Matchup = {
  id: 'THIRD',
  top: { kind: 'LOSER', from: 'SF-1' },
  bottom: { kind: 'LOSER', from: 'SF-2' },
}

export const finalMatch: Matchup = {
  id: 'FINAL',
  top: { kind: 'WINNER', from: 'SF-1' },
  bottom: { kind: 'WINNER', from: 'SF-2' },
}

/** Flat list of every knockout matchup, in upstream-to-downstream order. */
export const allMatches: Matchup[] = [
  ...roundOf32,
  ...roundOf16,
  ...quarterFinals,
  ...semiFinals,
  thirdPlaceMatch,
  finalMatch,
]

/* ---------------------------------------------------------------------- */
/* Lookup helpers                                                         */
/* ---------------------------------------------------------------------- */
export const teamById: Record<TeamId, Team> = Object.fromEntries(
  teams.map((t) => [t.id, t])
) as Record<TeamId, Team>

export function groupById(id: string): Group | undefined {
  return groups.find((g) => g.id === id)
}

/** All third-place slot labels referenced anywhere in the bracket. */
export function allThirdSlotLabels(): { label: string; eligibleGroups: string[] }[] {
  const seen = new Map<string, string[]>()
  for (const m of roundOf32) {
    for (const side of [m.top, m.bottom]) {
      if (side.kind === 'THIRD' && !seen.has(side.label)) {
        seen.set(side.label, side.eligibleGroups)
      }
    }
  }
  return [...seen.entries()].map(([label, eligibleGroups]) => ({ label, eligibleGroups }))
}

/** Lookup a matchup by id across all rounds. */
const matchById: Record<string, Matchup> = Object.fromEntries(allMatches.map((m) => [m.id, m]))
export function getMatch(id: string): Matchup | undefined {
  return matchById[id]
}
