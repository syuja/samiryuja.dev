'use client'

import { useState } from 'react'

export default function VoteButton({
  timestamp,
  model,
  initialCount,
}: {
  timestamp: string
  model: string
  initialCount: number
}) {
  const [count, setCount] = useState(initialCount)
  const [voting, setVoting] = useState(false)
  const [voted, setVoted] = useState(false)

  async function handleVote() {
    setVoting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp, model }),
      })
      if (res.ok) {
        setCount(count + 1)
        setVoted(true)
      }
    } catch (error) {
      console.error('Vote failed:', error)
    } finally {
      setVoting(false)
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={voting || voted}
      className="mt-4 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-60 dark:border-gray-600 dark:hover:bg-gray-800"
    >
      {voted ? '✓ Voted' : '👍 Best report'} · {count}
    </button>
  )
}
