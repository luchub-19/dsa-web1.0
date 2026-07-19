-- ─────────────────────────────────────────────────────────────────────────────
-- Chạy SAU 0001-0003. Vào Supabase Dashboard → SQL Editor → New query → Run.
--
-- Bảng lưu kết quả nộp bài ở Phòng Thi (WhiteboardExam). Trước đây
-- handleExamComplete (app/exam/[examId]/page.tsx) chỉ console.info rồi thôi —
-- không có bảng nào, không có API route nào lưu lại.
--
-- LỊCH SỬ, KHÔNG UPSERT — giống feynman_responses và vì cùng lý do: nút
-- "Reset" trong WhiteboardExam cho phép nộp lại nhiều lần cùng 1 bài, mỗi lần
-- nộp là 1 dòng riêng để xem lại quá trình cải thiện qua các lần thử.
--
-- code lưu NGUYÊN VĂN (không phải kiểm tra IP hay chấm điểm giữ bí mật gì —
-- đây là ứng dụng học tập cá nhân/lớp học nhỏ) để học viên xem lại chính xác
-- mình đã nộp gì ở mỗi lần thử.
--
-- test_results dùng JSONB (giống scheduling_state ở sm2_cards, xem migration
-- 0002) vì TestCaseResult[] là mảng object có shape riêng của lớp chấm bài
-- Judge0 — không tách thành cột SQL để tránh phải ALTER TABLE mỗi khi
-- types/exam.ts đổi field. score/passed_count/total_count tách cột riêng vì
-- đó là khái niệm phổ quát của "1 lần nộp bài" (không phụ thuộc chi tiết
-- Judge0), cần query/sort nhanh (vd sau này làm leaderboard hoặc lịch sử điểm).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.exam_submissions (
  id             uuid not null default gen_random_uuid() primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  exam_id        text not null,
  problem_id     text not null,
  code           text not null,
  score          integer not null,
  passed_count   integer not null,
  total_count    integer not null,
  test_results   jsonb not null default '[]'::jsonb,
  compile_error  text,
  total_time_ms  integer,
  submitted_at   timestamptz not null default now()
);

-- ─── Row Level Security: mỗi người dùng CHỈ thấy/ghi được dữ liệu của chính mình ───

alter table public.exam_submissions enable row level security;

create policy "Users can view own exam submissions"
  on public.exam_submissions for select
  using (auth.uid() = user_id);

create policy "Users can insert own exam submissions"
  on public.exam_submissions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own exam submissions"
  on public.exam_submissions for delete
  using (auth.uid() = user_id);

-- Không có policy "update" — mỗi lần nộp là 1 dòng lịch sử bất biến.

-- Index để truy vấn "lịch sử nộp bài của user cho 1 bài thi cụ thể, mới nhất
-- trước" — đúng truy vấn 1 màn hình "xem lại các lần nộp" sẽ cần.
create index if not exists idx_exam_submissions_user_problem
  on public.exam_submissions (user_id, exam_id, problem_id, submitted_at desc);
