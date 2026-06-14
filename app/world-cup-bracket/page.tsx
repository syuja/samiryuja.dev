import { genPageMetadata } from 'app/seo'
import BracketClient from './BracketClient'

export const metadata = genPageMetadata({
  title: 'World Cup 2026 Bracket',
  description:
    'Fill out your FIFA World Cup 2026 prediction bracket. Cascading picks, live win probabilities, and a printable office-pool sheet.',
})

export default function Page() {
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-5xl md:leading-14 dark:text-gray-100">
          World Cup 2026 Bracket
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          Pick your way through the knockout rounds. Live win probabilities update with each
          matchup.
        </p>
      </div>
      <div className="py-8">
        <BracketClient />
      </div>
    </div>
  )
}
