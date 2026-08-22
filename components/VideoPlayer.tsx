'use client'
// components/VideoPlayer.tsx
//
// Intentionally minimal. The Videasy player has its own polished UI —
// controls, fullscreen, progress bar, server selection. We don't wrap it
// in our own chrome. We just mount it, track postMessage events for
// Continue Watching, and get out of the way.
//
// The only UI we add: a thin escape route (clicking the dim overlay behind
// the player closes it) and a back arrow that appears on hover at the very
// top-left — so there's always a way out without knowing the keyboard shortcut.

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface Provider {
  id: string
  url: (id: number, type: 'movie' | 'tv', season: number, episode: number, startAt?: number) => string
}

const PROVIDERS: Provider[] = [
  {
    id: 'videasy',
    url: (id, type, s, e, startAt) => {
      const base = type === 'movie'
        ? `https://player.videasy.net/movie/${id}?color=E50914&autoplay=true&nextButton=false`
        // Videasy's TV route takes season/episode as PATH segments —
        // /tv/{id}/{season}/{episode} — not query params. The old
        // ?season=&episode= form was silently ignored for S1E1 (which
        // is why every series looked "stuck" on episode 1) and for any
        // other episode it hit a malformed/unsupported route on
        // Videasy's backend, which is what surfaced as the 502 Bad
        // Gateway page inside the iframe.
        : `https://player.videasy.net/tv/${id}/${s}/${e}?color=E50914&autoplay=true&nextButton=false`
      return startAt && startAt > 30 ? `${base}&startAt=${Math.floor(startAt)}` : base
    },
  },
  {
    id: 'vidlink',
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://vidlink.pro/movie/${id}?autoplay=true&primaryColor=E50914`
        : `https://vidlink.pro/tv/${id}/${s}/${e}?autoplay=true&primaryColor=E50914`,
  },
  {
    id: 'embedsu',
    url: (id, type, s, e) =>
      type === 'movie'
        ? `https://embed.su/embed/movie/${id}`
        : `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
]

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
  const [providerIdx, setProviderIdx] = useState(0)
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
    : PROVIDERS[providerIdx].url(movieId, mediaType, season, episode,
        providerIdx === 0 ? resumeFrom : undefined)

  // Reset on content change
  useEffect(() => {
    setProviderIdx(0)
    setLoading(true)
    setHardError(false)
  }, [movieId, mode, mediaType, season, episode, trailerKey])

  // Videasy postMessage → Continue Watching
  useEffect(() => {
    if (providerIdx !== 0 || mode !== 'stream') return
    const handler = (e: MessageEvent) => {
      if (!e.origin.includes('videasy')) return
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (typeof data.currentTime === 'number') {
          window.dispatchEvent(new CustomEvent('track-progress', {
            detail: { id: movieId, type: mediaType, elapsedSeconds: Math.round(data.currentTime) },
          }))
        }
      } catch {}
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [providerIdx, mode, movieId, mediaType])

  // Stall → advance provider
  useEffect(() => {
    if (!loading || hardError || mode === 'trailer') return
    clearTimeout(stallTimer.current)
    stallTimer.current = setTimeout(() => {
      const next = providerIdx + 1
      if (next < PROVIDERS.length) { setProviderIdx(next); setLoading(true) }
      else { setHardError(true); setLoading(false) }
    }, 20_000)
    return () => clearTimeout(stallTimer.current)
  }, [loading, hardError, mode, providerIdx])

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
            <span className="w-1.5 h-1.5 rounded-full bg-jen1-red animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-jen1-red animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-jen1-red animate-bounce [animation-delay:300ms]" />
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
                {PROVIDERS.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => { setProviderIdx(i); setLoading(true); setHardError(false) }}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      i === providerIdx
                        ? 'border-jen1-red text-jen1-red'
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
          key={`${providerIdx}-${movieId}-${season}-${episode}`}
          src={iframeUrl}
          className={`absolute inset-0 w-full h-full border-none transition-opacity duration-700 ${
            loading ? 'opacity-0' : 'opacity-100'
          }`}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          onLoad={() => { setLoading(false); clearTimeout(stallTimer.current) }}
        />
      )}
    </div>
  )
}
