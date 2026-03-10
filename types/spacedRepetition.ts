'use strict';

// ─── SM-2 Grade (0–5 scale, Wozniak definition) ───────────────────────────────

/**
 * SM-2 quality grade given by the user after reviewing a card.
 *
 *  5 – perfect response
 *  4 – correct response after a hesitation
 *  3 – correct response recalled with serious difficulty
 *  2 – incorrect response; but upon seeing correct answer it seemed easy
 *  1 – incorrect response; correct answer seemed difficult
 *  0 – complete blackout
 *
 * Grades 0–2 trigger an immediate reset of the learning sequence.
 */
export type SM2Grade = 0 | 1 | 2 | 3 | 4 | 5;

// ─── Per-card SM-2 memory record ──────────────────────────────────────────────

/**
 * Everything SM-2 needs to compute the next review for one chunk.
 */
export interface SM2CardRecord {
  /** Chunk / problem ID — primary key */
  chunk_id: string;

  /**
   * E-Factor (Ease Factor).
   * Starts at 2.5, floats in [1.3, ∞).
   * Higher = easier card = longer intervals.
   */
  ease_factor: number;

  /**
   * Inter-repetition interval in whole days.
   * 0 means "review today / same session".
   */
  interval_days: number;

  /**
   * Number of consecutive successful reviews (grade ≥ 3).
   * Resets to 0 on any failing grade (< 3).
   */
  repetition_count: number;

  /**
   * ISO-8601 date string (YYYY-MM-DD) of the next scheduled review.
   * null = card has never been reviewed → always due.
   */
  next_review_date: string | null;

  /**
   * ISO-8601 date string of the last review.
   * Used for audit / debugging only.
   */
  last_review_date: string | null;

  /**
   * Running history of grades, newest last.
   * Capped at GRADE_HISTORY_LIMIT to avoid unbounded growth.
   */
  grade_history: SM2Grade[];

  /**
   * Total number of times this card has been reviewed (never resets).
   */
  total_reviews: number;

  /**
   * ISO-8601 datetime when this record was first created.
   */
  created_at: string;
}

// ─── Store shape (serialised to localStorage) ─────────────────────────────────

export interface SM2Store {
  /** Schema version — bump when the shape changes to enable migrations. */
  schema_version: 1;
  /** Map from chunk_id → SM2CardRecord */
  cards: Record<string, SM2CardRecord>;
  /** ISO-8601 datetime of last write */
  last_updated: string;
}

// ─── Hook return value ────────────────────────────────────────────────────────

export interface UseSpacedRepetitionReturn {
  /**
   * chunk_ids due for review today (next_review_date ≤ today or never reviewed).
   * Sorted: never-reviewed first, then by next_review_date ascending.
   */
  dueToday: string[];

  /**
   * All card records, keyed by chunk_id.
   * Useful for debug views, progress dashboards, etc.
   */
  allCards: Record<string, SM2CardRecord>;

  /**
   * Record a review for `chunkId` with quality `grade`.
   * Mutates localStorage and updates React state synchronously.
   */
  recordReview: (chunkId: string, grade: SM2Grade) => void;

  /**
   * Bulk-seed new chunk IDs (e.g. after a lesson is completed for the first time).
   * Ignores IDs that already have a record.
   */
  seedChunks: (chunkIds: string[]) => void;

  /**
   * Wipe all data for a given chunk (e.g. if the underlying material changes).
   */
  resetCard: (chunkId: string) => void;

  /**
   * Wipe the entire store. Useful for "start over" flows.
   */
  resetAll: () => void;

  /**
   * Returns stats for a single card, or null if unknown.
   */
  getCard: (chunkId: string) => SM2CardRecord | null;

  /**
   * True while the store is being read from localStorage on first render.
   */
  isLoading: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum allowed ease factor. SM-2 spec: 1.3 */
export const EF_MIN = 1.3;

/** Default starting ease factor. SM-2 spec: 2.5 */
export const EF_DEFAULT = 2.5;

/** Max entries kept in grade_history per card. */
export const GRADE_HISTORY_LIMIT = 50;

/** localStorage key for the SM2 store. */
export const STORAGE_KEY = 'dsa_sm2_store_v1';
