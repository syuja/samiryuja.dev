import { NextRequest, NextResponse } from 'next/server'
import { recordVote } from '@/lib/redis'

export async function POST(request: NextRequest) {
    try {
        const { timestamp, model } = await request.json()

        if (!timestamp || !model) {
            return NextResponse.json(
                { error: 'Missing timestamp or model' },
                { status: 400 }
            )
        }

        await recordVote(timestamp, model)
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Vote failed:', error)
        return NextResponse.json({ error: 'Vote failed' }, { status: 500 })
    }
}