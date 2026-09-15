'use client'
// components/GlassHeader.tsx
//
// Floating pill glass navbar. Search is deliberately NOT embedded inline
// here — it's a detached trigger that opens SearchOverlay, a proper full
// search surface with a real results grid and recent-search history,
// rather than a cramped dropdown hanging off a small header input.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Bell } from 'lucide-react'
import SearchOverlay from './SearchOverlay'
import { useKeyboard } from '@/hooks/useKeyboard'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Movies', href: '/movies' },
  { label: 'TV', href: '/tv' },
  { label: 'Trending', href: '/trending' },
]

export default function GlassHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24)
    handler()
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Same 's' / '/' shortcut the old inline search used, now opens the
  // detached overlay instead of focusing an input in place.
  useKeyboard({
    's': () => setSearchOpen(true),
    'S': () => setSearchOpen(true),
    '/': () => setSearchOpen(true),
    'Escape': () => searchOpen && setSearchOpen(false),
  }, { enabled: true })

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
      >
        <nav
          className={`flex w-full max-w-5xl items-center gap-3 rounded-full border border-white/10 bg-zinc-900/40 px-3 py-2 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.1)] transition-colors duration-300 ${
            scrolled ? 'bg-zinc-900/60' : ''
          }`}
        >
          <Link href="/" className="flex-shrink-0 select-none pl-2" aria-label="Gen1 home">
            <Image src="/gen1-logo.svg" alt="Gen1" width={72} height={72} priority className="h-7 w-auto object-contain" />
          </Link>

          <ul className="hidden md:flex items-center gap-1 font-display text-sm font-medium text-white/60 flex-shrink-0">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-full px-3.5 py-1.5 transition-all duration-300 hover:bg-white/8 hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Detached search trigger — a button, not an input. Opens the
              full search overlay instead of expanding in place. */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 min-w-0 max-w-xs mx-auto rounded-full border border-white/08 bg-white/05 px-3.5 py-1.5 text-white/40 hover:text-white/70 hover:bg-white/08 hover:border-white/15 transition-all duration-200"
          >
            <Search size={14} className="flex-shrink-0" />
            <span className="text-sm truncate">Search titles…</span>
            <span className="hidden sm:inline-flex ml-auto text-[10px] font-mono text-white/25 border border-white/10 rounded px-1.5 py-0.5 flex-shrink-0">
              S
            </span>
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-all duration-300 hover:bg-white/8 hover:text-white flex-shrink-0"
          >
            <Bell size={16} />
          </motion.button>
        </nav>
      </motion.header>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
