# Gen1 — Cinematic Movie Discovery Platform

A premium, immersive movie discovery and streaming experience powered by
TMDB and Next.js 15. (Renamed from Jen1 — see "Naming" below for what
did and didn't change internally.)

## Stack

- **Framework**: Next.js 15 (App Router, Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design tokens (`gen1-red`,
  `gen1-black`, etc. — see `tailwind.config.ts`)
- **Data**: TMDB API v3
- **Video**: Client-side multi-provider embed with health-based
  switching (see `lib/providerHealth.ts` and `components/VideoPlayer.tsx`)
- **Deploy**: Cloudflare Workers via OpenNext (`wrangler.jsonc`) — not
  a plain Vercel deploy, despite `SITE_URL` still pointing at a
  `vercel.app` domain in a few places (see "Naming", below)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
# Edit .env.local
TMDB_API_KEY=your_tmdb_api_key_here
```

Get a free TMDB API key at: https://www.themoviedb.org/settings/api

`VIDSRC_BASE` also exists in `.env.local` from an earlier provider
setup but isn't read anywhere in the current code — `app/api/video/route.ts`
is a stub; actual provider URLs are built client-side in
`VideoPlayer.tsx`. Safe to remove, or leave for now.

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy

```bash
npm run deploy
```

Builds and deploys to Cloudflare Workers via `@opennextjs/cloudflare`
(see `package.json` scripts and `wrangler.jsonc`).

## Project structure

```
gen1/
├── app/
│   ├── layout.tsx              # Root layout, metadata, fonts
│   ├── page.tsx                # Home
│   ├── movie/[id]/page.tsx     # Movie detail
│   ├── tv/[id]/page.tsx        # TV detail
│   ├── movies/, tv/, trending/, search/, genre/[slug]/
│   ├── sitemap.ts, robots.ts
│   └── api/
│       ├── tmdb/route.ts       # TMDB proxy (hides API key from client)
│       └── video/route.ts      # Stub — provider logic lives client-side now
├── components/
│   ├── GlassHeader.tsx         # Fixed top nav
│   ├── SearchBar.tsx, SearchOverlay.tsx, SearchResults.tsx
│   ├── HeroBanner.tsx          # Auto-rotating featured hero
│   ├── MovieRow.tsx, MovieCard.tsx, MediaGrid.tsx
│   ├── MoviesGrid.tsx, TVGrid.tsx, TrendingGrid.tsx, GenrePage.tsx
│   ├── DetailModal.tsx, DetailPage.tsx
│   ├── VideoPlayer.tsx         # Stream/trailer player, provider switching
│   ├── ContinueWatching.tsx, WatchTracker.tsx
│   ├── AIDisclosureDialog.tsx  # "AI & Ownership" — what's AI-assisted, what's not ours
│   ├── KeyboardHelp.tsx
│   ├── Footer.tsx, StructuredData.tsx
│   └── Providers.tsx           # Global overlay mounter
├── hooks/
│   ├── useContinueWatching.ts, useSearchHistory.ts
│   ├── useKeyboard.ts, useBodyScrollLock.ts
├── lib/
│   ├── tmdb.ts                 # Typed TMDB API client
│   ├── providerLabels.ts       # Hostname → display name for the source picker
│   └── providerHealth.ts       # Tracks provider success/failure, orders by track record
└── types/
    └── tmdb.ts
```

## Video providers

`VideoPlayer.tsx` tries providers in order, falling back on stall or
error. Currently: **VidCore**, **VidSrc**, **VidLink** — chosen because
these three had fetchable, verifiable documentation at the time they
were wired in, not because they're guaranteed ad-free or permanently
the best option. All three are third-party iframes outside this
project's control; `AIDisclosureDialog.tsx` says this plainly rather
than promising something that can change on their end without a
deploy on ours.

**Videasy was removed.** Its own site confirmed it (and its mirror
Vidking) shut down September 15, 2026 — this wasn't a preference
change, the service is gone.

`lib/providerHealth.ts` tracks real success/failure per provider in
localStorage (decayed over a week) and reorders the list on each play
attempt so a provider with a bad recent track record isn't tried first
by default. A stall gets one retry before the player moves to the next
provider.

### VidSrc: public mirror vs. custom domain

VidSrc's own docs state their public mirror domains (the ones in
`vidsrcme.ru`'s own footer — `vidsrc2.ru`, `vidsrc.ir`, `vidsrcme.ru`,
`vidsrcme.su`, `vidsrc-me.ru`, `vidsrc-me.su`, `vidsrc-embed.ru`,
`vidsrc-embed.su`, `vsrc.su`) carry some ad load, and that pointing a
custom domain at VidSrc cuts that "by 50%" — their own number, not
independently verified, and explicitly **not** "zero ads."

To use the custom-domain route:

1. Pick a subdomain dedicated to the player (e.g. `play.yourdomain.com`)
   — not your root domain, since step 3 requires a non-default SSL mode
   you don't want on your main site's traffic.
2. In Cloudflare DNS for that zone, add a CNAME record pointing that
   subdomain at VidSrc's target host (check their current docs/
   Announcements page for the exact value — it's stated to change).
   Proxy status: **Proxied** (orange cloud on).
3. In Cloudflare → SSL/TLS → Overview, set the encryption mode to
   **Flexible** for that subdomain specifically. VidSrc's docs are
   explicit that it must be Flexible, not Full or Full-strict, because
   their origin serves plain HTTP.
4. Once DNS propagates, set `NEXT_PUBLIC_VIDSRC_DOMAIN` in `.env.local`
   (see the commented example already there) to your subdomain and
   redeploy. Leave it unset to keep using the public mirror.

## Naming

This project was renamed from Jen1 to Gen1. What changed and what
didn't, on purpose:

- **Changed**: display name, page titles/metadata, the "AI & Ownership"
  dialog copy, Tailwind color token prefix (`jen1-red` → `gen1-red`,
  etc., across every component), and the two brand asset filenames
  (`gen1-logo.svg`, `gen1-icon-512.png`).
- **Not changed**: the `jen1.vercel.app` URL in `layout.tsx`,
  `StructuredData.tsx`, `robots.ts`, and `sitemap.ts`; the `"jen1"`
  name in `wrangler.jsonc`; and the `jen1:continue-watching` /
  `jen1:search-history` / `jen1_provider_health` localStorage keys.

  The URL and Workers project name are deployment identity — changing
  them in code doesn't move the actual deployment, so they'd just be
  wrong until the real Cloudflare/DNS side is renamed too. The
  localStorage keys are load-bearing for existing visitors: renaming
  them would silently wipe everyone's saved Continue Watching progress
  and search history on their next visit. Update these once the actual
  deployment is renamed, and treat the storage keys as a one-way
  migration (write a small migration on load, don't just rename) if
  they ever need to change.

## Keyboard shortcuts

- `Esc` — Close modal or exit player
- See `KeyboardHelp.tsx` / `hooks/useKeyboard.ts` for the full registry
