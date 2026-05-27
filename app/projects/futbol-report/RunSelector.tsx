'use client'

import { useRouter } from 'next/navigation'

function formatTimestamp(ts: string): string {
  // ts looks like "20260525_231530" → "2026-05-25 23:15"
  const date = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`
  const time = `${ts.slice(9, 11)}:${ts.slice(11, 13)}`
  return `${date} ${time}`
}

export default function RunSelector({
  timestamps,
  current,
}: {
  timestamps: string[]
  current: string
}) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Run:</span>
      <select
        value={current}
        onChange={(e) => router.push(`/projects/futbol-report?run=${e.target.value}`)}
        className="rounded border border-gray-300 bg-white px-2 py-1 dark:border-gray-600 dark:bg-gray-800"
      >
        {timestamps.map((ts) => (
          <option key={ts} value={ts}>
            {formatTimestamp(ts)}
          </option>
        ))}
      </select>
    </label>
  )
}
