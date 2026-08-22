'use client'
// components/GenrePage.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { ArrowLeft, Play, SlidersHorizontal } from 'lucide-react'
import type { Movie } from '@/types/tmdb'

type SortOption = 'popularity.desc' | 'vote_average.desc' | 'release_date.desc' | 'revenue.desc'

interface GenrePageProps {
  genreId: number | null
  genreName: string
  slug: string
}

const SORT_LABELS: Record<SortOption, string> = {
  'popularity.desc':   'Most Popular',
  'vote_average.desc': 'Highest Rated',
  'release_date.desc': 'Newest First',
  'revenue.desc':      'Box Office',
}

export default function GenrePage({ genreId, genreName, slug }: GenrePageProps) {
  const [movies, setMovies] = useState<Movie[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [sort, setSort] = useState<SortOption>('popularity.desc')
  const [minRating, setMinRating] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(async (pageNum: number, sortBy: SortOption, rating: number, reset = false) => {
    if (!genreId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        path: '/discover/movie',
        with_genres: String(genreId),
        sort_by: sortBy,
        page: String(pageNum),
        'vote_count.gte': '50',
        ...(rating > 0 ? { 'vote_average.gte': String(rating) } : {}),
      })
      const res = await fetch(`/api/tmdb?${params}`)
      const data = await res.json()
      const results: Movie[] = (data.results ?? []).filter((m: Movie) => m.poster_path)
      if (reset) {
        setMovies(results)
      } else {
        setMovies(prev => {
          const ids = new Set(prev.map(m => m.id))
          return [...prev, ...results.filter(m => !ids.has(m.id))]
        })
      }
      setHasMore(pageNum < (data.total_pages ?? 1) && pageNum < 20)
      setPage(pageNum)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [genreId])

  // Initial load
  useEffect(() => {
    setInitialLoading(true)
    setMovies([])
    setPage(1)
    setHasMore(true)
    fetchPage(1, sort, minRating, true)
  }, [sort, minRating, fetchPage])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!hasMore || loading) return
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchPage(page + 1, sort, minRating)
    }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, page, sort, minRating, fetchPage])

  const openModal = (id: number) =>
    window.dispatchEvent(new CustomEvent('open-movie', { detail: { id, type: 'movie' } }))

  return (
    <div className="min-h-screen bg-jen1-black pt-20 pb-24 px-8 md:px-14 lg:px-20">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-white/35 hover:text-white text-sm transition-colors mb-4"
          >
            <ArrowLeft size={14} /> Home
          </a>
          <h1 className="font-archivo font-black text-display-hero">
            {genreName}
          </h1>
          {movies.length > 0 && !initialLoading && (
            <p className="text-white/30 text-sm mt-2">
              Showing {movies.length} titles
            </p>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-all mt-10 ${
            showFilters || minRating > 0
              ? 'bg-jen1-red/15 border-jen1-red/30 text-jen1-red'
              : 'bg-white/06 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
          }`}
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[#141414] border border-white/08 rounded-2xl p-5 mb-8 flex flex-wrap gap-6">
          {/* Sort */}
          <div>
            <div className="text-white/30 text-xs uppercase tracking-wider mb-3">Sort By</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setSort(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    sort === opt
                      ? 'bg-jen1-red text-white'
                      : 'bg-white/06 text-white/50 hover:text-white hover:bg-white/12 border border-white/08'
                  }`}
                >
                  {SORT_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>

          {/* Min rating */}
          <div>
            <div className="text-white/30 text-xs uppercase tracking-wider mb-3">
              Min Rating {minRating > 0 ? <span className="text-jen1-red">★ {minRating}+</span> : ''}
            </div>
            <div className="flex gap-2">
              {[0, 6, 7, 7.5, 8].map(r => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    minRating === r
                      ? 'bg-jen1-red text-white'
                      : 'bg-white/06 text-white/50 hover:text-white hover:bg-white/12 border border-white/08'
                  }`}
                >
                  {r === 0 ? 'Any' : `★ ${r}+`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {initialLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 21 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl skeleton" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map(movie => (
              <GenreCard key={movie.id} movie={movie} onOpen={openModal} />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={loaderRef} className="mt-8 flex justify-center">
            {loading && (
              <div className="flex items-center gap-2 text-white/30 text-sm">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                Loading more
              </div>
            )}
            {!hasMore && movies.length > 0 && (
              <p className="text-white/20 text-sm">You've reached the end</p>
            )}
          </div>
        </>
      )}

      {!initialLoading && movies.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-white/40 text-lg mb-2">No titles found</p>
          <p className="text-white/20 text-sm">Try adjusting the filters</p>
        </div>
      )}
    </div>
  )
}

function GenreCard({ movie, onOpen }: { movie: Movie; onOpen: (id: number) => void }) {
  const imgSrc = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
    : `https://image.tmdb.org/t/p/w342${movie.poster_path}`

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer"
      onClick={() => onOpen(movie.id)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpen(movie.id)}
      aria-label={movie.title}
    >
      <Image
        src={imgSrc}
        alt={movie.title}
        fill
        sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 20vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        loading="lazy"
      />
      {/* Permanent bottom gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.93) 0%, rgba(10,10,10,0.25) 45%, transparent 70%)' }}
      />
      {/* Hover deepen */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.1) 100%)' }}
      />
      {/* Ring */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-white/[0.07] group-hover:ring-jen1-red/35 transition-all duration-300 pointer-events-none z-10" />
      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="font-archivo font-bold text-[13px] leading-tight text-white truncate mb-0.5">{movie.title}</div>
        <div className="text-white/40 text-[11px]">
          {movie.release_date?.slice(0, 4)}{movie.vote_average ? ` · ★ ${movie.vote_average.toFixed(1)}` : ''}
        </div>
      </div>
      {/* Play on hover */}
      <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-200 shadow-lg">
          <Play size={14} fill="#0A0A0A" className="ml-0.5" />
        </div>
      </div>
    </div>
  )
}
