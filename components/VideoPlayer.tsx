'use client'
// components/VideoPlayer.tsx
//
// Intentionally minimal. VidCore (and the fallback providers below) have
// their own polished UI — controls, fullscreen, progress bar, server
// selection. We don't wrap it in our own chrome. We just mount it, track
// postMessage events for Continue Watching, and get out of the way.
//
// The only UI we add: a thin escape route (clicking the dim overlay behind
// the player closes it) and a back arrow that appears on hover at the very
// top-left — so there's always a way out without knowing the keyboard shortcut.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { orderByHealth, isProbablyDown, recordOutcome } from '@/lib/providerHealth'

interface Provider {
  id: string
  url: (id: number, type: 'movie' | 'tv', season: number, episode: number, startAt?: number) => string
}

// Public VidSrc mirror by default (their own docs: this carries some
// ad load). Set NEXT_PUBLIC_VIDSRC_DOMAIN to a custom domain pointed
// at VidSrc via Cloudflare (CNAME + Flexible SSL, per their "Custom
// Domain" guide) to cut that — their own number is "50% fewer ads,"
// not zero.
const VIDSRC_DOMAIN = process.env.NEXT_PUBLIC_VIDSRC_DOMAIN || 'vidsrcme.ru'

// Explicit expected postMessage origin per provider, rather than
// guessing from the id string — id-as-substring-of-hostname breaks
// the moment VIDSRC_DOMAIN points at a custom domain that doesn't
// contain "vidsrc" anywhere in it (e.g. a Cloudflare CNAME target).
function expectedOrigin(providerId: string): string {
  if (providerId === 'vidcore') return 'vidcore'
  if (providerId === 'vidlink') return 'vidlink'
  if (providerId === 'vidsrc') return VIDSRC_DOMAIN
  return providerId
}

// The three providers currently wired in, each verified against its
// own documentation (not secondhand mentions):
//  - VidCore: fetchable public docs confirming URL shapes and events.
//  - VidLink: the most thoroughly documented — explicit PLAYER_EVENT
//    schema, startAt param.
//  - VidSrc: fetched directly from an official mirror (vidsrcme.ru).
//    Their own docs state the public mirror domains carry some ad
//    load, and that a custom domain cuts that "by 50%" — their own
//    number, not independently verified, and explicitly not "zero."
//
// Videasy is NOT in this list — its own site confirms it (and its
// mirror Vidking) shut down September 15, 2026.
//
// Order below is the *default* fallback order for a fresh session —
// orderByHealth() re-sorts this at runtime based on which providers
// have actually been working, so this array's order stops mattering
// once real usage history exists.
const PROVIDERS: Provider[] = [
  {
    id: 'vidcore',
    url: (id, type, s, e, startAt) => {
      const base = type === 'movie'
        ? `https://vidcore.org/embed/movie/${id}?theme=E50914&color=E50914&autoplay=true`
        // VidCore's TV route takes season/episode as path segments, same
        // shape as Videasy's — confirmed against vidcore.org's own docs.
        : `https://vidcore.org/embed/tv/${id}/${s}/${e}?theme=E50914&color=E50914&autoplay=true`
      return startAt && startAt > 30 ? `${base}&startAt=${Math.floor(startAt)}` : base
    },
  },
  {
    id: 'vidsrc',
    url: (id, type, s, e, startAt) => {
      // VidSrc takes IMDB or numeric TMDB IDs in the same position —
      // we pass the TMDB id straight through, confirmed supported.
      const base = type === 'movie'
        ? `https://${VIDSRC_DOMAIN}/embed/movie/${id}`
        : `https://${VIDSRC_DOMAIN}/embed/tv/${id}/${s}/${e}`
      const params = new URLSearchParams()
      // autoplay=1 on the public mirrors still shows a play button first
      // (their docs: direct no-click autoplay is custom-domain only) —
      // harmless to send either way, so it's left on for when the
      // custom domain is live.
      params.set('autoplay', '1')
      if (startAt && startAt > 30) params.set('startAt', String(Math.floor(startAt)))
      return `${base}?${params.toString()}`
    },
  },
  {
    id: 'vidlink',
    url: (id, type, s, e, startAt) => {
      const base = type === 'movie'
        ? `https://vidlink.pro/movie/${id}?autoplay=true&primaryColor=E50914`
        : `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&primaryColor=E50914`
      // Confirmed via vidlink.pro's own docs: startAt is a real param.
      return startAt && startAt > 30 ? `${base}&startAt=${Math.floor(startAt)}` : base
    },
  },
]

const RETRY_LIMIT = 1 // each provider gets one retry before being skipped
const STALL_TIMEOUT_MS = 20_000

interface VideoPlayerProps {
  movieId: number
  movieTitle: string
  trailerKey: string | null
  mode: 'trailer' | 'stream'
  mediaType: 'movie' | 'tv'
  season?: number
  episode?: number
  resumeFrom?: number
  onClose: () => void
}

export default function VideoPlayer({
  movieId, movieTitle, trailerKey, mode, mediaType,
  season = 1, episode = 1, resumeFrom, onClose,
}: VideoPlayerProps) {
  // Providers reordered by real track record on mount. Recomputed only
  // once per mount (not on every render) since health data shouldn't
  // reshuffle mid-playback — that would restart the ordering logic
  // while the person is actively watching something.
  const orderedProviders = useMemo(() => {
    const healthyOrder = orderByHealth(PROVIDERS.map(p => p.id))
      .filter(id => !isProbablyDown(id))
    const orderedIds = healthyOrder.length > 0
      ? healthyOrder
      : PROVIDERS.map(p => p.id) // every provider looked down — try them anyway, don't strand the user
    return orderedIds
      .map(id => PROVIDERS.find(p => p.id === id))
      .filter((p): p is Provider => p !== undefined)
  }, [])

  const [providerIdx, setProviderIdx] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [hardError, setHardError] = useState(false)
  const [showBack, setShowBack] = useState(false)

  const iframeRef   = useRef<HTMLIFrameElement>(null)
  const stallTimer  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideTimer   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useBodyScrollLock(true)

  // Navigation hijack guard
  useEffect(() => {
    if (mode !== 'stream') return
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [mode])

  // Build URL
  const iframeUrl = mode === 'trailer'
    ? (trailerKey
        ? `https://www.youtube.com/embed/${trailerKey}?autoplay=1&rel=0&modestbranding=1&color=white`
        : null)
    : orderedProviders[providerIdx].url(movieId, mediaType, season, episode,
        providerIdx === 0 ? resumeFrom : undefined)

  // Reset on content change
  useEffect(() => {
    setProviderIdx(0)
    setLoading(true)
    setHardError(false)
  }, [movieId, mode, mediaType, season, episode, trailerKey])

  // Provider postMessage → Continue Watching + real-playback health signal.
  //
  // VidCore's own docs (vidcore.org) only confirm three event names —
  // vidcore:play, vidcore:pause, vidcore:ended — with no documented
  // payload shape, unlike VidLink's fully-specified PLAYER_EVENT object
  // (currentTime, duration, mediaType, season, episode — confirmed via
  // vidlink.pro's own docs) or Videasy's {currentTime} object. Where a
  // provider's payload shape isn't confirmed, this only forwards a
  // timestamp if one is actually present rather than guessing a field
  // name that might not exist.
  //
  // A real player-event message here is also the most trustworthy
  // "this provider is actually working" signal available — more
  // trustworthy than the iframe's onLoad, which fires even for a
  // broken page the provider serves inside the frame. First such
  // event per provider load records a success.
  const playbackConfirmed = useRef(false)
  useEffect(() => { playbackConfirmed.current = false }, [providerIdx, movieId, mode])

  useEffect(() => {
    if (mode !== 'stream') return
    const current = orderedProviders[providerIdx]
    const handler = (e: MessageEvent) => {
      if (!e.origin.includes(expectedOrigin(current.id))) return
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data

        if (!playbackConfirmed.current) {
          playbackConfirmed.current = true
          recordOutcome(current.id, true)
        }

        if (current.id === 'vidlink') {
          // Confirmed shape: { type: 'PLAYER_EVENT', data: { event, currentTime, ... } }
          const inner = data?.data
          if (inner && typeof inner.currentTime === 'number') {
            window.dispatchEvent(new CustomEvent('track-progress', {
              detail: { id: movieId, type: mediaType, elapsedSeconds: Math.round(inner.currentTime) },
            }))
          }
        } else if (current.id === 'vidcore') {
          const eventName = data?.event ?? data?.type
          if ((eventName === 'vidcore:play' || eventName === 'vidcore:pause') && typeof data.currentTime === 'number') {
            window.dispatchEvent(new CustomEvent('track-progress', {
              detail: { id: movieId, type: mediaType, elapsedSeconds: Math.round(data.currentTime) },
            }))
          }
        } else if (current.id === 'vidsrc') {
          // Confirmed shape (vidsrcme.ru docs): { type: 'PLAYER_EVENT',
          // data: { player_status, player_progress, player_info: {...} } }
          // — note the field names differ from VidLink's PLAYER_EVENT
          // (player_progress here, currentTime there), so this needs
          // its own branch rather than falling into VidLink's.
          if (data?.type === 'PLAYER_EVENT') {
            const inner = data.data
            if (
              (inner?.player_status === 'playing' || inner?.player_status === 'paused') &&
              typeof inner.player_progress === 'number'
            ) {
              window.dispatchEvent(new CustomEvent('track-progress', {
                detail: { id: movieId, type: mediaType, elapsedSeconds: Math.round(inner.player_progress) },
              }))
            }
          }
        } else if (typeof data?.currentTime === 'number') {
          // Fallback for any future provider using the same bare
          // {currentTime} shape.
          window.dispatchEvent(new CustomEvent('track-progress', {
            detail: { id: movieId, type: mediaType, elapsedSeconds: Math.round(data.currentTime) },
          }))
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [providerIdx, mode, movieId, mediaType, orderedProviders])

  // Stall → retry once, then advance provider and record the failure
  useEffect(() => {
    if (!loading || hardError || mode === 'trailer') return
    clearTimeout(stallTimer.current)
    stallTimer.current = setTimeout(() => {
      const current = orderedProviders[providerIdx]
      if (retryCount < RETRY_LIMIT) {
        // One retry on the same provider first — a stall is often a
        // transient network hiccup, not the provider actually being
        // down, so immediately writing it off loses a source that
        // would have worked a few seconds later.
        setRetryCount(c => c + 1)
        setLoading(true)
      } else {
        recordOutcome(current.id, false)
        setRetryCount(0)
        const next = providerIdx + 1
        if (next < orderedProviders.length) { setProviderIdx(next); setLoading(true) }
        else { setHardError(true); setLoading(false) }
      }
    }, STALL_TIMEOUT_MS)
    return () => clearTimeout(stallTimer.current)
  }, [loading, hardError, mode, providerIdx, retryCount, orderedProviders])

  useEffect(() => {
    if (mode === 'trailer' && !trailerKey) { setHardError(true); setLoading(false) }
  }, [mode, trailerKey])

  // Mouse move → show back arrow briefly
  const handleMouseMove = useCallback(() => {
    setShowBack(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowBack(false), 2500)
  }, [])

  useKeyboard({ 'Escape': onClose }, { ignoreInputs: false })

  return (
    <div
      className="fixed inset-0 z-[70] bg-black"
      onMouseMove={handleMouseMove}
    >
      {/* Back arrow — fades in on mouse move, out after 2.5s idle */}
      <button
        onClick={onClose}
        className={`
          absolute top-5 left-5 z-30
          flex items-center gap-2
          text-white/70 hover:text-white
          transition-all duration-300
          ${showBack ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}
        `}
        aria-label="Back"
      >
        <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center">
          <ArrowLeft size={14} />
        </div>
      </button>

      {/* Loading state */}
      {loading && !hardError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gen1-red animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gen1-red animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gen1-red animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}

      {/* Error state */}
      {hardError && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center px-6">
            <p className="text-white/70 text-sm mb-1">
              {mode === 'trailer' ? 'No trailer available' : 'Not available right now'}
            </p>
            <p className="text-white/30 text-xs mb-6">
              {mode === 'stream' ? 'Try again later or switch servers below.' : ''}
            </p>
            {mode === 'stream' && (
              <div className="flex gap-2 justify-center mb-6">
                {orderedProviders.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      recordOutcome(orderedProviders[providerIdx].id, false)
                      setRetryCount(0)
                      setProviderIdx(i)
                      setLoading(true)
                      setHardError(false)
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      i === providerIdx
                        ? 'border-gen1-red text-gen1-red'
                        : 'border-white/20 text-white/40 hover:border-white/40 hover:text-white/60'
                    }`}
                  >
                    {p.id.charAt(0).toUpperCase() + p.id.slice(1)}
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="text-white/30 text-xs hover:text-white/60 transition-colors">
              ← Go back
            </button>
          </div>
        </div>
      )}

      {/* The actual player — fullscreen, edge to edge, no chrome */}
      {!hardError && iframeUrl && (
        <iframe
          ref={iframeRef}
          key={`${providerIdx}-${retryCount}-${movieId}-${season}-${episode}`}
          src={iframeUrl}
          className={`absolute inset-0 w-full h-full border-none transition-opacity duration-700 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={() => {
            setLoading(false)
            setRetryCount(0)
            clearTimeout(stallTimer.current)
            // Real success is recorded from the postMessage handler above
            // (actual playback events), which is harder to spoof than the
            // iframe just finishing a document load. onLoad only clears
            // the spinner here.
          }}
        />
      )}
    </div>
  )
}
