'use client'
// components/AIDisclosureDialog.tsx
//
// The "AI & Ownership" disclosure — a small glass card, opened from the
// footer, laying out plainly what was AI-assisted, what data/streams this
// site pulls from third parties, and what Jen1 does and doesn't own.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

export default function AIDisclosureDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900/70 p-7 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/8 hover:text-white"
            >
              <X size={15} />
            </button>

            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-glow-indigo/30 to-glow-cyan/20 text-glow-cyan shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]">
              <Sparkles size={16} />
            </span>

            <h2 className="mt-4 font-display text-xl font-bold text-white">
              AI & Ownership
            </h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-white/35">
              A plain account, not a legal disclaimer
            </p>

            <div className="mt-5 space-y-5 text-sm leading-relaxed text-white/60">
              <section>
                <h3 className="text-white/85 font-semibold mb-1.5">How this was built</h3>
                <p>
                  Jen1 is an independent, one-person project. Large parts of the code —
                  components, styling, bug fixes, this dialog included — were written
                  with the help of Claude (Anthropic). Nothing here pretends otherwise;
                  the developer directs and reviews the work, but AI assistance is a
                  real part of the process, not an edge case.
                </p>
              </section>

              <section>
                <h3 className="text-white/85 font-semibold mb-1.5">What Jen1 doesn't own</h3>
                <p>
                  Jen1 doesn't host any video files. Streams are loaded from third-party
                  embed providers (Videasy, VidLink, Embed.su) inside an iframe — Jen1
                  has no control over their servers, ads, or availability, and no stake
                  in the content itself. Movie and show data, posters, and metadata come
                  from{' '}
                  <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">
                    TMDB
                  </a>
                  . All rights to the titles listed belong to their original owners.
                </p>
              </section>

              <section>
                <h3 className="text-white/85 font-semibold mb-1.5">Data</h3>
                <p>
                  Watch history and "Continue Watching" live only in your browser's
                  local storage — nothing is sent to a server or tracked behind the
                  scenes. There's no account system and nothing here is sold.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
