// app/api/tmdb/route.ts

import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY   = process.env.TMDB_API_KEY
// 5s hard timeout — enough for normal connections, fast enough to fail
// cleanly on blocked/throttled networks without flooding the console.
const TIMEOUT_MS = 5000

export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
  }
  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const forward = new URLSearchParams(searchParams)
  forward.delete('path')
  forward.set('api_key', API_KEY)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${TMDB_BASE}${path}?${forward.toString()}`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return NextResponse.json({ error: res.statusText }, { status: res.status })
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err: unknown) {
    clearTimeout(timer)
    const isTimeout = err instanceof Error &&
      (err.name === 'AbortError' || err.message.includes('Timeout') || err.message.includes('timeout'))
    return NextResponse.json(
      { error: isTimeout ? 'TMDB request timed out' : 'TMDB fetch failed' },
      { status: 504 }
    )
  }
}
