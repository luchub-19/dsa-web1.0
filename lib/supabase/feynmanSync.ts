'use client';

import { getSupabaseClient } from './client';

/**
 * feynmanSync
 * ───────────
 * Ghi câu trả lời Feynman lên bảng `feynman_responses`
 * (xem supabase/migrations/0003_feynman_responses.sql).
 *
 * LỊCH SỬ, KHÔNG UPSERT: mỗi lần gọi saveFeynmanResponse() luôn INSERT 1 dòng
 * mới, kể cả khi user học lại cùng 1 chunk — không có khái niệm "ghi đè bản
 * cũ" như sm2_cards.
 *
 * Fail SOFT như mọi module sync khác trong lib/supabase/: lỗi không được chặn
 * luồng học. KHÁC MỘT ĐIỂM so với sm2Sync.ts: các hàm ở sm2Sync.ts không tự
 * try/catch quanh getSupabaseClient() vì luôn được gọi qua React Query
 * (useSpacedRepetition.ts) — chính React Query là lưới an toàn bắt promise
 * reject. Hàm dưới đây được gọi trực tiếp kiểu "bắn rồi quên" (fire-and-forget,
 * không qua React Query) từ LessonPlayer, nên PHẢI tự try/catch toàn bộ,
 * kể cả trường hợp getSupabaseClient() throw SupabaseNotConfiguredError khi
 * thiếu .env.local — nếu không sẽ thành unhandled promise rejection.
 */

/** Lưu 1 câu trả lời Feynman. Fail-soft — không bao giờ throw. */
export async function saveFeynmanResponse(
  chunkId: string,
  response: string,
  userId: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('feynman_responses')
      .insert({ user_id: userId, chunk_id: chunkId, response });

    if (error) {
      console.error('[feynmanSync] Lưu câu trả lời thất bại:', error.message);
    }
  } catch (err) {
    console.error('[feynmanSync] Lưu câu trả lời thất bại:', (err as Error).message);
  }
}

/**
 * Xóa toàn bộ lịch sử câu trả lời Feynman của người dùng trên Supabase.
 * Fail-soft.
 *
 * KHÔNG tự try/catch quanh getSupabaseClient() như saveFeynmanResponse() ở
 * trên — khác chỗ đó, hàm này chỉ được gọi từ luồng "Xóa toàn bộ tiến độ" ở
 * Settings (xem app/settings/page.tsx), nơi luôn đã có userId thật (tức đã
 * đăng nhập Supabase thành công trước đó) — nghĩa là getSupabaseClient() chắc
 * chắn từng chạy được và đang cache sẵn client, nên không thể throw
 * SupabaseNotConfiguredError ở đây. Giống hệt lý do deleteAllCards() trong
 * sm2Sync.ts không cần try/catch riêng.
 */
export async function deleteAllFeynmanResponses(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('feynman_responses').delete().eq('user_id', userId);
  if (error) {
    console.error('[feynmanSync] Xóa toàn bộ thất bại:', error.message);
  }
}
