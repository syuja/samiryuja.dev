import ReactMarkdown from 'react-markdown'
import { getRun, getLatestRun, getAllTimestamps, getVotes } from '@/lib/redis'
import RunSelector from './RunSelector'
import VoteButton from './VoteButton'

export const dynamic = 'force-dynamic'

const MODEL_LABELS: Record<string, string> = {
  'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
  'moonshotai/kimi-k2.6': 'Kimi K2.6',
  'qwen/qwen3.6-flash': 'Qwen 3.6 Flash',
  'google/gemma-4-31b-it': 'Gemma 4 31B',
}
function DiagramBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-300 bg-gray-50 px-3 py-1.5 text-center dark:border-gray-600 dark:bg-gray-800">
      {children}
    </div>
  )
}

function Arrow() {
  return <div className="text-gray-400 dark:text-gray-500">↓</div>
}
export default async function FutbolReportPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>
}) {
  const { run: runParam } = await searchParams

  const timestamps = await getAllTimestamps()
  const run = runParam ? await getRun(runParam) : await getLatestRun()

  if (!run) {
    return (
      <div className="py-12">
        <h1 className="text-3xl font-bold">Futbol Report</h1>
        <p className="mt-4 text-gray-500">No runs found yet.</p>
      </div>
    )
  }

  const votes = await getVotes(run.timestamp)

  const generated = new Date(run.generated_at).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold">Futbol Report</h1>
      <div className="prose dark:prose-invert mt-3 max-w-none">
        <p>
          Every three days, an automated pipeline pulls current soccer news and fixtures from the
          web, then sends the exact same prompt and source material to four different language
          models — Claude, Kimi, Qwen, and Gemma. Their reports appear side by side below: same
          input, four models, no editing.
        </p>
        <p>
          The goal is to make model differences visible on a real, repeated task. Placed next to
          each other, the models diverge in ways that are easy to see — how faithfully they follow
          the requested format, what they choose to include or filter out, and how aggressively they
          compress. In practice Claude tends to follow the format most closely and Gemma compresses
          hardest, but the voting below is live, so feel free to disagree.
        </p>
      </div>
      <p className="mt-2 text-sm text-gray-500">Generated {generated}.</p>
      <div className="mt-4">
        <RunSelector timestamps={timestamps} current={run.timestamp} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {Object.entries(run.reports).map(([model, report]) => (
          <div
            key={model}
            className="flex flex-col rounded-lg border border-gray-200 p-5 dark:border-gray-700"
          >
            <h2 className="mb-3 text-xl font-semibold">{MODEL_LABELS[model] ?? model}</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
            <div className="mt-auto">
              <VoteButton
                timestamp={run.timestamp}
                model={model}
                initialCount={votes[model] ?? 0}
              />
            </div>
          </div>
        ))}
      </div>
      <section className="mt-16 border-t border-gray-200 pt-10 dark:border-gray-700">
        <h2 className="text-2xl font-bold">How it works</h2>

        <div className="prose dark:prose-invert mt-3 max-w-none">
          <p>
            A scheduled job on AWS runs the whole pipeline end to end, with no human in the loop:
          </p>
          <ol>
            <li>
              <strong>Gather context.</strong> Brave Search pulls current fixtures, results,
              transfer news, and managerial changes.
            </li>
            <li>
              <strong>Generate.</strong> The same search context and prompt go to four models
              through OpenRouter — so the only variable is the model itself.
            </li>
            <li>
              <strong>Store &amp; serve.</strong> Each report is written to Redis, which this page
              reads to render the comparison and tally votes.
            </li>
          </ol>
          <p>
            The generator is a Python pipeline packaged for AWS Lambda and triggered on a schedule
            by EventBridge. The site is built with Next.js and deployed on Vercel.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="mt-8 flex flex-col items-center gap-1.5 text-sm">
          <DiagramBox>EventBridge Scheduler — every 3 days</DiagramBox>
          <Arrow />
          <DiagramBox>AWS Lambda (Python)</DiagramBox>
          <Arrow />
          <div className="flex flex-wrap justify-center gap-2">
            <DiagramBox>Brave Search</DiagramBox>
            <DiagramBox>OpenRouter — 4 models</DiagramBox>
          </div>
          <Arrow />
          <DiagramBox>Redis (Vercel)</DiagramBox>
          <Arrow />
          <DiagramBox>Next.js page (this page)</DiagramBox>
        </div>
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <a
            href="https://github.com/syuja/futbol-report"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 font-medium hover:underline"
          >
            Generator repo (Python / Lambda) →
          </a>

          <a
            href="https://github.com/syuja/samiryuja.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-500 font-medium hover:underline"
          >
            Site repo (Next.js) →
          </a>
        </div>
      </section>
    </div>
  )
}
