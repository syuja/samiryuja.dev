/**
 * FIFA World Cup 2026 — single source of truth.
 *
 * 48 teams across 12 groups (A–L). Knockout phase begins with a Round of 32:
 * the top two teams from each group advance automatically (24 teams), plus
 * the eight best third-place finishers, for 32 teams total.
 *
 * The bracket mapping below uses placeholder slot labels (e.g. "A1", "B2",
 * "3-A/B/E/F" for one of the eight third-place slots). Until the draw, the
 * group rosters and the exact Round-of-32 pairings are illustrative — edit
 * the `groups` and `roundOf32` arrays below to correct seedings or swap in
 * the official pairings once published.
 *
 * Field reference:
 *  - groups: each group's four-team roster, by `teamId`.
 *  - roundOf32: 16 pairings; each side is either a "GROUP" slot ("A1") or a
 *    "THIRD" slot (one of "3-A/B/E/F", etc.).
 *
 * The team list is the 48 confirmed/projected qualifiers as of the latest
 * FIFA-recognised qualifying round. Replace with the official draw output
 * when available — no component-level changes required.
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
  { id: 'ITA', name: 'Italy', short: 'ITA', flag: '🇮🇹' },
  { id: 'CRO', name: 'Croatia', short: 'CRO', flag: '🇭🇷' },
  { id: 'SUI', name: 'Switzerland', short: 'SUI', flag: '🇨🇭' },
  { id: 'DEN', name: 'Denmark', short: 'DEN', flag: '🇩🇰' },
  { id: 'AUT', name: 'Austria', short: 'AUT', flag: '🇦🇹' },
  { id: 'POL', name: 'Poland', short: 'POL', flag: '🇵🇱' },
  { id: 'SRB', name: 'Serbia', short: 'SRB', flag: '🇷🇸' },
  { id: 'TUR', name: 'Türkiye', short: 'TUR', flag: '🇹🇷' },
  { id: 'NOR', name: 'Norway', short: 'NOR', flag: '🇳🇴' },
  { id: 'SVN', name: 'Slovenia', short: 'SVN', flag: '🇸🇮' },

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
  { id: 'NGA', name: 'Nigeria', short: 'NGA', flag: '🇳🇬' },
  { id: 'GHA', name: 'Ghana', short: 'GHA', flag: '🇬🇭' },
  { id: 'CMR', name: 'Cameroon', short: 'CMR', flag: '🇨🇲' },

  // AFC
  { id: 'JPN', name: 'Japan', short: 'JPN', flag: '🇯🇵' },
  { id: 'KOR', name: 'South Korea', short: 'KOR', flag: '🇰🇷' },
  { id: 'IRN', name: 'Iran', short: 'IRN', flag: '🇮🇷' },
  { id: 'AUS', name: 'Australia', short: 'AUS', flag: '🇦🇺' },
  { id: 'KSA', name: 'Saudi Arabia', short: 'KSA', flag: '🇸🇦' },
  { id: 'QAT', name: 'Qatar', short: 'QAT', flag: '🇶🇦' },
  { id: 'UZB', name: 'Uzbekistan', short: 'UZB', flag: '🇺🇿' },
  { id: 'JOR', name: 'Jordan', short: 'JOR', flag: '🇯🇴' },

  // CONCACAF (additional)
  { id: 'CRC', name: 'Costa Rica', short: 'CRC', flag: '🇨🇷' },
  { id: 'PAN', name: 'Panama', short: 'PAN', flag: '🇵🇦' },

  // OFC
  { id: 'NZL', name: 'New Zealand', short: 'NZL', flag: '🇳🇿' },

  // Inter-confederation playoff winners (placeholders)
  { id: 'PO1', name: 'Playoff Winner 1', short: 'PO1', flag: '🏳️' },
  { id: 'PO2', name: 'Playoff Winner 2', short: 'PO2', flag: '🏳️' },
]

/* ---------------------------------------------------------------------- */
/* Group stage — 12 groups of 4                                           */
/* ---------------------------------------------------------------------- */
/**
 * Edit the rosters below freely. The bracket only depends on group IDs and
 * the per-group `teams` order (which is purely for display in the group
 * reference panel). Cascade math reads winners by user pick, not by order.
 */
export const groups: Group[] = [
  { id: 'A', teams: ['MEX', 'NOR', 'TUN', 'PO1'] },
  { id: 'B', teams: ['CAN', 'BEL', 'KOR', 'CRC'] },
  { id: 'C', teams: ['USA', 'NED', 'JPN', 'PAN'] },
  { id: 'D', teams: ['ARG', 'POL', 'AUS', 'PO2'] },
  { id: 'E', teams: ['BRA', 'GER', 'SVN', 'JOR'] },
  { id: 'F', teams: ['ESP', 'SUI', 'UZB', 'GHA'] },
  { id: 'G', teams: ['FRA', 'CRO', 'EGY', 'NZL'] },
  { id: 'H', teams: ['ENG', 'POR', 'IRN', 'CIV'] },
  { id: 'I', teams: ['ECU', 'SRB', 'NGA', 'QAT'] }, // edit as needed
  { id: 'J', teams: ['ITA', 'DEN', 'SEN', 'PAR'] }, // edit as needed
  { id: 'K', teams: ['COL', 'TUR', 'MAR', 'KSA'] },
  { id: 'L', teams: ['URU', 'AUT', 'ALG', 'CMR'] },
]

/* ---------------------------------------------------------------------- */
/* Round of 32                                                            */
/* ---------------------------------------------------------------------- */
/**
 * 16 matches. Sides marked GROUP resolve to the user's first/second-place
 * pick in that group. Sides marked THIRD resolve to the user's pick from
 * the eligible groups for that third-place slot.
 *
 * The eight third-place slots are: 3-A/B/E/F, 3-A/B/C/D, 3-C/D/E/F,
 * 3-A/B/C/F, 3-A/C/D/E, 3-B/D/F/G, 3-A/E/H/I, 3-C/H/J/L. The exact
 * pairings used here mirror the bracket pictured in the screenshot — edit
 * to swap in FIFA's official Round-of-32 layout once published.
 */
export const roundOf32: Matchup[] = [
  // Top half
  {
    id: 'R32-1',
    top: { kind: 'GROUP', group: 'A', place: 1 },
    bottom: { kind: 'THIRD', label: '3-C/E/F/H', eligibleGroups: ['C', 'E', 'F', 'H'] },
  },
  {
    id: 'R32-2',
    top: { kind: 'GROUP', group: 'C', place: 2 },
    bottom: { kind: 'GROUP', group: 'F', place: 2 },
  },
  {
    id: 'R32-3',
    top: { kind: 'GROUP', group: 'E', place: 1 },
    bottom: { kind: 'THIRD', label: '3-A/B/D/H', eligibleGroups: ['A', 'B', 'D', 'H'] },
  },
  {
    id: 'R32-4',
    top: { kind: 'GROUP', group: 'B', place: 1 },
    bottom: { kind: 'GROUP', group: 'H', place: 2 },
  },
  {
    id: 'R32-5',
    top: { kind: 'GROUP', group: 'G', place: 1 },
    bottom: { kind: 'THIRD', label: '3-A/E/J/L', eligibleGroups: ['A', 'E', 'J', 'L'] },
  },
  {
    id: 'R32-6',
    top: { kind: 'GROUP', group: 'I', place: 2 },
    bottom: { kind: 'GROUP', group: 'L', place: 2 },
  },
  {
    id: 'R32-7',
    top: { kind: 'GROUP', group: 'K', place: 1 },
    bottom: { kind: 'THIRD', label: '3-D/F/I/L', eligibleGroups: ['D', 'F', 'I', 'L'] },
  },
  {
    id: 'R32-8',
    top: { kind: 'GROUP', group: 'J', place: 1 },
    bottom: { kind: 'GROUP', group: 'L', place: 1 },
  },

  // Bottom half
  {
    id: 'R32-9',
    top: { kind: 'GROUP', group: 'F', place: 1 },
    bottom: { kind: 'THIRD', label: '3-B/C/G/K', eligibleGroups: ['B', 'C', 'G', 'K'] },
  },
  {
    id: 'R32-10',
    top: { kind: 'GROUP', group: 'D', place: 2 },
    bottom: { kind: 'GROUP', group: 'E', place: 2 },
  },
  {
    id: 'R32-11',
    top: { kind: 'GROUP', group: 'C', place: 1 },
    bottom: { kind: 'THIRD', label: '3-G/H/I/J', eligibleGroups: ['G', 'H', 'I', 'J'] },
  },
  {
    id: 'R32-12',
    top: { kind: 'GROUP', group: 'A', place: 2 },
    bottom: { kind: 'GROUP', group: 'K', place: 2 },
  },
  {
    id: 'R32-13',
    top: { kind: 'GROUP', group: 'H', place: 1 },
    bottom: { kind: 'THIRD', label: '3-B/F/I/K', eligibleGroups: ['B', 'F', 'I', 'K'] },
  },
  {
    id: 'R32-14',
    top: { kind: 'GROUP', group: 'G', place: 2 },
    bottom: { kind: 'GROUP', group: 'J', place: 2 },
  },
  {
    id: 'R32-15',
    top: { kind: 'GROUP', group: 'D', place: 1 },
    bottom: { kind: 'THIRD', label: '3-A/C/G/L', eligibleGroups: ['A', 'C', 'G', 'L'] },
  },
  {
    id: 'R32-16',
    top: { kind: 'GROUP', group: 'I', place: 1 },
    bottom: { kind: 'GROUP', group: 'B', place: 2 },
  },
]

/* ---------------------------------------------------------------------- */
/* Round of 16                                                            */
/* ---------------------------------------------------------------------- */
export const roundOf16: Matchup[] = [
  {
    id: 'R16-1',
    top: { kind: 'WINNER', from: 'R32-1' },
    bottom: { kind: 'WINNER', from: 'R32-2' },
  },
  {
    id: 'R16-2',
    top: { kind: 'WINNER', from: 'R32-3' },
    bottom: { kind: 'WINNER', from: 'R32-4' },
  },
  {
    id: 'R16-3',
    top: { kind: 'WINNER', from: 'R32-5' },
    bottom: { kind: 'WINNER', from: 'R32-6' },
  },
  {
    id: 'R16-4',
    top: { kind: 'WINNER', from: 'R32-7' },
    bottom: { kind: 'WINNER', from: 'R32-8' },
  },
  {
    id: 'R16-5',
    top: { kind: 'WINNER', from: 'R32-9' },
    bottom: { kind: 'WINNER', from: 'R32-10' },
  },
  {
    id: 'R16-6',
    top: { kind: 'WINNER', from: 'R32-11' },
    bottom: { kind: 'WINNER', from: 'R32-12' },
  },
  {
    id: 'R16-7',
    top: { kind: 'WINNER', from: 'R32-13' },
    bottom: { kind: 'WINNER', from: 'R32-14' },
  },
  {
    id: 'R16-8',
    top: { kind: 'WINNER', from: 'R32-15' },
    bottom: { kind: 'WINNER', from: 'R32-16' },
  },
]

/* ---------------------------------------------------------------------- */
/* Quarterfinals                                                          */
/* ---------------------------------------------------------------------- */
export const quarterFinals: Matchup[] = [
  { id: 'QF-1', top: { kind: 'WINNER', from: 'R16-1' }, bottom: { kind: 'WINNER', from: 'R16-2' } },
  { id: 'QF-2', top: { kind: 'WINNER', from: 'R16-3' }, bottom: { kind: 'WINNER', from: 'R16-4' } },
  { id: 'QF-3', top: { kind: 'WINNER', from: 'R16-5' }, bottom: { kind: 'WINNER', from: 'R16-6' } },
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
