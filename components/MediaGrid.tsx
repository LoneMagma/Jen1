'use client'
// components/MediaGrid.tsx
// A generalized version of GenrePage's grid for listings that mix movies
// and TV (trending, search results) rather than a single genre's movies.
// GenrePage itself is left as-is — it's movie-only by design today and
// isn't part of this phase's scope — but this shares the same visual
// language (card hover, infinite scroll, skeleton states).

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { Movie, TVShow } from '@/types/tmdb'
import { posterUrl, backdropUrl, getTitle, getReleaseYear } from '@/lib/tmdb'

type MediaItem = (Movie & { _type: 'movie' }) | (TVShow & { _type: 'tv' })

interface MediaGridProps {
  // Fetches one page of mixed results. Returning fewer than `pageSize`
  // items (or an empty array) signals the end of the list.
  fetchPage: (page: number) => Promise<MediaItem[]>
  emptyMessage?: string
  pageSize?: number
}

export default function MediaGrid({ fetchPage, emptyMessage = 'No titles found', pageSize = 20 }: MediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const loaderRef = useRef<HTMLDivElement>(null)
  const fetchPageRef = useRef(fetchPage)
  fetchPageRef.current = fetchPage

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const results = await fetchPageRef.current(pageNum)
      setItems(prev => {
        if (pageNum === 1) return results
        const ids = new Set(prev.map(i => `${i._type}-${i.id}`))
        return [...prev, ...results.filter(r => !ids.has(`${r._type}-${r.id}`))]
      })
      setHasMore(results.length >= pageSize && pageNum < 20)
      setPage(pageNum)
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [pageSize])

  // Reset and reload whenever the fetch source changes (e.g. a new search query)
  useEffect(() => {
    setInitialLoading(true)
    setItems([])
    setHasMore(true)
    loadPage(1)
    // fetchPage is intentionally excluded — callers pass a new function
    // identity on every render; fetchPageRef above tracks the latest one
    // without retriggering this effect. Re-running on every render would
    // restart the list mid-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!hasMore || loading) return
    const el = loaderRef.current
    if (!el) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadPage(page + 1)
    }, { rootMargin: '300px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loading, page, loadPage])

  const openModal = (item: MediaItem) =>
    window.dispatchEvent(new CustomEvent('open-movie', { detail: { id: item.id, type: item._type } }))

  if (initialLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-video rounded-xl skeleton" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-white/40 text-lg mb-2">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3.5">
        {items.map(item => (
          <MediaGridCard key={`${item._type}-${item.id}`} item={item} onOpen={openModal} />
        ))}
      </div>
      <div ref={loaderRef} className="mt-8 flex justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-white/30 text-sm">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            Loading more
          </div>
        )}
        {!hasMore && items.length > 0 && (
          <p className="text-white/20 text-sm">You've reached the end</p>
        )}
      </div>
    </>
  )
}

function MediaGridCard({ item, onOpen }: { item: MediaItem; onOpen: (item: MediaItem) => void }) {
  const title   = getTitle(item)
  const imgSrc  = item.backdrop_path ? backdropUrl(item.backdrop_path) : posterUrl(item.poster_path)
  const rating  = item.vote_average
  const year    = getReleaseYear(item)

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden cursor-pointer"
      onClick={() => onOpen(item)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onOpen(item)}
      aria-label={title}
    >
      <Image
        src={imgSrc}
        alt={title}
        fill
        sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 20vw"
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
        style={{ background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0.5) 50%, rgba(10,10,10,0.15) 100%)' }}
      />

      {/* Ring */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-white/[0.07] group-hover:ring-jen1-red/35 transition-all duration-300 pointer-events-none z-10" />

      {/* Type badge */}
      <div className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-[3px] rounded bg-black/55 text-white/60 backdrop-blur-sm border border-white/08 z-10">
        {item._type === 'tv' ? 'Series' : 'Film'}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="font-archivo font-bold text-[13px] leading-tight text-white truncate mb-0.5">{title}</div>
        <div className="text-white/40 text-[11px]">
          {year}{rating ? ` · ★ ${rating.toFixed(1)}` : ''}
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
