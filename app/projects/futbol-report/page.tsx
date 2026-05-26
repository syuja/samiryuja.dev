import ReactMarkdown from 'react-markdown'
import { getLatestRun } from '@/lib/redis'

export const dynamic = 'force-dynamic'

const MODEL_LABELS: Record<string, string> = {
    'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
    'moonshotai/kimi-k2.6': 'Kimi K2.6',
    'qwen/qwen3.6-flash': 'Qwen 3.6 Flash',
    'google/gemma-4-31b-it': 'Gemma 4 31B',
}

export default async function FutbolReportPage() {
    const run = await getLatestRun()

    if (!run) {
        return (
            <div className="py-12">
                <h1 className="text-3xl font-bold">Futbol Report</h1>
                <p className="mt-4 text-gray-500">No runs found yet.</p>
            </div>
        )
    }

    const generated = new Date(run.generated_at).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    })

    return (
        <div className="py-12">
            <h1 className="text-3xl font-bold">Futbol Report</h1>
            <p className="mt-2 text-gray-500">
                The same soccer-digest prompt sent to four LLMs with identical search
                context. Generated {generated}.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                {Object.entries(run.reports).map(([model, report]) => (
                    <div
                        key={model}
                        className="rounded-lg border border-gray-200 p-5 dark:border-gray-700"
                    >
                        <h2 className="mb-3 text-xl font-semibold">
                            {MODEL_LABELS[model] ?? model}
                        </h2>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}