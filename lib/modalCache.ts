// lib/modalCache.ts
// Module-level cache so hover-prefetch (300ms) warms data that DetailModal
// reads on click — zero perceived latency on the common hover→click path.
//
// Network-aware: tracks recent fetch failures per entry so that on a bad
// connection, repeated hover events don't hammer a server that's already
// timing out. After a failure, the cache backs off for BACKOFF_MS before
// allowing another attempt.

export interface CachedModalData {
  details: any
  videos: any
  credits: any
  recommendations: any
}

type CacheKey = `${'movie' | 'tv'}:${number}`

const cache      = new Map<CacheKey, Promise<CachedModalData>>()
const timestamps = new Map<CacheKey, number>()
const failures   = new Map<CacheKey, number>()   // timestamp of last failure

const MAX_AGE_MS  = 5 * 60 * 1000   // 5 min stale window
const BACKOFF_MS  = 30 * 1000       // 30s back-off after a failure

function key(id: number, type: 'movie' | 'tv'): CacheKey {
  return `${type}:${id}`
}

function fetchModalData(id: number, type: 'movie' | 'tv'): Promise<CachedModalData> {
  const base = `/api/tmdb?path=/${type}/${id}`
  return Promise.all([
    fetch(base).then(r => r.json()),
    fetch(`${base}/videos`).then(r => r.json()),
    fetch(`${base}/credits`).then(r => r.json()),
    fetch(`${base}/recommendations`).then(r => r.json()),
  ]).then(([details, videos, credits, recommendations]) => ({
    details, videos, credits, recommendations,
  }))
}

function isStale(k: CacheKey): boolean {
  return Date.now() - (timestamps.get(k) ?? 0) >= MAX_AGE_MS
}

function isBackedOff(k: CacheKey): boolean {
  const lastFail = failures.get(k) ?? 0
  return Date.now() - lastFail < BACKOFF_MS
}

function store(k: CacheKey, id: number, type: 'movie' | 'tv'): Promise<CachedModalData> {
  timestamps.set(k, Date.now())
  const promise = fetchModalData(id, type)
  cache.set(k, promise)
  promise.catch(() => {
    cache.delete(k)
    timestamps.delete(k)
    failures.set(k, Date.now())   // record failure time for back-off
  })
  return promise
}

// Called on card hover after 300ms. Fire-and-forget.
// Skips if recently failed (back-off) or already cached and fresh.
export function prefetchModalData(id: number, type: 'movie' | 'tv') {
  const k = key(id, type)
  if (isBackedOff(k)) return           // don't hammer a failing endpoint
  if (cache.has(k) && !isStale(k)) return
  store(k, id, type)
}

// Called by DetailModal on open. Always returns a promise — cache hit or
// fresh fetch — so the modal's open logic is a single consistent path.
export function getModalData(id: number, type: 'movie' | 'tv'): Promise<CachedModalData> {
  const k = key(id, type)
  if (cache.has(k) && !isStale(k)) return cache.get(k)!
  return store(k, id, type)
}
