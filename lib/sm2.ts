'use strict';

import type { SM2CardRecord, SM2Grade, SM2Store } from '../types/spacedRepetition';
import {
  EF_DEFAULT,
  EF_MIN,
  GRADE_HISTORY_LIMIT,
  STORAGE_KEY,
} from '../types/spacedRepetition';

// ─── Date helpers (no external deps) ─────────────────────────────────────────

/**
 * Returns today's date as "YYYY-MM-DD" in the LOCAL timezone.
 * Never uses UTC — SM-2 intervals are calendar days from the user's POV.
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Adds `days` calendar days to the ISO date string `isoDate`.
 * Pure — does not depend on "now".
 */
export function addDays(isoDate: string, days: number): string {
  // Parse as local midnight to avoid DST jumps shifting the date
  const [y, mo, d] = isoDate.split('-').map(Number);
  const date = new Date(y, mo - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/**
 * Returns true if `isoDate` is today or in the past (i.e. the card is due).
 */
export function isDueOnOrBefore(isoDate: string | null, today: string): boolean {
  if (isoDate === null) return true; // never reviewed → always due
  return isoDate <= today;           // lexicographic comparison works for ISO dates
}

// ─── SM-2 Core Algorithm ──────────────────────────────────────────────────────

/**
 * Applies one SM-2 review to an existing card record.
 *
 * SuperMemo-2 rules (Wozniak, 1987):
 *
 *   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *   EF' = max(EF', 1.3)
 *
 *   if q < 3:
 *     repetition = 0          (reset — review again soon)
 *     interval   = 1
 *   else:
 *     if repetition == 0:  interval = 1
 *     if repetition == 1:  interval = 6
 *     else:                interval = round(prev_interval * EF')
 *     repetition += 1
 *
 * Returns a **new** record — never mutates the input.
 */
export function applyReview(
  card: SM2CardRecord,
  grade: SM2Grade,
  reviewDateISO: string
): SM2CardRecord {
  // ── 1. Compute new ease factor ───────────────────────────────
  const rawEF =
    card.ease_factor +
    (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  const newEF = Math.max(EF_MIN, rawEF);

  // ── 2. Compute new interval and repetition count ─────────────
  let newInterval: number;
  let newRepetition: number;

  if (grade < 3) {
    // Failing grade: reset to beginning of learning sequence
    newRepetition = 0;
    newInterval = 1;
  } else {
    // Passing grade: advance the sequence
    if (card.repetition_count === 0) {
      newInterval = 1;
    } else if (card.repetition_count === 1) {
      newInterval = 6;
    } else {
      // Use the current interval (before this review) multiplied by new EF
      newInterval = Math.round(card.interval_days * newEF);
    }
    newRepetition = card.repetition_count + 1;
  }

  // ── 3. Compute next review date ──────────────────────────────
  const nextReview = addDays(reviewDateISO, newInterval);

  // ── 4. Update grade history (capped) ─────────────────────────
  const newHistory: SM2Grade[] = [
    ...card.grade_history.slice(-(GRADE_HISTORY_LIMIT - 1)),
    grade,
  ];

  return {
    ...card,
    ease_factor: newEF,
    interval_days: newInterval,
    repetition_count: newRepetition,
    next_review_date: nextReview,
    last_review_date: reviewDateISO,
    grade_history: newHistory,
    total_reviews: card.total_reviews + 1,
  };
}

/**
 * Creates a brand-new card record for `chunkId`.
 * No reviews have been recorded; the card is immediately due.
 */
export function makeNewCard(chunkId: string, nowISO: string): SM2CardRecord {
  return {
    chunk_id: chunkId,
    ease_factor: EF_DEFAULT,
    interval_days: 0,
    repetition_count: 0,
    next_review_date: null, // null = always due until first review
    last_review_date: null,
    grade_history: [],
    total_reviews: 0,
    created_at: nowISO,
  };
}

// ─── "Due today" query ────────────────────────────────────────────────────────

/**
 * Returns chunk_ids whose next_review_date is today or earlier,
 * sorted: never-reviewed cards first, then by ascending next_review_date.
 */
export function getDueChunkIds(
  cards: Record<string, SM2CardRecord>,
  today: string
): string[] {
  return Object.values(cards)
    .filter((c) => isDueOnOrBefore(c.next_review_date, today))
    .sort((a, b) => {
      // null (never reviewed) sorts before dated cards
      if (a.next_review_date === null && b.next_review_date === null) return 0;
      if (a.next_review_date === null) return -1;
      if (b.next_review_date === null) return 1;
      return a.next_review_date.localeCompare(b.next_review_date);
    })
    .map((c) => c.chunk_id);
}

// ─── localStorage persistence ─────────────────────────────────────────────────

/**
 * Reads the SM2Store from localStorage.
 * Returns null if the key is absent or the data is unparseable.
 */
export function loadStore(): SM2Store | null {
  if (typeof window === 'undefined') return null; // SSR guard
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SM2Store;
    // Basic schema guard
    if (parsed.schema_version !== 1 || typeof parsed.cards !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Writes the SM2Store to localStorage.
 * Silently swallows QuotaExceededError — data loss here is acceptable
 * (cards will just become "new" again on next load).
 */
export function saveStore(store: SM2Store): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // QuotaExceededError — ignore
  }
}

/**
 * Builds a fresh empty store.
 */
export function makeEmptyStore(): SM2Store {
  return {
    schema_version: 1,
    cards: {},
    last_updated: new Date().toISOString(),
  };
}

/**
 * Returns a new store snapshot with the given cards map and updated timestamp.
 * Pure — never mutates the input.
 */
export function withCards(
  store: SM2Store,
  cards: Record<string, SM2CardRecord>
): SM2Store {
  return { ...store, cards, last_updated: new Date().toISOString() };
}
