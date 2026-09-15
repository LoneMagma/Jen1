// lib/providerHealth.ts
//
// Tracks which streaming providers have been working vs. failing, so
// VideoPlayer can start with the provider most likely to succeed
// instead of always trying the same one first regardless of its
// recent track record.
//
// Deliberately simple: a rolling success/failure count per provider,
// persisted to localStorage, decayed over time so a provider that had
// a bad night two weeks ago isn't punished forever. No new UI — this
// only changes which provider VideoPlayer tries first and how quickly
// it gives up on one, both of which were already implicit behavior
// (index 0, fixed 20s stall timeout) that this makes adaptive instead.

const STORAGE_KEY = 'jen1_provider_health'
const DECAY_HALF_LIFE_MS = 1000 * 60 * 60 * 24 * 7 // 1 week

interface ProviderStats {
  successes: number
  failures: number
  lastOutcomeAt: number
  consecutiveFailures: number
}

type HealthStore = Record<string, ProviderStats>

function loadStore(): HealthStore {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStore(store: HealthStore) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage full or disabled — health tracking degrades to
    // "always try providers in their default order", which is still
    // correct, just not adaptive. Not worth surfacing to the user.
  }
}

/**
 * Applies exponential decay to a stat so old outcomes matter less
 * than recent ones, without needing a rolling time window that would
 * require pruning individual events.
 */
function decayedWeight(stat: ProviderStats): number {
  const ageMs = Date.now() - stat.lastOutcomeAt
  const decay = Math.pow(0.5, ageMs / DECAY_HALF_LIFE_MS)
  return decay
}

/**
 * Score is successes-minus-failures, decayed by recency, with a
 * heavier penalty for *consecutive* recent failures — a provider
 * that just failed twice in a row is more likely to be down right
 * now than one with an old failure buried in a long success streak.
 */
function score(stat: ProviderStats | undefined): number {
  if (!stat) return 0 // unknown provider — neutral, tried in default order
  const weight = decayedWeight(stat)
  const base = (stat.successes - stat.failures) * weight
  const consecutivePenalty = stat.consecutiveFailures * 2
  return base - consecutivePenalty
}

export function recordOutcome(providerId: string, succeeded: boolean) {
  const store = loadStore()
  const existing = store[providerId] ?? {
    successes: 0, failures: 0, lastOutcomeAt: 0, consecutiveFailures: 0,
  }

  store[providerId] = {
    successes: existing.successes + (succeeded ? 1 : 0),
    failures: existing.failures + (succeeded ? 0 : 1),
    lastOutcomeAt: Date.now(),
    consecutiveFailures: succeeded ? 0 : existing.consecutiveFailures + 1,
  }

  saveStore(store)
}

/**
 * Returns provider IDs ordered best-first. Providers with no history
 * keep their original relative order (stable sort), so a brand-new
 * provider list still tries in the order it was written, not
 * randomly — history only reorders providers once it exists.
 */
export function orderByHealth(providerIds: string[]): string[] {
  const store = loadStore()
  return [...providerIds]
    .map((id, originalIndex) => ({ id, originalIndex, s: score(store[id]) }))
    .sort((a, b) => {
      if (b.s !== a.s) return b.s - a.s
      return a.originalIndex - b.originalIndex // stable tiebreak
    })
    .map(x => x.id)
}

/**
 * A provider with 3+ consecutive recent failures is skipped entirely
 * for this attempt rather than retried — but only if at least one
 * other provider is healthy, so we never end up with zero options.
 */
export function isProbablyDown(providerId: string): boolean {
  const store = loadStore()
  const stat = store[providerId]
  if (!stat) return false
  const recentlyFailed = Date.now() - stat.lastOutcomeAt < 1000 * 60 * 30 // 30 min
  return recentlyFailed && stat.consecutiveFailures >= 3
}
