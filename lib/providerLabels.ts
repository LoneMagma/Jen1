// lib/providerLabels.ts
//
// Human-readable labels for streaming providers, keyed by hostname.
// Not currently imported anywhere — VideoPlayer.tsx's error-state
// server switcher builds its labels directly from each Provider's id
// (see the `.charAt(0).toUpperCase() + p.id.slice(1)` line there).
// Kept for a future source-picker UI that wants a real label instead
// of a capitalized id string. Update this list if PROVIDERS in
// VideoPlayer.tsx changes — the two aren't wired together, so nothing
// enforces they stay in sync automatically.

const PROVIDER_LABELS: Record<string, string> = {
  'vidcore.org': 'VidCore',
  'vidsrc2.ru': 'VidSrc',
  'vidsrc.ir': 'VidSrc',
  'vidsrcme.ru': 'VidSrc',
  'vidsrcme.su': 'VidSrc',
  'vidsrc-me.ru': 'VidSrc',
  'vidsrc-me.su': 'VidSrc',
  'vidsrc-embed.ru': 'VidSrc',
  'vidsrc-embed.su': 'VidSrc',
  'vsrc.su': 'VidSrc',
  'vidlink.pro': 'VidLink',
}

export function labelForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    return PROVIDER_LABELS[host] ?? host
  } catch {
    return 'Server'
  }
}
