interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'Futbol Report — Multi-Model LLM Comparison',
    description: `The same soccer-digest prompt sent to four LLMs (Claude, Kimi, Qwen, Gemma)
    with identical web-search context, rendered side by side. A live eval surfacing
    how different models handle the same task — format adherence, context filtering,
    and information density.`,
    href: '/projects/futbol-report',
  },
  {
    title: 'World Cup 2026 Bracket',
    description: `An interactive FIFA World Cup 2026 prediction bracket with cascading picks,
    Elo-based default selections, live matchup probabilities, champion celebration,
    and a one-page printable office-pool sheet.`,
    href: '/world-cup-bracket',
    imgSrc: '/static/images/world-cup-horizontal-reference.png',
  },
]

export default projectsData
