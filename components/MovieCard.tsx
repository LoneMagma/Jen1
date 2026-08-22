'use client'
// components/MovieCard.tsx
// Premium card. Cinematic backdrop, poster thumbnail on hover,
// smooth layered transitions. Nothing gimmicky.

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import type { Movie, TVShow } from '@/types/tmdb'
import { backdropUrl, posterUrl, getTitle, getReleaseYear } from '@/lib/tmdb'
import { prefetchModalData } from '@/lib/modalCache'

interface MovieCardProps {
  item: Movie | TVShow
  mediaType: 'movie' | 'tv'
  rank?: number
}

const PREFETCH_DELAY_MS = 280

function isNew(item: Movie | TVShow): boolean {
  const d = 'release_date' in item ? item.release_date : item.first_air_date
  if (!d) return false
  const days = (Date.now() - new Date(d).getTime()) / 86_400_000
  return days >= 0 && days <= 30
}

export default function MovieCard({ item, mediaType, rank }: MovieCardProps) {
  const timerRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [hovered, setHovered] = useState(false)

  const title   = getTitle(item)
  const year    = getReleaseYear(item)
  const rating  = item.vote_average
  const imgSrc  = item.backdrop_path ? backdropUrl(item.backdrop_path) : posterUrl(item.poster_path)
  const isTop10 = typeof rank === 'number' && rank <= 10
  const _isNew  = isNew(item)

  const open = () =>
    window.dispatchEvent(new CustomEvent('open-movie', { detail: { id: item.id, type: mediaType } }))

  const enter = () => {
    setHovered(true)
    timerRef.current = setTimeout(() => prefetchModalData(item.id, mediaType), PREFETCH_DELAY_MS)
  }
  const leave = () => {
    setHovered(false)
    clearTimeout(timerRef.current)
  }

  return (
    <div
      className="jen1-card group relative flex-shrink-0 cursor-pointer"
      style={{ width: 'var(--card-w, 320px)', height: 'var(--card-h, 180px)' }}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && open()}
      aria-label={title}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 rounded-xl overflow-hidden">
        <Image
          src={imgSrc}
          alt={title}
          fill
          className="object-cover will-change-transform transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          sizes="(max-width: 768px) 240px, 320px"
          loading="lazy"
        />
      </div>

      {/* Base gradient — always present, so text reads at rest */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(to top, rgba(8,8,8,0.95) 0%, rgba(8,8,8,0.4) 35%, transparent 65%)' }}
      />

      {/* Hover gradient — deepens and rises */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-[2] transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: 'linear-gradient(to top, rgba(8,8,8,1) 0%, rgba(8,8,8,0.7) 45%, rgba(8,8,8,0.15) 80%, transparent 100%)',
        }}
      />

      {/* Subtle inner border */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-[3] transition-all duration-300"
        style={{
          boxShadow: hovered
            ? 'inset 0 0 0 1px rgba(229,9,20,0.3), 0 20px 60px rgba(0,0,0,0.6)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.07)',
        }}
      />

      {/* Top-left: rank */}
      {isTop10 && (
        <div className="absolute top-0 left-3 z-[4] select-none pointer-events-none">
          <span
            className="font-archivo font-black leading-none tracking-tighter"
            style={{
              fontSize: '52px',
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.1) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              WebkitTextStroke: '1.5px rgba(255,255,255,0.5)',
              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.9))',
            }}
          >
            {rank}
          </span>
        </div>
      )}

      {/* Top-right badges */}
      <div className="absolute top-2.5 right-2.5 z-[4] flex flex-col items-end gap-1">
        {_isNew && (
          <span className="bg-jen1-red text-white text-[9px] font-bold uppercase tracking-wider px-2 py-[3px] rounded-full">
            New
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 z-[4]">
        {/* Poster thumbnail — appears on hover, slides in */}
        <div
          className="absolute bottom-3 right-3 w-9 h-[54px] rounded-md overflow-hidden border border-white/15 shadow-xl transition-all duration-300"
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0) scale(1)' : 'translateY(4px) scale(0.95)',
          }}
        >
          <Image
            src={posterUrl(item.poster_path)}
            alt=""
            fill
            className="object-cover"
            sizes="36px"
            loading="lazy"
          />
        </div>

        <div style={{ paddingRight: hovered ? '52px' : '0', transition: 'padding 0.3s ease' }}>
          <p className="font-archivo font-bold text-[13px] leading-tight text-white truncate mb-1">
            {title}
          </p>
          <div className="flex items-center gap-2">
            {year && <span className="text-white/40 text-[11px]">{year}</span>}
            {mediaType === 'tv' && (
              <span className="text-white/25 text-[10px] uppercase tracking-wide">Series</span>
            )}
            {rating >= 7 && (
              <span className="text-amber-400/70 text-[11px] font-medium ml-auto">
                ★ {rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Play button — center, only on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center z-[4] pointer-events-none transition-all duration-200"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        <div
          className="w-11 h-11 rounded-full border-2 border-white/90 flex items-center justify-center transition-transform duration-200"
          style={{ transform: hovered ? 'scale(1)' : 'scale(0.8)' }}
        >
          <Play size={15} fill="white" className="ml-0.5 text-white" />
        </div>
      </div>
    </div>
  )
}
