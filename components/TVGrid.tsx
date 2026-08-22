'use client'
// components/TVGrid.tsx
// TV-only listing for /tv — infinite-scroll grid sourced from
// /discover/tv sorted by popularity.

import { useCallback } from 'react'
import type { TVShow } from '@/types/tmdb'
import MediaGrid from './MediaGrid'

type MediaItem = TVShow & { _type: 'tv' }

export default function TVGrid() {
  const fetchPage = useCallback(async (page: number): Promise<MediaItem[]> => {
    const res = await fetch(
      `/api/tmdb?path=/discover/tv&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
    ).then(r => r.json())
    return (res.results ?? [])
      .filter((s: TVShow) => s.poster_path)
      .map((s: TVShow) => ({ ...s, _type: 'tv' as const }))
  }, [])

  return <MediaGrid fetchPage={fetchPage} pageSize={20} emptyMessage="No series found" />
}
