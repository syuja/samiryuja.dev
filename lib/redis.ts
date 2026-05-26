import { createClient } from 'redis'

export type Run = {
    timestamp: string
    generated_at: string
    reports: Record<string, string>
}

export async function getLatestRun(): Promise<Run | null> {
    const client = createClient({ url: process.env.REDIS_URL })
    await client.connect()

    try {
        const timestamps = await client.lRange('runs:index', 0, 0)
        if (timestamps.length === 0) return null

        const raw = await client.get(`run:${timestamps[0]}`)
        if (!raw) return null

        return JSON.parse(raw) as Run
    } finally {
        await client.quit()
    }
}