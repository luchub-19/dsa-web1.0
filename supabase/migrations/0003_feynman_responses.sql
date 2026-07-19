-- ─────────────────────────────────────────────────────────────────────────────
-- Chạy SAU 0001 + 0002. Vào Supabase Dashboard → SQL Editor → New query → Run.
--
-- Bảng lưu câu trả lời Feynman (học viên tự diễn giải khái niệm bằng lời của
-- mình). Trước đây bị vứt bỏ ngay sau submit — component FeynmanInput chỉ giữ
-- state cục bộ và không truyền `value` đi đâu cả.
--
-- LỊCH SỬ, KHÔNG UPSERT: mỗi lần submit là 1 dòng mới, kể cả khi học lại cùng
-- 1 chunk (bấm "Học lại từ đầu" hoặc quay lại /learn/[slug] sau). Vì vậy PK là
-- `id` (uuid) chứ không phải (user_id, chunk_id) như sm2_cards — 1 cặp
-- user+chunk có thể có nhiều dòng theo thời gian. Không có updated_at/trigger
-- vì dòng đã ghi là bất biến (không có luồng "sửa lại câu trả lời cũ").
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.feynman_responses (
  id          uuid not null default gen_random_uuid() primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  chunk_id    text not null,
  response    text not null,
  created_at  timestamptz not null default now()
);

-- ─── Row Level Security: mỗi người dùng CHỈ thấy/ghi được dữ liệu của chính mình ───

alter table public.feynman_responses enable row level security;

create policy "Users can view own feynman responses"
  on public.feynman_responses for select
  using (auth.uid() = user_id);

create policy "Users can insert own feynman responses"
  on public.feynman_responses for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own feynman responses"
  on public.feynman_responses for delete
  using (auth.uid() = user_id);

-- Không có policy "update" — dòng lịch sử coi là bất biến sau khi ghi.

-- Index để truy vấn "toàn bộ câu trả lời của user cho 1 chunk, mới nhất trước"
-- nhanh hơn khi dữ liệu lớn dần (vd 1 màn hình xem lại lịch sử sau này).
create index if not exists idx_feynman_responses_user_chunk
  on public.feynman_responses (user_id, chunk_id, created_at desc);
