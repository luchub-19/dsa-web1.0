'use client';

import { getSupabaseClient } from './client';
import type { SubmissionState } from '../../types/exam';

/**
 * examSync
 * ────────
 * Ghi kết quả 1 lần nộp bài ở Phòng Thi (kèm code đã nộp) lên bảng
 * `exam_submissions` (xem supabase/migrations/0004_exam_submissions.sql).
 *
 * LỊCH SỬ, KHÔNG UPSERT: mỗi lần chấm xong luôn INSERT 1 dòng mới — nút
 * "Reset" trong WhiteboardExam cho phép nộp lại nhiều lần cùng 1 bài, mỗi lần
 * là 1 bản ghi riêng (xem migration để biết lý do đầy đủ).
 *
 * Chỉ nên gọi hàm này với state mà phase !== 'error' — đúng như cách
 * useJudgeSubmission.ts đã gate trước khi gọi onExamComplete(state, code), vì
 * vậy state.score ở đây trong thực tế luôn là số (không null); vẫn ?? 0 phòng
 * hờ vì kiểu TS của SubmissionState.score là number | null.
 *
 * Fail SOFT, tự try/catch toàn bộ thân hàm — xem giải thích tương tự trong
 * feynmanSync.ts: hàm này được gọi kiểu "bắn rồi quên" trực tiếp từ ExamPage,
 * không qua React Query, nên không có lưới an toàn nào khác bắt promise
 * reject nếu getSupabaseClient() throw (vd thiếu .env.local).
 */

/** Lưu 1 lần nộp bài, kèm code đã nộp. Fail-soft — không bao giờ throw. */
export async function saveExamSubmission(
  examId: string,
  problemId: string,
  code: string,
  state: SubmissionState,
  userId: string
): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const passedCount = state.test_results.filter((r) => r.verdict === 'accepted').length;

    const { error } = await supabase.from('exam_submissions').insert({
      user_id: userId,
      exam_id: examId,
      problem_id: problemId,
      code,
      score: state.score ?? 0,
      passed_count: passedCount,
      total_count: state.test_results.length,
      test_results: state.test_results,
      compile_error: state.compile_error,
      total_time_ms: state.total_time_ms,
    });

    if (error) {
      console.error('[examSync] Lưu bài nộp thất bại:', error.message);
    }
  } catch (err) {
    console.error('[examSync] Lưu bài nộp thất bại:', (err as Error).message);
  }
}

/**
 * Xóa toàn bộ lịch sử nộp bài (kèm code đã nộp) của người dùng trên Supabase.
 * Fail-soft.
 *
 * KHÔNG tự try/catch quanh getSupabaseClient() như saveExamSubmission() ở
 * trên — khác chỗ đó, hàm này chỉ được gọi từ luồng "Xóa toàn bộ tiến độ" ở
 * Settings (xem app/settings/page.tsx), nơi luôn đã có userId thật (tức đã
 * đăng nhập Supabase thành công trước đó) — nghĩa là getSupabaseClient() chắc
 * chắn từng chạy được và đang cache sẵn client, nên không thể throw
 * SupabaseNotConfiguredError ở đây. Giống hệt lý do deleteAllCards() trong
 * sm2Sync.ts không cần try/catch riêng.
 */
export async function deleteAllExamSubmissions(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('exam_submissions').delete().eq('user_id', userId);
  if (error) {
    console.error('[examSync] Xóa toàn bộ thất bại:', error.message);
  }
}
