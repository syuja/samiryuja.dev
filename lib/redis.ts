import { createClient } from 'redis'

export type Run = {
    timestamp: string
    generated_at: string
    reports: Record<string, string>
}

// Opens a connection, runs your function, always closes the connection.
async function withRedis<T>(fn: (client: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
    const client = createClient({ url: process.env.REDIS_URL })
    await client.connect()
    try {
        return await fn(client)
    } finally {
        await client.quit()
    }
}

// All run timestamps, newest first.
export async function getAllTimestamps(): Promise<string[]> {
    return withRedis(async (client) => {
        return await client.lRange('runs:index', 0, -1)
    })
}

// One specific run by timestamp. Returns null if it doesn't exist.
export async function getRun(timestamp: string): Promise<Run | null> {
    return withRedis(async (client) => {
        const raw = await client.get(`run:${timestamp}`)
        return raw ? (JSON.parse(raw) as Run) : null
    })
}

// The most recent run. Returns null if there are no runs.
export async function getLatestRun(): Promise<Run | null> {
    return withRedis(async (client) => {
        const timestamps = await client.lRange('runs:index', 0, 0)
        if (timestamps.length === 0) return null
        const raw = await client.get(`run:${timestamps[0]}`)
        return raw ? (JSON.parse(raw) as Run) : null
    })
}

// Record one vote for a model on a given run.
export async function recordVote(timestamp: string, model: string): Promise<void> {
    return withRedis(async (client) => {
        await client.incr(`votes:${timestamp}:${model}`)
    })
}

// Get vote counts for every model in a run. Returns { model: count }.
export async function getVotes(timestamp: string): Promise<Record<string, number>> {
    return withRedis(async (client) => {
        const keys = await client.keys(`votes:${timestamp}:*`)
        const votes: Record<string, number> = {}
        for (const key of keys) {
            // key looks like "votes:20260525_231530:anthropic/claude-sonnet-4.5"
            // strip the "votes:<timestamp>:" prefix to get the model slug back
            const model = key.slice(`votes:${timestamp}:`.length)
            const count = await client.get(key)
            votes[model] = count ? parseInt(count, 10) : 0
        }
        return votes
    })
}