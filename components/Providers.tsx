'use client'
// components/Providers.tsx
import DetailModal from './DetailModal'
import KeyboardHelp from './KeyboardHelp'
import WatchTracker from './WatchTracker'
import Footer from './Footer'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
      <DetailModal />
      <KeyboardHelp />
      <WatchTracker />
    </>
  )
}
