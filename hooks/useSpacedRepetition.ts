'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import {
  applyReview,
  getDueChunkIds,
  loadStore,
  makeEmptyStore,
  makeNewCard,
  saveStore,
  todayISO,
  withCards,
} from '../lib/sm2';
import type {
  SM2CardRecord,
  SM2Grade,
  SM2Store,
  UseSpacedRepetitionReturn,
} from '../types/spacedRepetition';

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface HookState {
  store: SM2Store;
  /** true during the first render while localStorage is being read */
  isLoading: boolean;
}

type HookAction =
  | { type: 'HYDRATE'; store: SM2Store }
  | { type: 'RECORD_REVIEW'; chunkId: string; grade: SM2Grade; dateISO: string }
  | { type: 'SEED_CHUNKS'; chunkIds: string[]; nowISO: string }
  | { type: 'RESET_CARD'; chunkId: string }
  | { type: 'RESET_ALL' };

function reducer(state: HookState, action: HookAction): HookState {
  switch (action.type) {

    case 'HYDRATE':
      return { store: action.store, isLoading: false };

    case 'RECORD_REVIEW': {
      const existing = state.store.cards[action.chunkId];
      // If the card doesn't exist yet, create it before applying the review
      const base: SM2CardRecord = existing ?? makeNewCard(action.chunkId, action.dateISO);
      const updated = applyReview(base, action.grade, action.dateISO);
      const newCards = { ...state.store.cards, [action.chunkId]: updated };
      return { ...state, store: withCards(state.store, newCards) };
    }

    case 'SEED_CHUNKS': {
      const newCards = { ...state.store.cards };
      let changed = false;
      for (const id of action.chunkIds) {
        if (!newCards[id]) {
          newCards[id] = makeNewCard(id, action.nowISO);
          changed = true;
        }
      }
      if (!changed) return state;
      return { ...state, store: withCards(state.store, newCards) };
    }

    case 'RESET_CARD': {
      const { [action.chunkId]: _removed, ...remaining } = state.store.cards;
      return { ...state, store: withCards(state.store, remaining) };
    }

    case 'RESET_ALL':
      return { store: makeEmptyStore(), isLoading: false };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useSpacedRepetition
 * ───────────────────
 * Manages a SuperMemo-2 spaced repetition schedule entirely in
 * React state + localStorage. Zero network calls, zero dependencies
 * beyond React itself.
 *
 * Usage:
 * ```tsx
 * const { dueToday, recordReview, seedChunks } = useSpacedRepetition();
 *
 * // After lesson is completed for the first time:
 * seedChunks(['LL-01', 'LL-02', 'LL-03', ...]);
 *
 * // After a whiteboard exam:
 * recordReview('LL-08', 4);  // grade 4 out of 5
 *
 * // Show today's review queue:
 * console.log(dueToday); // ['LL-03', 'LL-07', ...]
 * ```
 *
 * SM-2 Algorithm:
 *   EF' = EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02))
 *   EF' = max(1.3, EF')
 *
 *   grade < 3 → reset: repetition=0, interval=1 day
 *   grade ≥ 3 →
 *     rep 0 → interval 1 day
 *     rep 1 → interval 6 days
 *     rep n → interval = round(prev_interval × EF')
 */
export function useSpacedRepetition(): UseSpacedRepetitionReturn {
  const [state, dispatch] = useReducer(reducer, {
    store: makeEmptyStore(),
    isLoading: true,
  } satisfies HookState);

  // ── Hydrate from localStorage on mount (client only) ─────────
  useEffect(() => {
    const stored = loadStore();
    dispatch({
      type: 'HYDRATE',
      store: stored ?? makeEmptyStore(),
    });
  }, []);

  // ── Persist to localStorage on every store change ─────────────
  useEffect(() => {
    if (state.isLoading) return; // don't overwrite with empty store during hydration
    saveStore(state.store);
  }, [state.store, state.isLoading]);

  // ── Memoised derived values ───────────────────────────────────

  const today = useMemo(() => todayISO(), []); // stable for the lifetime of the render

  const dueToday = useMemo(
    () => getDueChunkIds(state.store.cards, today),
    [state.store.cards, today]
  );

  // ── Stable callback references ────────────────────────────────

  const recordReview = useCallback((chunkId: string, grade: SM2Grade) => {
    dispatch({
      type: 'RECORD_REVIEW',
      chunkId,
      grade,
      dateISO: todayISO(), // resolve at call-time, not render-time
    });
  }, []);

  const seedChunks = useCallback((chunkIds: string[]) => {
    dispatch({
      type: 'SEED_CHUNKS',
      chunkIds,
      nowISO: new Date().toISOString(),
    });
  }, []);

  const resetCard = useCallback((chunkId: string) => {
    dispatch({ type: 'RESET_CARD', chunkId });
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
  }, []);

  const getCard = useCallback(
    (chunkId: string): SM2CardRecord | null =>
      state.store.cards[chunkId] ?? null,
    [state.store.cards]
  );

  return {
    dueToday,
    allCards: state.store.cards,
    recordReview,
    seedChunks,
    resetCard,
    resetAll,
    getCard,
    isLoading: state.isLoading,
  };
}
