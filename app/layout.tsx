// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Archivo, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import StructuredData from '@/components/StructuredData'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Display + mono pair for the glass header/search system. Plus Jakarta Sans
// stands in for Geist Sans (the real Geist package isn't a dependency here),
// JetBrains Mono for Geist Mono on badges/labels.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
})

const jbMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
  weight: ['400', '500', '600'],
})

// Archivo is a variable font with a real width axis (62–125) — used here at
// an expanded width for display type (logo, hero, row headers). Replaces
// Bebas Neue: Bebas is condensed/all-caps-only with a single weight, which
// can't carry a hero title or logo wordmark with any real presence. Archivo
// gives a full weight range (100–900) at an expanded width, so the whole
// display type system — from a row label up to the hero — comes from one
// family instead of stitching faces together.
const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  weight: ['600', '700', '800', '900'],
})

const SITE_URL = 'https://jen1.vercel.app'
const SITE_NAME = 'Gen1'
const DESCRIPTION = 'Discover and stream movies and series — a cinematic experience built for the discerning viewer.'

export const viewport: Viewport = {
  themeColor: '#E50914',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} (Trust Me Bro)`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'movies', 'streaming', 'watch online', 'series', 'films',
    'cinema', 'trailers', 'Gen1', 'movie discovery', 'free streaming',
  ],
  authors: [{ name: 'Gen1' }],
  creator: 'Gen1',
  publisher: 'Gen1',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  icons: {
    icon: [
      { url: '/favicon.ico',      sizes: 'any',             type: 'image/x-icon' },
      { url: '/favicon-16.png',   sizes: '16x16',           type: 'image/png' },
      { url: '/favicon-32.png',   sizes: '32x32',           type: 'image/png' },
      { url: '/gen1-icon-512.png', sizes: '512x512',        type: 'image/png' },
      { url: '/gen1-logo.svg',    type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} (Trust Me Bro)`,
    description: DESCRIPTION,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Gen1 (Trust Me Bro)',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} (Trust Me Bro)`,
    description: DESCRIPTION,
    images: ['/og-image.png'],
    creator: '@jen1app',
  },
  alternates: {
    canonical: SITE_URL,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${archivo.variable} ${jakarta.variable} ${jbMono.variable}`}>
      <body className="relative bg-gen1-black text-white font-inter antialiased">
        {/* Ambient glow layer — sits behind everything, fixed, non-interactive */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[560px] w-[560px] rounded-full bg-glow-indigo/20 blur-[120px]" />
          <div className="absolute -bottom-40 -right-20 h-[560px] w-[560px] rounded-full bg-glow-cyan/15 blur-[120px]" />
        </div>
        <div className="relative z-10">
          <Providers>{children}</Providers>
        </div>
        <StructuredData />
      </body>
    </html>
  )
}
