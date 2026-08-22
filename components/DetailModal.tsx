'use client'
// components/DetailModal.tsx
// Quick-look overlay. Same visual language as DetailPage — they should
// feel like the same product, one compact and one full-width.

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X, Play, ExternalLink } from 'lucide-react'
import type { Movie, TVShow, Video, Credits, Episode } from '@/types/tmdb'
import { posterUrl, backdropUrl, getTrailerKey, getTitle, getReleaseYear } from '@/lib/tmdb'
import { getModalData } from '@/lib/modalCache'
import VideoPlayer from './VideoPlayer'
import { useKeyboard } from '@/hooks/useKeyboard'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

type MediaType = 'movie' | 'tv'

export default function DetailModal() {
  const [current, setCurrent]     = useState<{ id: number; type: MediaType } | null>(null)
  const [movie, setMovie]         = useState<Movie | null>(null)
  const [show, setShow]           = useState<TVShow | null>(null)
  const [videos, setVideos]       = useState<Video[]>([])
  const [credits, setCredits]     = useState<Credits | null>(null)
  const [recs, setRecs]           = useState<(Movie | TVShow)[]>([])
  const [loading, setLoading]     = useState(false)
  const [closing, setClosing]     = useState(false)

  const [selectedSeason, setSeason]   = useState(1)
  const [selectedEpisode, setEpisode] = useState(1)
  const [episodes, setEpisodes]       = useState<Episode[]>([])
  const [epLoading, setEpLoading]     = useState(false)

  const [playing, setPlaying]     = useState(false)
  const [playMode, setPlayMode]   = useState<'trailer' | 'stream'>('stream')
  // Stores the exact season/episode the user clicked — separate from display
  // state because React state setters are async. If we set selectedEpisode
  // then immediately call setPlaying(true), VideoPlayer renders with the
  // OLD selectedEpisode value from the current render. playTarget is a ref
  // so it's always current by the time VideoPlayer reads it.
  const playTarget = useRef<{ season: number; episode: number }>({ season: 1, episode: 1 })
  const [resumeFrom, setResumeFrom] = useState<number | undefined>(undefined)

  const scrollRef    = useRef<HTMLDivElement>(null)
  const requestToken = useRef(0)

  const item       = movie ?? show
  const type: MediaType = show ? 'tv' : 'movie'
  const trailerKey = getTrailerKey(videos)
  const cast       = credits?.cast?.slice(0, 6).map(c => c.name).join(', ')
  const director   = credits?.crew?.find(c => c.job === 'Director' || c.job === 'Creator')
  const genres     = item && 'genres' in item ? item.genres?.map(g => g.name) ?? [] : []
  const runtime    = movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null
  const seasons    = show?.number_of_seasons

  const trackPlay = (season?: number, episode?: number) => {
    if (!item) return
    window.dispatchEvent(new CustomEvent('track-watch', {
      detail: {
        id: current!.id, type,
        title: getTitle(item as Movie | TVShow),
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        rating: item.vote_average,
        season, episode,
      }
    }))
  }

  const openItem = useCallback(async (
    id: number, mediaType: MediaType = 'movie',
    initialSeason?: number, initialEpisode?: number
  ) => {
    const myToken = ++requestToken.current
    setClosing(false); setLoading(true); setPlaying(false)
    setResumeFrom(undefined)
    setMovie(null); setShow(null); setVideos([]); setCredits(null); setRecs([])
    setSeason(initialSeason ?? 1); setEpisode(initialEpisode ?? 1); setEpisodes([])
    playTarget.current = { season: initialSeason ?? 1, episode: initialEpisode ?? 1 }
    setCurrent({ id, type: mediaType })
    scrollRef.current?.scrollTo(0, 0)

    const { details, videos: vids, credits: creds, recommendations } = await getModalData(id, mediaType)
    if (myToken !== requestToken.current) return

    if (mediaType === 'tv') setShow(details); else setMovie(details)
    setVideos(vids.results ?? [])
    setCredits(creds)
    setRecs((recommendations.results ?? []).filter((m: Movie | TVShow) => m.poster_path).slice(0, 12))
    setLoading(false)
  }, [])

  // Episode fetch
  useEffect(() => {
    if (!show) return
    let cancelled = false
    setEpLoading(true)
    fetch(`/api/tmdb?path=/tv/${show.id}/season/${selectedSeason}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setEpisodes(d.episodes ?? []); setEpLoading(false) } })
      .catch(() => { if (!cancelled) setEpLoading(false) })
    return () => { cancelled = true }
  }, [show, selectedSeason])

  // Event listeners
  useEffect(() => {
    const onOpen = (e: Event) => {
      const ev = e as CustomEvent<{ id: number; type?: MediaType }>
      openItem(ev.detail.id, ev.detail.type ?? 'movie')
    }
    const onResume = async (e: Event) => {
      const ev = e as CustomEvent<{ id: number; type: MediaType; season?: number; episode?: number; elapsedSeconds?: number }>
      const d = ev.detail
      await openItem(d.id, d.type, d.season, d.episode)
      setResumeFrom(d.elapsedSeconds && d.elapsedSeconds > 30 ? d.elapsedSeconds : undefined)
      setPlayMode('stream'); setPlaying(true)
    }
    window.addEventListener('open-movie', onOpen)
    window.addEventListener('resume-watching', onResume)
    return () => {
      window.removeEventListener('open-movie', onOpen)
      window.removeEventListener('resume-watching', onResume)
    }
  }, [openItem])

  const close = useCallback(() => {
    setClosing(true); setPlaying(false)
    setTimeout(() => { setCurrent(null); setMovie(null); setShow(null); setClosing(false) }, 200)
  }, [])

  useKeyboard({
    'Escape': () => { if (playing) setPlaying(false); else close() },
    'p': () => { if (item) { setPlayMode('stream'); setPlaying(true) } },
    'P': () => { if (item) { setPlayMode('stream'); setPlaying(true) } },
  }, { enabled: !!current && !playing })

  useBodyScrollLock(!!current)

  if (!current) return null

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 ${closing ? 'scrim-exit' : 'scrim-enter'}`}
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
        onClick={e => e.target === e.currentTarget && close()}
      >
        <div className={`
          relative bg-[#0f0f0f] w-full max-w-5xl
          max-h-[92vh] sm:max-h-[90vh]
          rounded-t-2xl sm:rounded-2xl
          overflow-hidden flex flex-col
          border border-white/[0.06]
          shadow-[0_32px_80px_rgba(0,0,0,0.8)]
          ${closing ? 'modal-exit' : 'modal-enter'}
        `}>

          {/* ── Hero backdrop ── */}
          <div className="relative h-[38vh] min-h-[200px] max-h-[340px] flex-shrink-0">
            {loading ? (
              <div className="w-full h-full skeleton" />
            ) : item?.backdrop_path ? (
              <Image
                src={backdropUrl(item.backdrop_path)}
                alt={item ? getTitle(item) : ''}
                fill sizes="100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full bg-[#181818]" />
            )}

            {/* Gradients */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, #0f0f0f 0%, rgba(15,15,15,0.6) 40%, rgba(15,15,15,0.1) 70%, transparent 100%)' }}
            />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.6) 0%, transparent 50%)' }}
            />

            {/* Controls */}
            <button
              onClick={close}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/60 flex items-center justify-center hover:text-white hover:bg-black/80 transition-all"
            >
              <X size={14} />
            </button>
            {item && (
              <Link
                href={`/${type}/${current.id}`}
                onClick={close}
                className="absolute top-4 right-14 z-10 flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/50 text-xs hover:text-white hover:bg-black/80 transition-all"
              >
                <ExternalLink size={11} /> Page
              </Link>
            )}

            {/* Title block */}
            {!loading && item && (
              <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-8 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/35 font-medium">
                    {type === 'tv' ? 'Series' : 'Film'}
                  </span>
                  {getReleaseYear(item) && (
                    <span className="text-[10px] text-white/20">· {getReleaseYear(item)}</span>
                  )}
                  {runtime && <span className="text-[10px] text-white/20">· {runtime}</span>}
                  {seasons && <span className="text-[10px] text-white/20">· {seasons}S</span>}
                </div>
                <h2 className="font-archivo font-black text-[clamp(1.4rem,4vw,2rem)] leading-[0.95] text-white">
                  {getTitle(item)}
                </h2>
              </div>
            )}
          </div>

          {/* ── Body ── */}
          <div ref={scrollRef} className="overflow-y-auto flex-1 px-6 sm:px-8 pt-5 pb-8">
            {loading && !item ? (
              <div className="h-32 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-jen1-red/30 border-t-jen1-red animate-spin" />
              </div>
            ) : item ? (
              <>
                {/* ── Action row ── */}
                <div className="flex items-center gap-2.5 mb-5">
                  <button
                    onClick={() => {
                      playTarget.current = { season: selectedSeason, episode: selectedEpisode }
                      setPlayMode('stream'); setPlaying(true)
                      trackPlay(selectedSeason, selectedEpisode)
                    }}
                    className="flex items-center gap-2 bg-white text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-100 shadow-lg"
                  >
                    <Play size={13} fill="currentColor" /> Play
                  </button>
                  {trailerKey && (
                    <button
                      onClick={() => { setPlayMode('trailer'); setPlaying(true) }}
                      className="flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-medium text-sm px-5 py-2.5 rounded-lg transition-all"
                    >
                      Trailer
                    </button>
                  )}
                  {item.vote_average > 0 && (
                    <span className="ml-auto text-white/40 text-xs">
                      ★ <span className="text-white/60 font-medium">{item.vote_average.toFixed(1)}</span>
                      <span className="text-white/25 ml-1">({item.vote_count?.toLocaleString()})</span>
                    </span>
                  )}
                </div>

                {/* ── Season & Episodes — prominent, right under the action
                     row since for a series this IS the primary decision,
                     not a buried detail. Season pills instead of a select
                     (all seasons visible at a glance), episode cards with
                     stills instead of a thin text list. ── */}
                {type === 'tv' && show && (
                  <div className="mb-6 -mx-6 sm:-mx-8 px-6 sm:px-8 py-5 bg-white/[0.03] border-y border-white/[0.06]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white/85 font-semibold text-sm">Episodes</h3>
                      {episodes.length > 0 && (
                        <span className="text-white/30 text-xs font-mono">
                          S{selectedSeason} · E{selectedEpisode}
                        </span>
                      )}
                    </div>

                    {/* Season pills — every season visible without opening a menu */}
                    {(show.number_of_seasons ?? 1) > 1 && (
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
                        {Array.from({ length: show.number_of_seasons ?? 1 }, (_, i) => i + 1).map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              setSeason(s); setEpisode(1)
                              playTarget.current = { season: s, episode: 1 }
                            }}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                              s === selectedSeason
                                ? 'bg-white text-black'
                                : 'bg-white/06 text-white/50 hover:bg-white/10 hover:text-white/80 border border-white/08'
                            }`}
                          >
                            Season {s}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Episode grid — thumbnail cards instead of a text list */}
                    {epLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="aspect-video rounded-xl skeleton" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {episodes.map(ep => (
                          <button
                            key={ep.episode_number}
                            onClick={() => {
                              setEpisode(ep.episode_number)
                              playTarget.current = { season: selectedSeason, episode: ep.episode_number }
                              setPlayMode('stream')
                              setPlaying(true)
                              trackPlay(selectedSeason, ep.episode_number)
                            }}
                            className={`group/ep text-left rounded-xl overflow-hidden border transition-all ${
                              ep.episode_number === selectedEpisode
                                ? 'border-jen1-red/50 bg-jen1-red/10'
                                : 'border-white/08 hover:border-white/20 bg-white/02'
                            }`}
                          >
                            <div className="relative aspect-video bg-white/05">
                              {ep.still_path ? (
                                <Image
                                  src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                                  alt={ep.name || `Episode ${ep.episode_number}`}
                                  fill sizes="220px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/15">
                                  <Play size={18} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover/ep:bg-black/30 transition-colors flex items-center justify-center">
                                <Play size={22} fill="white" className="text-white opacity-0 group-hover/ep:opacity-100 transition-opacity" />
                              </div>
                              <span className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                ep.episode_number === selectedEpisode ? 'bg-jen1-red text-white' : 'bg-black/70 text-white/70'
                              }`}>
                                {ep.episode_number}
                              </span>
                              {ep.runtime && (
                                <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white/70 text-[10px] px-1.5 py-0.5 rounded">
                                  {ep.runtime}m
                                </span>
                              )}
                            </div>
                            <div className="px-2.5 py-2">
                              <p className="text-white/75 text-[12px] font-medium leading-tight truncate group-hover/ep:text-white transition-colors">
                                {ep.name || `Episode ${ep.episode_number}`}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Overview ── */}
                {'tagline' in item && item.tagline && (
                  <p className="text-white/35 text-[13px] italic mb-3">{item.tagline}</p>
                )}
                {item.overview && (
                  <p className="text-white/55 text-[13px] leading-relaxed mb-5">{item.overview}</p>
                )}

                {/* ── Meta table ── */}
                <div className="space-y-2 mb-5">
                  {director && (
                    <div className="flex gap-3 text-[12px]">
                      <span className="text-white/25 w-16 flex-shrink-0 uppercase tracking-wide pt-px">
                        {type === 'tv' ? 'Creator' : 'Director'}
                      </span>
                      <span className="text-white/65">{director.name}</span>
                    </div>
                  )}
                  {cast && (
                    <div className="flex gap-3 text-[12px]">
                      <span className="text-white/25 w-16 flex-shrink-0 uppercase tracking-wide pt-px">Cast</span>
                      <span className="text-white/50">{cast}</span>
                    </div>
                  )}
                  {genres.length > 0 && (
                    <div className="flex gap-3 text-[12px]">
                      <span className="text-white/25 w-16 flex-shrink-0 uppercase tracking-wide pt-px">Genre</span>
                      <div className="flex flex-wrap gap-1.5">
                        {genres.map(g => (
                          <span key={g} className="text-white/50 text-[11px] px-2 py-0.5 rounded-full bg-white/06 border border-white/08">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── More Like This ── */}
                {recs.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-3">More Like This</p>
                    <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                      {recs.map(rec => (
                        <button
                          key={rec.id}
                          onClick={() => openItem(rec.id, 'title' in rec ? 'movie' : 'tv')}
                          className="flex-shrink-0 w-[88px] group/rec text-left"
                        >
                          <div className="relative w-[88px] h-[132px] rounded-lg overflow-hidden mb-1.5 border border-white/05 group-hover/rec:border-white/15 transition-all duration-200">
                            <Image
                              src={posterUrl(rec.poster_path)}
                              alt={getTitle(rec as Movie | TVShow)}
                              fill sizes="88px"
                              className="object-cover group-hover/rec:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover/rec:opacity-100 transition-opacity flex items-end justify-center pb-2">
                              <Play size={14} fill="white" className="text-white" />
                            </div>
                          </div>
                          <p className="text-white/50 text-[10px] font-medium leading-tight truncate group-hover/rec:text-white/80 transition-colors">
                            {getTitle(rec as Movie | TVShow)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {playing && current && item && (
        <VideoPlayer
          movieId={current.id}
          movieTitle={getTitle(item as Movie | TVShow)}
          trailerKey={playMode === 'trailer' ? trailerKey : null}
          mode={playMode}
          mediaType={type}
          season={playTarget.current.season}
          episode={playTarget.current.episode}
          resumeFrom={resumeFrom}
          onClose={() => setPlaying(false)}
        />
      )}
    </>
  )
}
