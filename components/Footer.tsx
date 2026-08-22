'use client'
// components/Footer.tsx
import { useState } from 'react'
import AIDisclosureDialog from './AIDisclosureDialog'

export default function Footer() {
  const [disclosureOpen, setDisclosureOpen] = useState(false)

  return (
    <footer className="px-8 md:px-14 lg:px-20 py-10 mt-16 border-t border-white/[0.05]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">

        {/* Left */}
        <div className="max-w-sm">
          <p className="font-archivo font-black text-white/50 text-sm mb-2 tracking-tight">Jen1</p>
          <p className="text-white/25 text-[11px] leading-relaxed">
            Doesn't host anything. All streams are from third-party providers.
            Rights concern?{' '}
            <a href="mailto:devlonemagma@gmail.com" className="text-white/45 hover:text-white underline underline-offset-2 transition-colors">
              Get in touch.
            </a>
            {' '}Built with Claude, Next.js, and TMDB.
          </p>
        </div>

        {/* Right */}
        <div className="flex items-center gap-5 text-[11px] text-white/20 flex-shrink-0">
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="hover:text-white/45 transition-colors">TMDB</a>
          <a href="https://videasy.net" target="_blank" rel="noopener noreferrer" className="hover:text-white/45 transition-colors">Videasy</a>
          <button
            onClick={() => setDisclosureOpen(true)}
            className="hover:text-white/45 transition-colors"
          >
            AI & Ownership
          </button>
          <a
            href="https://pacify.site"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/45 transition-colors font-medium"
          >
            A Pacify project
          </a>
        </div>
      </div>

      <AIDisclosureDialog open={disclosureOpen} onClose={() => setDisclosureOpen(false)} />
    </footer>
  )
}
