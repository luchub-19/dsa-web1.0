-- ─────────────────────────────────────────────────────────────────────────────
-- Chạy SAU 0001_sm2_cards.sql. Vào Supabase Dashboard → SQL Editor → New query → Run.
--
-- LÝ DO: bảng sm2_cards trước đây có 1 cột SQL riêng cho MỖI field thuật toán
-- (ease_factor, interval_days, repetition_count, next_review_date,
-- last_review_date, grade_history, total_reviews). Điều đó gắn chặt schema
-- database vào chi tiết thuật toán SM-2 cụ thể — nếu sau này đổi sang thuật
-- toán spaced-repetition khác (FSRS, Leitner, ...) hoặc thêm field mới, phải
-- viết migration ALTER TABLE mỗi lần.
--
-- SAU: lõi database chỉ giữ metadata BẮT BUỘC, không phụ thuộc thuật toán:
--   user_id, chunk_id, created_at, updated_at.
-- Toàn bộ state thuật toán (ease_factor, interval_days, ...) gom vào 1 cột
-- `scheduling_state jsonb`. Thêm field mới hoặc đổi thuật toán chỉ cần đổi
-- code ứng dụng (lib/supabase/sm2Sync.ts), KHÔNG cần ALTER TABLE.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Thêm cột JSONB mới ────────────────────────────────────────────────────

alter table public.sm2_cards
  add column if not exists scheduling_state jsonb not null default '{}'::jsonb;

-- ── 2. Di trú dữ liệu từ các cột cũ vào scheduling_state ─────────────────────
-- Gắn thêm "algorithm": "sm2" để nếu sau này có 2 thuật toán cùng tồn tại
-- song song trong bảng, code đọc biết cách parse state theo đúng shape.

update public.sm2_cards
set scheduling_state = jsonb_build_object(
  'algorithm',         'sm2',
  'ease_factor',       ease_factor,
  'interval_days',     interval_days,
  'repetition_count',  repetition_count,
  'next_review_date',  next_review_date,
  'last_review_date',  last_review_date,
  'grade_history',     to_jsonb(grade_history),
  'total_reviews',     total_reviews
)
where scheduling_state = '{}'::jsonb;

-- ── 3. Xóa index cũ phụ thuộc cột next_review_date (sắp bị drop) ─────────────

drop index if exists idx_sm2_cards_user_next_review;

-- ── 4. Drop các cột thuật toán cũ — lõi bảng chỉ còn metadata bắt buộc ───────

alter table public.sm2_cards
  drop column if exists ease_factor,
  drop column if exists interval_days,
  drop column if exists repetition_count,
  drop column if exists next_review_date,
  drop column if exists last_review_date,
  drop column if exists grade_history,
  drop column if exists total_reviews;

-- ── 5. Index mới: query "đến hạn hôm nay" giờ đọc field JSONB ────────────────
-- Expression index trên next_review_date bên trong JSONB — vẫn nhanh như
-- index cột thường vì Postgres index trực tiếp lên giá trị text trích ra.

create index if not exists idx_sm2_cards_user_next_review
  on public.sm2_cards (user_id, (scheduling_state ->> 'next_review_date'));

-- ── 6. RLS policies không đổi (vẫn dựa trên user_id, không phụ thuộc cột đã xóa) ──
-- Không cần re-create — policies của 0001 vẫn áp dụng nguyên vẹn.

comment on column public.sm2_cards.scheduling_state is
  'State thuật toán spaced-repetition (SM-2 hiện tại). Shape tự do theo field '
  '"algorithm" bên trong — KHÔNG có cột SQL riêng cho field thuật toán để '
  'tránh phải ALTER TABLE mỗi khi đổi/mở rộng thuật toán.';
