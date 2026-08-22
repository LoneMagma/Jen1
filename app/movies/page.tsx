// app/movies/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GlassHeader from '@/components/GlassHeader'
import MoviesGrid from '@/components/MoviesGrid'

export const metadata: Metadata = {
  title: 'Movies',
  description: 'Browse popular movies, sorted by what people are watching.',
}

export default function MoviesPage() {
  return (
    <main className="min-h-screen bg-jen1-black">
      <GlassHeader />
      <div className="pt-28 pb-24 px-8 md:px-14 lg:px-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-white/35 hover:text-white text-sm transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Home
        </Link>
        <h1 className="font-archivo font-black text-display-hero mb-8">
          Movies
        </h1>
        <MoviesGrid />
      </div>
    </main>
  )
}
