'use client'
// components/MoviesGrid.tsx
// Movie-only listing for /movies — infinite-scroll grid sourced from
// /discover/movie sorted by popularity.

import { useCallback } from 'react'
import type { Movie } from '@/types/tmdb'
import MediaGrid from './MediaGrid'

type MediaItem = Movie & { _type: 'movie' }

export default function MoviesGrid() {
  const fetchPage = useCallback(async (page: number): Promise<MediaItem[]> => {
    const res = await fetch(
      `/api/tmdb?path=/discover/movie&sort_by=popularity.desc&vote_count.gte=100&page=${page}`
    ).then(r => r.json())
    return (res.results ?? [])
      .filter((m: Movie) => m.poster_path)
      .map((m: Movie) => ({ ...m, _type: 'movie' as const }))
  }, [])

  return <MediaGrid fetchPage={fetchPage} pageSize={20} emptyMessage="No movies found" />
}
