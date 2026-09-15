'use client'
// components/DetailPage.tsx
// Full-page counterpart to DetailModal. Same design language.
// Lives at /movie/[id] and /tv/[id] — shareable, indexable.

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Play, Star, ChevronDown, Film, ArrowLeft } from 'lucide-react'
import type { Movie, TVShow, Video, Credits, Episode } from '@/types/tmdb'
import { posterUrl, backdropUrl, profileUrl, getTrailerKey, getTitle, getReleaseYear } from '@/lib/tmdb'
import VideoPlayer from './VideoPlayer'

type MediaType = 'movie' | 'tv'
type Tab = 'overview' | 'episodes' | 'cast' | 'more'

interface DetailPageProps {
  item: Movie | TVShow
  type: MediaType
  videos: Video[]
  credits: Credits
  recommendations: (Movie | TVShow)[]
}

export default function DetailPage({ item, type, videos, credits, recommendations }: DetailPageProps) {
  const router = useRouter()
  const movie = type === 'movie' ? (item as Movie) : null
  const show  = type === 'tv'    ? (item as TVShow) : null

  const [scrollY, setScrollY]         = useState(0)
  const [selectedSeason, setSeason]   = useState(1)
  const [selectedEpisode, setEpisode] = useState(1)
  const [episodes, setEpisodes]       = useState<Episode[]>([])
  const [epLoading, setEpLoading]     = useState(false)

  const [playing, setPlaying]   = useState(false)
  const [playMode, setPlayMode] = useState<'trailer' | 'stream'>('stream')
  const [activeTab, setActiveTab] = useState<Tab>(type === 'tv' ? 'episodes' : 'overview')
  // Same stale-state fix as DetailModal — see playTarget comment there.
  const playTarget = useRef<{ season: number; episode: number }>({ season: 1, episode: 1 })

  const [filmography, setFilmography]     = useState<Movie[] | null>(null)
  const [filmographyLoading, setFilmLoading] = useState(false)

  const trailerKey = getTrailerKey(videos)
  const cast       = credits.cast?.slice(0, 12) ?? []
  const director   = credits.crew?.find(c => c.job === 'Director' || c.job === 'Creator')
  const genres     = item.genres ?? []
  const runtime    = movie?.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : null
  const seasons    = show?.number_of_seasons

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  const trackPlay = useCallback((season?: number, episode?: number) => {
    window.dispatchEvent(new CustomEvent('track-watch', {
      detail: {
        id: item.id, type,
        title: getTitle(item),
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        rating: item.vote_average,
        season, episode,
      }
    }))
  }, [item, type])

  const loadFilmography = useCallback(async () => {
    if (!director || filmography || filmographyLoading) return
    setFilmLoading(true)
    try {
      const res  = await fetch(`/api/tmdb?path=/person/${director.id}/movie_credits`)
      const data = await res.json()
      const films: Movie[] = (data.crew ?? [])
        .filter((c: Movie & { job: string }) => c.job === 'Director' && c.poster_path && c.id !== item.id)
        .sort((a: Movie, b: Movie) => (b.release_date ?? '').localeCompare(a.release_date ?? ''))
        .slice(0, 12)
      setFilmography(films)
    } catch {}
    finally { setFilmLoading(false) }
  }, [director, filmography, filmographyLoading, item.id])

  const parallaxY  = Math.min(scrollY * 0.35, 100)
  const backdropOp = Math.max(1 - scrollY / 500, 0.2)

  const nav = (id: number, t: MediaType) => {
    window.location.href = `/${t}/${id}`
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* ── Full-width backdrop ── */}
      <div className="relative h-[58vh] min-h-[400px] max-h-[640px] overflow-hidden">
        <div
          className="absolute inset-0 will-change-transform"
          style={{ transform: `translateY(${parallaxY}px) scale(1.1)`, opacity: backdropOp }}
        >
          {item.backdrop_path ? (
            <Image
              src={backdropUrl(item.backdrop_path, 'original')}
              alt={getTitle(item)}
              fill sizes="100vw"
              priority
              className="object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-[#161616]" />
          )}
        </div>
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.1) 80%, transparent 100%)' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.8) 0%, transparent 55%)' }}
        />

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="absolute top-20 left-6 md:left-12 z-10 flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/70 transition-colors">
            <ArrowLeft size={14} />
          </div>
          <span className="hidden sm:inline text-xs">Back</span>
        </button>
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 -mt-36 md:-mt-44 px-6 md:px-12 lg:px-16 pb-0">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">

          {/* Poster */}
          <div className="relative w-36 sm:w-44 md:w-52 aspect-[2/3] rounded-xl overflow-hidden flex-shrink-0 border border-white/08 shadow-2xl mx-auto md:mx-0"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }}
          >
            <Image
              src={posterUrl(item.poster_path, 'w500')}
              alt={getTitle(item)}
              fill sizes="(max-width:768px) 144px, 208px"
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0 md:pt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                {type === 'tv' ? 'Series' : 'Film'}
              </span>
              {getReleaseYear(item) && (
                <span className="text-[10px] text-white/20">· {getReleaseYear(item)}</span>
              )}
            </div>

            <h1 className="font-archivo font-black text-[clamp(1.75rem,5vw,3rem)] leading-[0.95] mb-3">
              {getTitle(item)}
            </h1>

            {item.tagline && (
              <p className="text-white/35 text-sm italic mb-4">{item.tagline}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-5 text-[13px] text-white/40">
              {runtime && <span>{runtime}</span>}
              {seasons && <span>{seasons} Season{seasons > 1 ? 's' : ''}</span>}
              {item.vote_average > 0 && (
                <span className="flex items-center gap-1 text-amber-400/80">
                  <Star size={11} fill="currentColor" />
                  <span className="font-medium">{item.vote_average.toFixed(1)}</span>
                  <span className="text-white/25 text-[12px]">({item.vote_count?.toLocaleString()})</span>
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2.5 mb-5">
              <button
                onClick={() => {
                  playTarget.current = { season: selectedSeason, episode: selectedEpisode }
                  setPlayMode('stream'); setPlaying(true)
                  trackPlay(selectedSeason, selectedEpisode)
                }}
                className="flex items-center gap-2 bg-white text-black font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-100 shadow-lg"
              >
                <Play size={14} fill="currentColor" /> Play
              </button>
              {trailerKey && (
                <button
                  onClick={() => { setPlayMode('trailer'); setPlaying(true) }}
                  className="flex items-center gap-2 border border-white/15 text-white/65 hover:text-white hover:border-white/30 font-medium text-sm px-6 py-2.5 rounded-lg transition-all"
                >
                  Trailer
                </button>
              )}
            </div>

            {/* Genres */}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.map(g => (
                  <a
                    key={g.id}
                    href={`/genre/${encodeURIComponent(g.name.toLowerCase().replace(/\s+/g, '-'))}`}
                    className="text-white/40 hover:text-white/70 text-[11px] px-2.5 py-1 rounded-full bg-white/04 border border-white/08 hover:border-white/15 transition-all"
                  >
                    {g.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-0 mt-10 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {([
            ...(type === 'tv' ? [{ id: 'episodes' as Tab, label: 'Episodes' }] : []),
            { id: 'overview' as Tab, label: 'Overview' },
            { id: 'cast' as Tab, label: 'Cast' },
            ...(recommendations.length > 0 ? [{ id: 'more' as Tab, label: 'More' }] : []),
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3 text-[13px] font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-white' : 'text-white/35 hover:text-white/60'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-gen1-red rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="pt-8 pb-16">

          {activeTab === 'overview' && (
            <div className="max-w-2xl space-y-5">
              {item.overview && (
                <p className="text-white/60 text-[14px] leading-relaxed">{item.overview}</p>
              )}
              <div className="space-y-2.5">
                {director && (
                  <div className="flex gap-4 text-[12px]">
                    <span className="text-white/25 w-20 flex-shrink-0 uppercase tracking-wide pt-px">
                      {type === 'tv' ? 'Creator' : 'Director'}
                    </span>
                    <button
                      onClick={() => { setActiveTab('more'); loadFilmography() }}
                      className="text-white/70 hover:text-gen1-red transition-colors font-medium text-left"
                    >
                      {director.name}
                    </button>
                  </div>
                )}
                {credits.cast?.slice(0, 8) && (
                  <div className="flex gap-4 text-[12px]">
                    <span className="text-white/25 w-20 flex-shrink-0 uppercase tracking-wide pt-px">Cast</span>
                    <span className="text-white/50">{credits.cast.slice(0, 6).map(c => c.name).join(', ')}</span>
                  </div>
                )}
                {movie && ((movie.budget ?? 0) > 0 || (movie.revenue ?? 0) > 0) && (
                  <div className="flex gap-4 text-[12px]">
                    <span className="text-white/25 w-20 flex-shrink-0 uppercase tracking-wide pt-px">Box office</span>
                    <span className="text-white/45">
                      {(movie.budget ?? 0) > 0 && `$${(movie.budget! / 1e6).toFixed(0)}M budget`}
                      {(movie.budget ?? 0) > 0 && (movie.revenue ?? 0) > 0 && ' · '}
                      {(movie.revenue ?? 0) > 0 && `$${(movie.revenue! / 1e6).toFixed(0)}M gross`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'episodes' && show && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <select
                    value={selectedSeason}
                    onChange={e => {
                      const s = Number(e.target.value)
                      setSeason(s); setEpisode(1)
                      playTarget.current = { season: s, episode: 1 }
                    }}
                    className="appearance-none bg-white/05 border border-white/10 text-white/70 text-[13px] px-4 py-2 pr-8 rounded-lg cursor-pointer focus:outline-none focus:border-white/20 hover:bg-white/08 transition-colors"
                  >
                    {Array.from({ length: show.number_of_seasons ?? 1 }, (_, i) => i + 1).map(s => (
                      <option key={s} value={s} className="bg-[#0A0A0A]">Season {s}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                </div>
                <button
                  onClick={() => {
                    playTarget.current = { season: selectedSeason, episode: selectedEpisode }
                    setPlayMode('stream'); setPlaying(true)
                    trackPlay(selectedSeason, selectedEpisode)
                  }}
                  className="flex items-center gap-1.5 bg-gen1-red hover:bg-red-500 text-white font-semibold text-[13px] px-4 py-2 rounded-lg transition-all"
                >
                  <Play size={12} fill="currentColor" /> Play S{selectedSeason} E{selectedEpisode}
                </button>
              </div>

              {epLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-video rounded-xl skeleton" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {episodes.map(ep => (
                    <button
                      key={ep.episode_number}
                      onClick={() => {
                        setEpisode(ep.episode_number)
                        playTarget.current = { season: selectedSeason, episode: ep.episode_number }
                        setPlayMode('stream'); setPlaying(true)
                        trackPlay(selectedSeason, ep.episode_number)
                      }}
                      className={`text-left rounded-xl overflow-hidden border transition-all ${
                        ep.episode_number === selectedEpisode
                          ? 'border-white/15 bg-white/04'
                          : 'border-white/05 hover:border-white/12 bg-white/02 hover:bg-white/04'
                      }`}
                    >
                      <div className="relative aspect-video bg-[#181818]">
                        {ep.still_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w300${ep.still_path}`}
                            alt={ep.name || `Episode ${ep.episode_number}`}
                            fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/10">
                            <Film size={20} />
                          </div>
                        )}
                        <div className={`absolute top-2 left-2 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                          ep.episode_number === selectedEpisode ? 'bg-gen1-red text-white' : 'bg-black/70 text-white/50'
                        }`}>
                          {ep.episode_number}
                        </div>
                        <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={20} fill="white" className="text-white" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-white/80 text-[13px] font-medium truncate mb-0.5">
                          {ep.name || `Episode ${ep.episode_number}`}
                        </p>
                        <div className="flex gap-2 text-white/30 text-[11px] mb-1.5">
                          {ep.runtime && <span>{ep.runtime}m</span>}
                          {ep.vote_average > 0 && <span>★ {ep.vote_average.toFixed(1)}</span>}
                        </div>
                        {ep.overview && (
                          <p className="text-white/35 text-[11px] leading-relaxed line-clamp-2">{ep.overview}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cast' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cast.map(member => (
                <div key={member.id} className="text-center group/cast">
                  <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden mb-2 bg-[#1a1a1a] border border-white/06 group-hover/cast:border-white/15 transition-colors">
                    {member.profile_path ? (
                      <Image
                        src={profileUrl(member.profile_path)}
                        alt={member.name}
                        fill sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-lg font-archivo font-black">
                        {member.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-white/75 text-[12px] font-medium truncate">{member.name}</p>
                  <p className="text-white/35 text-[11px] truncate">{member.character}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'more' && (
            <div className="space-y-10">
              {director && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-4">
                    More by {director.name}
                  </p>
                  {filmographyLoading ? (
                    <div className="flex gap-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-28 h-[168px] rounded-xl skeleton" />
                      ))}
                    </div>
                  ) : filmography && filmography.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                      {filmography.map(film => (
                        <button key={film.id} onClick={() => nav(film.id, 'movie')} className="flex-shrink-0 w-28 group/film text-left">
                          <div className="relative w-28 h-[168px] rounded-xl overflow-hidden mb-1.5 border border-white/05 group-hover/film:border-white/15 transition-all">
                            <Image src={posterUrl(film.poster_path)} alt={film.title} fill sizes="112px" className="object-cover group-hover/film:scale-105 transition-transform duration-300" />
                          </div>
                          <p className="text-white/55 text-[11px] font-medium truncate group-hover/film:text-white/85 transition-colors">{film.title}</p>
                          <p className="text-white/25 text-[10px]">{getReleaseYear(film)}</p>
                        </button>
                      ))}
                    </div>
                  ) : !filmography ? (
                    <button
                      onClick={loadFilmography}
                      className="text-white/40 hover:text-white text-[13px] border border-white/08 hover:border-white/20 rounded-lg px-4 py-2 transition-all"
                    >
                      Show filmography
                    </button>
                  ) : null}
                </div>
              )}

              {recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/25 mb-4">More Like This</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {recommendations.map(rec => (
                      <button key={rec.id} onClick={() => nav(rec.id, 'title' in rec ? 'movie' : 'tv')} className="group/rec text-left">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-1.5 border border-white/05 group-hover/rec:border-white/15 transition-all">
                          <Image
                            src={posterUrl(rec.poster_path)}
                            alt={getTitle(rec)}
                            fill sizes="(max-width:640px) 33vw, (max-width:1024px) 25vw, 16vw"
                            className="object-cover group-hover/rec:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/rec:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={16} fill="white" className="text-white" />
                          </div>
                        </div>
                        <p className="text-white/55 text-[11px] font-medium truncate group-hover/rec:text-white/85 transition-colors">
                          {getTitle(rec)}
                        </p>
                        <p className="text-white/25 text-[10px]">★ {rec.vote_average?.toFixed(1)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {playing && (
        <VideoPlayer
          movieId={item.id}
          movieTitle={getTitle(item)}
          trailerKey={playMode === 'trailer' ? trailerKey : null}
          mode={playMode}
          mediaType={type}
          season={playTarget.current.season}
          episode={playTarget.current.episode}
          onClose={() => setPlaying(false)}
        />
      )}
    </div>
  )
}
