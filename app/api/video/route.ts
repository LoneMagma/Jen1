// app/api/video/route.ts
//
// This route is now a lightweight stub. The actual provider URL construction
// moved client-side to VideoPlayer.tsx after the Cineby analysis revealed
// that our TMDB-based providers just need a TMDB ID in a predictable
// URL pattern — no server-side probing, no HEAD requests, no fallback races.
// Primary provider is VidCore (see PROVIDERS in VideoPlayer.tsx).
//
// Kept as a route in case we need server-side logic later (e.g. geo-routing,
// per-user provider preferences, or a premium source that needs an API key).

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'client-side' })
}
