// app/tv/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import GlassHeader from '@/components/GlassHeader'
import TVGrid from '@/components/TVGrid'

export const metadata: Metadata = {
  title: 'TV Shows',
  description: 'Browse popular TV series, sorted by what people are watching.',
}

export default function TVPage() {
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
          TV Shows
        </h1>
        <TVGrid />
      </div>
    </main>
  )
}
