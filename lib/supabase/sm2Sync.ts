'use client';

import { getSupabaseClient } from './client';
import type { SM2CardRecord, SM2Grade } from '../../types/spacedRepetition';

/**
 * sm2Sync
 * ───────
 * Cầu nối giữa SM2CardRecord (dùng trong toàn app) và bảng `sm2_cards` trên
 * Supabase (xem supabase/migrations/0002_sm2_cards_jsonb_scheduling_state.sql).
 *
 * SCHEMA: từ migration 0002, bảng chỉ giữ metadata bắt buộc ở cột SQL riêng
 * (user_id, chunk_id, created_at, updated_at) — mọi field ĐẶC THÙ THUẬT TOÁN
 * (ease_factor, interval_days, repetition_count, next_review_date,
 * last_review_date, grade_history, total_reviews) nằm trong 1 cột JSONB
 * `scheduling_state`. File này là ĐIỂM DUY NHẤT biết cách map giữa 2 shape
 * đó — phần còn lại của app chỉ thấy SM2CardRecord phẳng như trước.
 *
 * Mọi hàm ở đây fail SOFT (log lỗi ra console, không throw) — vì đồng bộ
 * Supabase là "best-effort": nếu mạng lỗi hoặc Supabase sập, người dùng vẫn
 * phải tiếp tục học bình thường với localStorage, không được để lỗi mạng
 * làm gián đoạn trải nghiệm học tập.
 */

/** Shape của cột scheduling_state cho thuật toán SM-2. */
interface SM2SchedulingState {
  algorithm: 'sm2';
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string | null;
  last_review_date: string | null;
  grade_history: SM2Grade[];
  total_reviews: number;
}

interface SM2CardRow {
  user_id: string;
  chunk_id: string;
  scheduling_state: SM2SchedulingState;
  created_at: string;
}

function isSM2State(state: unknown): state is SM2SchedulingState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as { algorithm?: unknown }).algorithm === 'sm2'
  );
}

export function rowToCard(row: SM2CardRow): SM2CardRecord {
  const s = row.scheduling_state;
  // Phòng hờ dữ liệu cũ/hỏng (state rỗng hoặc thuộc thuật toán khác trong
  // tương lai) — trả về thẻ "mới tinh" thay vì crash khi parse.
  if (!isSM2State(s)) {
    return {
      chunk_id: row.chunk_id,
      ease_factor: 2.5,
      interval_days: 0,
      repetition_count: 0,
      next_review_date: null,
      last_review_date: null,
      grade_history: [],
      total_reviews: 0,
      created_at: row.created_at,
    };
  }
  return {
    chunk_id: row.chunk_id,
    ease_factor: s.ease_factor,
    interval_days: s.interval_days,
    repetition_count: s.repetition_count,
    next_review_date: s.next_review_date,
    last_review_date: s.last_review_date,
    grade_history: s.grade_history,
    total_reviews: s.total_reviews,
    created_at: row.created_at,
  };
}

export function cardToRow(
  card: SM2CardRecord,
  userId: string
): Omit<SM2CardRow, 'created_at'> & { created_at: string } {
  return {
    user_id: userId,
    chunk_id: card.chunk_id,
    scheduling_state: {
      algorithm: 'sm2',
      ease_factor: card.ease_factor,
      interval_days: card.interval_days,
      repetition_count: card.repetition_count,
      next_review_date: card.next_review_date,
      last_review_date: card.last_review_date,
      grade_history: card.grade_history,
      total_reviews: card.total_reviews,
    },
    created_at: card.created_at,
  };
}

/** Tải toàn bộ thẻ SM-2 của 1 người dùng từ Supabase. */
export async function fetchAllCards(userId: string): Promise<Record<string, SM2CardRecord>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('sm2_cards')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[sm2Sync] Lỗi tải dữ liệu từ Supabase:', error.message);
    return {};
  }

  const cards: Record<string, SM2CardRecord> = {};
  for (const row of (data ?? []) as SM2CardRow[]) {
    cards[row.chunk_id] = rowToCard(row);
  }
  return cards;
}

/** Ghi (upsert) 1 hoặc nhiều thẻ lên Supabase. Fail-soft. */
export async function upsertCards(cards: SM2CardRecord[], userId: string): Promise<void> {
  if (cards.length === 0) return;
  const supabase = getSupabaseClient();
  const rows = cards.map((c) => cardToRow(c, userId));
  const { error } = await supabase.from('sm2_cards').upsert(rows, { onConflict: 'user_id,chunk_id' });
  if (error) {
    console.error('[sm2Sync] Đồng bộ (upsert) thất bại:', error.message);
  }
}

/** Xóa 1 thẻ trên Supabase. Fail-soft. */
export async function deleteCard(chunkId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('sm2_cards')
    .delete()
    .eq('user_id', userId)
    .eq('chunk_id', chunkId);
  if (error) {
    console.error('[sm2Sync] Xóa thẻ thất bại:', error.message);
  }
}

/** Xóa toàn bộ thẻ của người dùng trên Supabase. Fail-soft. */
export async function deleteAllCards(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('sm2_cards').delete().eq('user_id', userId);
  if (error) {
    console.error('[sm2Sync] Xóa toàn bộ thất bại:', error.message);
  }
}
