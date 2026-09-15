'use client'
// components/SearchOverlay.tsx
//
// A detached search experience — not an inline dropdown hanging off a
// small header input, but its own centered overlay: a large input, a
// proper results grid with posters big enough to actually recognize a
// title by, and recent searches as tappable chips when it's empty.
// Opens from the header's search trigger or the 's' / '/' shortcut,
// closes on Escape, backdrop click, or picking a result.

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import type { Movie, TVShow } from '@/types/tmdb'
import { posterUrl, getTitle, getReleaseYear } from '@/lib/tmdb'
import { useSearchHistory } from '@/hooks/useSearchHistory'

type ResultItem = (Movie & { _type: 'movie' }) | (TVShow & { _type: 'tv' })

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const { history, addQuery, removeQuery } = useSearchHistory()

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
      setResults([])
      setActiveIdx(-1)
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const [moviesRes, showsRes] = await Promise.all([
        fetch(`/api/tmdb?path=/search/movie&query=${encodeURIComponent(q)}&include_adult=false`).then(r => r.json()),
        fetch(`/api/tmdb?path=/search/tv&query=${encodeURIComponent(q)}&include_adult=false`).then(r => r.json()),
      ])
      const movies: ResultItem[] = (moviesRes.results ?? []).filter((m: Movie) => m.poster_path).map((m: Movie) => ({ ...m, _type: 'movie' as const }))
      const shows: ResultItem[] = (showsRes.results ?? []).filter((s: TVShow) => s.poster_path).map((s: TVShow) => ({ ...s, _type: 'tv' as const }))
      const combined = [...movies, ...shows].sort((a, b) => b.popularity - a.popularity).slice(0, 12)
      setResults(combined)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val); setActiveIdx(-1)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 280)
  }

  const useHistoryEntry = (q: string) => {
    setQuery(q); setActiveIdx(-1)
    search(q)
  }

  const openItem = (item: ResultItem) => {
    if (query.trim()) addQuery(query)
    onClose()
    window.dispatchEvent(new CustomEvent('open-movie', { detail: { id: item.id, type: item._type } }))
  }

  const goToSearchPage = (q: string = query) => {
    if (!q.trim()) return
    addQuery(q)
    onClose()
    router.push(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && results[activeIdx]) openItem(results[activeIdx])
      else goToSearchPage()
    }
  }

  const showHistory = !query.trim() && history.length > 0
  const showEmpty = !query.trim() && history.length === 0

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl max-h-[72vh] flex flex-col rounded-2xl border border-white/10 bg-zinc-900/70 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.08)] overflow-hidden"
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/08 flex-shrink-0">
              <Search size={18} className="text-white/40 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search movies and shows…"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent outline-none text-white text-base placeholder:text-white/30"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }} className="text-white/30 hover:text-white transition-colors flex-shrink-0">
                  <X size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className="hidden sm:flex flex-shrink-0 items-center gap-1 text-[10px] font-mono text-white/30 border border-white/10 rounded px-1.5 py-0.5 hover:text-white/60 hover:border-white/20 transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-gen1-red/40 border-t-gen1-red rounded-full animate-spin" />
                </div>
              )}

              {showHistory && !loading && (
                <div>
                  <div className="flex items-center gap-1.5 text-white/35 text-[11px] uppercase tracking-wide mb-3">
                    <Clock size={11} /> Recent searches
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {history.map(q => (
                      <div key={q} className="group/hist flex items-center gap-1.5 rounded-full border border-white/10 bg-white/05 pl-3 pr-1.5 py-1.5">
                        <button onClick={() => useHistoryEntry(q)} className="text-white/65 text-xs hover:text-white transition-colors">
                          {q}
                        </button>
                        <button
                          onClick={() => removeQuery(q)}
                          aria-label="Remove"
                          className="text-white/20 hover:text-white/60 transition-colors rounded-full p-0.5"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showEmpty && !loading && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <TrendingUp size={20} className="text-white/20 mb-2" />
                  <p className="text-white/35 text-sm">Search for a title, actor, or show</p>
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {results.map((item, i) => (
                    <button
                      key={`${item._type}-${item.id}`}
                      onClick={() => openItem(item)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`group/res flex gap-3 items-start text-left rounded-xl p-2 transition-colors ${
                        i === activeIdx ? 'bg-white/08' : 'hover:bg-white/05'
                      }`}
                    >
                      <div className="relative w-12 h-[72px] rounded-lg overflow-hidden flex-shrink-0 bg-white/05">
                        <Image src={posterUrl(item.poster_path, 'w342')} alt={getTitle(item as Movie | TVShow)} fill className="object-cover" />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <div className="text-white/90 text-[13px] font-medium leading-tight line-clamp-2">
                          {getTitle(item as Movie | TVShow)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            item._type === 'tv' ? 'bg-blue-500/15 text-blue-400' : 'bg-gen1-red/15 text-gen1-red'
                          }`}>
                            {item._type === 'tv' ? 'Series' : 'Film'}
                          </span>
                          <span className="text-white/35 text-[11px]">{getReleaseYear(item as Movie | TVShow)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="py-10 text-center text-white/30 text-sm">No results for "{query}"</div>
              )}
            </div>

            {/* Footer — see-all fallback, always available once there's a query */}
            {query.trim() && (
              <button
                onClick={() => goToSearchPage()}
                className="flex items-center justify-center gap-1.5 border-t border-white/08 py-3 text-white/50 hover:text-white hover:bg-white/03 text-xs font-medium transition-colors flex-shrink-0"
              >
                See all results for "{query}" <ArrowRight size={12} />
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
