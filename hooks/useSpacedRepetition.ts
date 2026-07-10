'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  applyReview,
  getDueChunkIds,
  loadStore,
  makeNewCard,
  saveStore,
  todayISO,
} from '../lib/sm2';
import { useAuth } from './useAuth';
import { deleteAllCards, deleteCard, fetchAllCards, upsertCards } from '../lib/supabase/sm2Sync';
import type {
  SM2CardRecord,
  SM2Grade,
  SM2Store,
  UseSpacedRepetitionReturn,
} from '../types/spacedRepetition';

type CardsMap = Record<string, SM2CardRecord>;

/**
 * useSpacedRepetition — bản React Query
 * ──────────────────────────────────────
 * TRƯỚC (useReducer thủ công): mỗi recordReview() bắn NGAY 1 request
 * upsertCards riêng lẻ lên Supabase → mỗi lần chấm điểm 1 chunk = 1
 * round-trip mạng. Optimistic update tự chế bằng dispatch trước, không có
 * cơ chế nhất quán chuẩn với cache.
 *
 * SAU:
 *  - `cards` là 1 React Query, key = ['sm2Cards', userId | 'guest'].
 *  - Optimistic update CHUẨN qua queryClient.setQueryData ngay khi người
 *    dùng thao tác (UI phản hồi tức thì, 0ms chờ mạng).
 *  - Mọi thay đổi cần đồng bộ lên Supabase được gom vào 1 HÀNG ĐỢI
 *    (pendingRef) thay vì gọi lẻ tẻ. Hàng đợi được "xả" (flush) thành 1
 *    lệnh upsertCards() DUY NHẤT khi: (a) debounce 2s không có thao tác
 *    mới, (b) hàng đợi vượt BATCH_MAX_SIZE (tránh giữ quá nhiều thay đổi
 *    chưa lưu nếu người dùng chấm điểm liên tục), hoặc (c) tab bị ẩn / rời
 *    trang (tránh mất dữ liệu chưa flush).
 *  - API công khai (UseSpacedRepetitionReturn) giữ NGUYÊN — mọi trang gọi
 *    hook này không cần sửa gì.
 */

const BATCH_DEBOUNCE_MS = 2_000;
const BATCH_MAX_SIZE = 20;

function sm2QueryKey(userId: string | null) {
  return ['sm2Cards', userId ?? 'guest'] as const;
}

async function fetchCards(userId: string | null): Promise<CardsMap> {
  if (!userId) {
    return loadStore()?.cards ?? {};
  }

  const remote = await fetchAllCards(userId);

  // Merge dữ liệu "khách" (học trước khi đăng nhập) chưa từng đồng bộ.
  const localStore = loadStore();
  const toUpload: SM2CardRecord[] = [];
  if (localStore) {
    for (const [id, card] of Object.entries(localStore.cards)) {
      if (!remote[id]) {
        remote[id] = card;
        toUpload.push(card);
      }
    }
  }
  if (toUpload.length > 0) {
    await upsertCards(toUpload, userId);
  }
  return remote;
}

export function useSpacedRepetition(): UseSpacedRepetitionReturn {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => sm2QueryKey(userId), [userId]);

  const { data: cards, isPending } = useQuery({
    queryKey,
    enabled: !authLoading,
    queryFn: () => fetchCards(userId),
  });

  const cardsMap: CardsMap = useMemo(() => cards ?? {}, [cards]);
  // isPending vẫn true khi query bị `enabled: false` (chưa xong authLoading)
  // vì chưa từng có data — đúng ý nghĩa "đang tải" mà UI cũ mong đợi.
  const isLoading = authLoading || isPending;

  // ── Cache localStorage luôn luôn (kể cả khi đã đăng nhập) ───────────────
  useEffect(() => {
    if (isLoading) return;
    const store: SM2Store = {
      schema_version: 1,
      cards: cardsMap,
      last_updated: new Date().toISOString(),
    };
    saveStore(store);
  }, [cardsMap, isLoading]);

  // ── userId hiện tại, đọc trong callback không muốn tạo lại mỗi lần đổi user ──
  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // ── Hàng đợi ghi Supabase — gom nhóm (batch) + debounce ──────────────────
  const pendingRef = useRef<Map<string, SM2CardRecord>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushMutation = useMutation({
    mutationFn: async (payload: { cards: SM2CardRecord[]; uid: string }) => {
      await upsertCards(payload.cards, payload.uid);
    },
    // Fail-soft: lỗi mạng chỉ log (đã log sẵn trong upsertCards), không
    // rollback optimistic cache — dữ liệu vẫn đúng cục bộ, sẽ được thử ghi
    // lại ở lần flush kế tiếp nếu người dùng tiếp tục thao tác trên chunk đó.
  });
  const flushMutate = flushMutation.mutate;

  const flushNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const uid = userIdRef.current;
    if (!uid || pendingRef.current.size === 0) return;
    const batch = Array.from(pendingRef.current.values());
    pendingRef.current.clear();
    flushMutate({ cards: batch, uid });
  }, [flushMutate]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushNow();
    }, BATCH_DEBOUNCE_MS);
  }, [flushNow]);

  const queueWrite = useCallback(
    (card: SM2CardRecord) => {
      if (!userIdRef.current) return; // khách (chưa đăng nhập) — không đồng bộ mạng
      pendingRef.current.set(card.chunk_id, card);
      if (pendingRef.current.size >= BATCH_MAX_SIZE) {
        flushNow();
      } else {
        scheduleFlush();
      }
    },
    [flushNow, scheduleFlush]
  );

  // Xả hàng đợi khi rời trang / ẩn tab / unmount — tránh mất thay đổi chưa gửi.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flushNow();
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flushNow]);

  // ── Optimistic update helper (React Query — nguồn sự thật của UI) ────────
  const applyOptimistic = useCallback(
    (updater: (prev: CardsMap) => CardsMap) => {
      queryClient.setQueryData<CardsMap>(queryKey, (prev) => updater(prev ?? {}));
    },
    [queryClient, queryKey]
  );

  // ── Actions ───────────────────────────────────────────────────────────

  const recordReview = useCallback(
    (chunkId: string, grade: SM2Grade) => {
      const dateISO = todayISO();
      const prev = queryClient.getQueryData<CardsMap>(queryKey) ?? {};
      const existing = prev[chunkId] ?? makeNewCard(chunkId, dateISO);
      const updated = applyReview(existing, grade, dateISO);

      applyOptimistic((p) => ({ ...p, [chunkId]: updated }));
      queueWrite(updated);
    },
    [queryClient, queryKey, applyOptimistic, queueWrite]
  );

  const seedChunks = useCallback(
    (chunkIds: string[]) => {
      const nowISO = new Date().toISOString();
      const prev = queryClient.getQueryData<CardsMap>(queryKey) ?? {};
      const newCards = chunkIds
        .filter((id) => !prev[id])
        .map((id) => makeNewCard(id, nowISO));
      if (newCards.length === 0) return;

      applyOptimistic((p) => {
        const next = { ...p };
        for (const c of newCards) next[c.chunk_id] = c;
        return next;
      });
      for (const c of newCards) queueWrite(c);
    },
    [queryClient, queryKey, applyOptimistic, queueWrite]
  );

  const resetCard = useCallback(
    (chunkId: string) => {
      applyOptimistic((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- loại bỏ key khỏi object
        const { [chunkId]: _removed, ...rest } = prev;
        return rest;
      });
      pendingRef.current.delete(chunkId);
      const uid = userIdRef.current;
      if (uid) void deleteCard(chunkId, uid);
    },
    [applyOptimistic]
  );

  const resetAll = useCallback(() => {
    applyOptimistic(() => ({}));
    pendingRef.current.clear();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const uid = userIdRef.current;
    if (uid) void deleteAllCards(uid);
  }, [applyOptimistic]);

  const getCard = useCallback(
    (chunkId: string): SM2CardRecord | null => cardsMap[chunkId] ?? null,
    [cardsMap]
  );

  // ── Derived ──────────────────────────────────────────────────────────
  const today = useMemo(() => todayISO(), []);
  const dueToday = useMemo(() => getDueChunkIds(cardsMap, today), [cardsMap, today]);

  return {
    dueToday,
    allCards: cardsMap,
    recordReview,
    seedChunks,
    resetCard,
    resetAll,
    getCard,
    isLoading,
  };
}
