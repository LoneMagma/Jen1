'use client'
// components/SearchResults.tsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Search, Play, X } from 'lucide-react'
import type { Movie, TVShow } from '@/types/tmdb'
import { posterUrl, getTitle, getReleaseYear } from '@/lib/tmdb'
import { useSearchHistory } from '@/hooks/useSearchHistory'

interface SearchResultsProps {
  query: string
}

const PAGE_SIZE = 20

export default function SearchResults({ query }: SearchResultsProps) {
  const router = useRouter()
  const [inputValue, setInputValue] = useState(query)
  const [movies, setMovies] = useState<Movie[]>([])
  const [shows, setShows] = useState<TVShow[]>([])
  const [moviePage, setMoviePage] = useState(1)
  const [tvPage, setTvPage] = useState(1)
  const [movieHasMore, setMovieHasMore] = useState(true)
  const [tvHasMore, setTvHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const movieLoaderRef = useRef<HTMLDivElement>(null)
  const tvLoaderRef = useRef<HTMLDivElement>(null)
  const { history, addQuery, removeQuery } = useSearchHistory()

  // Record the query into history once it actually lands here from the URL
  // (covers all entry points: navbar search, this page's own form, a
  // shared/bookmarked /search?q= link).
  useEffect(() => {
    if (query.trim()) addQuery(query)
  }, [query, addQuery])

  // Reset and reload whenever the query (from the URL) changes
  useEffect(() => {
    setInputValue(query)
    if (!query.trim()) {
      setMovies([]); setShows([]); setMovieHasMore(false); setTvHasMore(false)
      return
    }
    setLoading(true)
    setMoviePage(1); setTvPage(1)
    Promise.all([
      fetch(`/api/tmdb?path=/search/movie&query=${encodeURIComponent(query)}&include_adult=false&page=1`).then(r => r.json()),
      fetch(`/api/tmdb?path=/search/tv&query=${encodeURIComponent(query)}&include_adult=false&page=1`).then(r => r.json()),
    ]).then(([m, t]) => {
      const movieResults = (m.results ?? []).filter((x: Movie) => x.poster_path)
      const tvResults = (t.results ?? []).filter((x: TVShow) => x.poster_path)
      setMovies(movieResults)
      setShows(tvResults)
      setMovieHasMore(1 < (m.total_pages ?? 1))
      setTvHasMore(1 < (t.total_pages ?? 1))
    }).finally(() => setLoading(false))
  }, [query])

  const loadMoreMovies = useCallback(async () => {
    if (!movieHasMore || loading) return
    const next = moviePage + 1
    const res = await fetch(`/api/tmdb?path=/search/movie&query=${encodeURIComponent(query)}&include_adult=false&page=${next}`)
    const data = await res.json()
    const results = (data.results ?? []).filter((x: Movie) => x.poster_path)
    setMovies(prev => [...prev, ...results])
    setMoviePage(next)
    setMovieHasMore(next < (data.total_pages ?? 1))
  }, [movieHasMore, loading, moviePage, query])

  const loadMoreTV = useCallback(async () => {
    if (!tvHasMore || loading) return
    const next = tvPage + 1
    const res = await fetch(`/api/tmdb?path=/search/tv&query=${encodeURIComponent(query)}&include_adult=false&page=${next}`)
    const data = await res.json()
    const results = (data.results ?? []).filter((x: TVShow) => x.poster_path)
    setShows(prev => [...prev, ...results])
    setTvPage(next)
    setTvHasMore(next < (data.total_pages ?? 1))
  }, [tvHasMore, loading, tvPage, query])

  useEffect(() => {
    const el = movieLoaderRef.current
    if (!el || !movieHasMore) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMoreMovies() }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [movieHasMore, loadMoreMovies])

  useEffect(() => {
    const el = tvLoaderRef.current
    if (!el || !tvHasMore) return
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMoreTV() }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [tvHasMore, loadMoreTV])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
  }

  const openModal = (id: number, type: 'movie' | 'tv') =>
    window.dispatchEvent(new CustomEvent('open-movie', { detail: { id, type } }))

  const hasQuery = query.trim().length > 0
  const noResults = hasQuery && !loading && movies.length === 0 && shows.length === 0

  return (
    <div className="pt-20 pb-24 px-8 md:px-14 lg:px-20">
      <form onSubmit={handleSubmit} className="max-w-xl mb-8">
        <div className="flex items-center gap-2 px-4 rounded-xl border bg-white/06 border-white/10 focus-within:border-white/25 transition-all">
          <Search size={15} className="text-white/35 flex-shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search movies and shows…"
            className="flex-1 bg-transparent outline-none text-white text-base py-3 placeholder:text-white/25"
            autoFocus
          />
        </div>
      </form>

      {!hasQuery && (
        <div>
          <p className="text-white/30 text-sm mb-4">Type a title above and press Enter.</p>
          {history.length > 0 && (
            <div>
              <p className="text-white/25 text-xs uppercase tracking-widest mb-3">Recent searches</p>
              <div className="flex flex-wrap gap-2">
                {history.map(q => (
                  <div key={q} className="group/chip flex items-center gap-1.5 bg-white/06 border border-white/10 rounded-full pl-3 pr-2 py-1.5">
                    <button
                      onClick={() => router.push(`/search?q=${encodeURIComponent(q)}`)}
                      className="text-white/60 hover:text-white text-xs transition-colors"
                    >
                      {q}
                    </button>
                    <button
                      onClick={() => removeQuery(q)}
                      className="text-white/20 hover:text-white/60 transition-colors opacity-0 group-hover/chip:opacity-100"
                      aria-label="Remove from history"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 14 }).map((_, i) => <div key={i} className="aspect-video rounded-xl skeleton" />)}
        </div>
      )}

      {noResults && (
        <div className="py-16 text-center">
          <p className="text-white/40 text-lg mb-1">No results for "{query}"</p>
          <p className="text-white/20 text-sm">Try a different title or spelling</p>
        </div>
      )}

      {!loading && movies.length > 0 && (
        <section className="mb-12">
          <h2 className="font-archivo font-extrabold text-display-md mb-4">Movies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {movies.map(m => (
              <SearchCard key={m.id} item={m} type="movie" onOpen={() => openModal(m.id, 'movie')} />
            ))}
          </div>
          {movieHasMore && <div ref={movieLoaderRef} className="h-4 mt-4" />}
        </section>
      )}

      {!loading && shows.length > 0 && (
        <section>
          <h2 className="font-archivo font-extrabold text-display-md mb-4">TV Shows</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {shows.map(s => (
              <SearchCard key={s.id} item={s} type="tv" onOpen={() => openModal(s.id, 'tv')} />
            ))}
          </div>
          {tvHasMore && <div ref={tvLoaderRef} className="h-4 mt-4" />}
        </section>
      )}
    </div>
  )
}

function SearchCard({ item, type, onOpen }: { item: Movie | TVShow; type: 'movie' | 'tv'; onOpen: () => void }) {
  const title  = getTitle(item)
  const imgSrc = item.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
    : posterUrl(item.poster_path)

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpen()}
      aria-label={title}
    >
      <Image
        src={imgSrc}
        alt={title}
        fill
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        loading="lazy"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.93) 0%, rgba(10,10,10,0.25) 45%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.1) 100%)' }}
      />
      <div className="absolute inset-0 rounded-xl ring-1 ring-white/[0.07] group-hover:ring-jen1-red/35 transition-all duration-300 pointer-events-none z-10" />
      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[3px] rounded bg-black/55 text-white/60 backdrop-blur-sm border border-white/08 z-10">
        {type === 'tv' ? 'Series' : 'Film'}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="font-archivo font-bold text-[13px] leading-tight text-white truncate mb-0.5">{title}</div>
        <div className="text-white/40 text-[11px]">
          {getReleaseYear(item)}{item.vote_average ? ` · ★ ${item.vote_average.toFixed(1)}` : ''}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-200 shadow-lg">
          <Play size={14} fill="#0A0A0A" className="ml-0.5" />
        </div>
      </div>
    </div>
  )
}
