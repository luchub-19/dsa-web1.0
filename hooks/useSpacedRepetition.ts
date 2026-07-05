'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
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
import { useAuth } from './useAuth';
import { deleteAllCards, deleteCard, fetchAllCards, upsertCards } from '../lib/supabase/sm2Sync';
import type {
  SM2CardRecord,
  SM2Grade,
  SM2Store,
  UseSpacedRepetitionReturn,
} from '../types/spacedRepetition';

// ─── Reducer ──────────────────────────────────────────────────────────────────

interface HookState {
  store: SM2Store;
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- cố ý destructure để loại bỏ key khỏi object
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
 * FIX / NÂNG CẤP (backend đồng bộ — xem phần 2 trong yêu cầu nâng cấp):
 *
 * TRƯỚC: chỉ đọc/ghi localStorage. Đổi máy/trình duyệt = mất hết tiến độ,
 * không có khái niệm "tài khoản".
 *
 * SAU: vẫn giữ NGUYÊN API công khai (UseSpacedRepetitionReturn) — mọi trang
 * đang gọi hook này (dashboard, learn, review) KHÔNG CẦN SỬA GÌ. Bên trong:
 *
 *  - Chưa đăng nhập: hành vi y hệt bản gốc — chỉ đọc/ghi localStorage.
 *  - Đã đăng nhập: khi mount, tải toàn bộ thẻ từ Supabase; nếu có dữ liệu
 *    "khách" trong localStorage chưa từng đồng bộ (học trước khi đăng nhập),
 *    tự động upload 1 lần rồi dùng Supabase làm nguồn dữ liệu chính từ đó.
 *    Mọi thay đổi sau đó (recordReview/seedChunks/resetCard/resetAll) vừa
 *    cập nhật local (để UI phản hồi tức thì) vừa ghi lên Supabase ở nền
 *    (fire-and-forget, fail-soft — lỗi mạng không chặn trải nghiệm học).
 *  - localStorage LUÔN được ghi cache dù đã đăng nhập hay chưa, để mở app
 *    lần sau (kể cả mất mạng) vẫn có dữ liệu gần nhất ngay lập tức trong
 *    lúc chờ Supabase phản hồi.
 */
export function useSpacedRepetition(): UseSpacedRepetitionReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(reducer, {
    store: makeEmptyStore(),
    isLoading: true,
  } satisfies HookState);

  // userId hiện tại, dùng trong các callback không muốn đổi identity mỗi render
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  // ── Hydrate: từ Supabase nếu đã đăng nhập, ngược lại từ localStorage ────────
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    async function hydrate() {
      if (user) {
        const remoteCards = await fetchAllCards(user.id);
        if (cancelled) return;

        // Merge dữ liệu "khách" (học trước khi đăng nhập) chưa từng đồng bộ
        const localStore = loadStore();
        const toUpload: SM2CardRecord[] = [];
        if (localStore) {
          for (const [id, card] of Object.entries(localStore.cards)) {
            if (!remoteCards[id]) {
              remoteCards[id] = card;
              toUpload.push(card);
            }
          }
        }
        if (toUpload.length > 0) {
          await upsertCards(toUpload, user.id);
        }

        if (!cancelled) {
          dispatch({
            type: 'HYDRATE',
            store: { schema_version: 1, cards: remoteCards, last_updated: new Date().toISOString() },
          });
        }
      } else {
        const stored = loadStore();
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', store: stored ?? makeEmptyStore() });
        }
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // ── Cache localStorage luôn luôn (kể cả khi đã đăng nhập) ───────────────────
  useEffect(() => {
    if (state.isLoading) return;
    saveStore(state.store);
  }, [state.store, state.isLoading]);

  // ── Memoised derived values ──────────────────────────────────────────────────

  const today = useMemo(() => todayISO(), []);

  const dueToday = useMemo(
    () => getDueChunkIds(state.store.cards, today),
    [state.store.cards, today]
  );

  // ── Actions: cập nhật local ngay + đồng bộ Supabase ở nền (fire-and-forget) ─

  const recordReview = useCallback((chunkId: string, grade: SM2Grade) => {
    const dateISO = todayISO();
    dispatch({ type: 'RECORD_REVIEW', chunkId, grade, dateISO });

    const uid = userIdRef.current;
    if (uid) {
      // Tính lại giá trị mới để gửi lên Supabase (reducer chạy bất đồng bộ với
      // closure này, nên tính applyReview() độc lập ở đây thay vì đọc state cũ).
      const existing = state.store.cards[chunkId] ?? makeNewCard(chunkId, dateISO);
      const updated = applyReview(existing, grade, dateISO);
      void upsertCards([updated], uid);
    }
  }, [state.store.cards]);

  const seedChunks = useCallback((chunkIds: string[]) => {
    const nowISO = new Date().toISOString();
    dispatch({ type: 'SEED_CHUNKS', chunkIds, nowISO });

    const uid = userIdRef.current;
    if (uid) {
      const newCards = chunkIds
        .filter((id) => !state.store.cards[id])
        .map((id) => makeNewCard(id, nowISO));
      if (newCards.length > 0) void upsertCards(newCards, uid);
    }
  }, [state.store.cards]);

  const resetCard = useCallback((chunkId: string) => {
    dispatch({ type: 'RESET_CARD', chunkId });
    const uid = userIdRef.current;
    if (uid) void deleteCard(chunkId, uid);
  }, []);

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET_ALL' });
    const uid = userIdRef.current;
    if (uid) void deleteAllCards(uid);
  }, []);

  const getCard = useCallback(
    (chunkId: string): SM2CardRecord | null => state.store.cards[chunkId] ?? null,
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
    isLoading: state.isLoading || authLoading,
  };
}
