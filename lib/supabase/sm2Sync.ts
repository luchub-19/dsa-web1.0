'use client';

import { getSupabaseClient } from './client';
import type { SM2CardRecord } from '../../types/spacedRepetition';

/**
 * sm2Sync
 * ───────
 * Cầu nối giữa SM2CardRecord (dùng trong toàn app) và bảng `sm2_cards` trên
 * Supabase (xem supabase/migrations/0001_sm2_cards.sql). Field đặt tên khớp
 * gần như 1-1 nên việc map qua lại rất mỏng.
 *
 * Mọi hàm ở đây fail SOFT (log lỗi ra console, không throw) — vì đồng bộ
 * Supabase là "best-effort": nếu mạng lỗi hoặc Supabase sập, người dùng vẫn
 * phải tiếp tục học bình thường với localStorage, không được để lỗi mạng
 * làm gián đoạn trải nghiệm học tập.
 */

interface SM2CardRow {
  user_id: string;
  chunk_id: string;
  ease_factor: number;
  interval_days: number;
  repetition_count: number;
  next_review_date: string | null;
  last_review_date: string | null;
  grade_history: number[];
  total_reviews: number;
  created_at: string;
}

export function rowToCard(row: SM2CardRow): SM2CardRecord {
  return {
    chunk_id: row.chunk_id,
    ease_factor: row.ease_factor,
    interval_days: row.interval_days,
    repetition_count: row.repetition_count,
    next_review_date: row.next_review_date,
    last_review_date: row.last_review_date,
    grade_history: row.grade_history as SM2CardRecord['grade_history'],
    total_reviews: row.total_reviews,
    created_at: row.created_at,
  };
}

export function cardToRow(card: SM2CardRecord, userId: string): SM2CardRow {
  return {
    user_id: userId,
    chunk_id: card.chunk_id,
    ease_factor: card.ease_factor,
    interval_days: card.interval_days,
    repetition_count: card.repetition_count,
    next_review_date: card.next_review_date,
    last_review_date: card.last_review_date,
    grade_history: card.grade_history,
    total_reviews: card.total_reviews,
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
