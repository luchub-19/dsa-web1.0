-- ─────────────────────────────────────────────────────────────────────────────
-- Chạy file này trong Supabase Dashboard → SQL Editor → New query → Run.
-- Bảng lưu tiến độ SM-2 của từng người dùng, thay thế localStorage khi đã
-- đăng nhập. Field đặt tên khớp 1-1 với SM2CardRecord (types/spacedRepetition.ts)
-- để việc map dữ liệu qua lại đơn giản, không cần transform phức tạp.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sm2_cards (
  user_id           uuid not null references auth.users(id) on delete cascade,
  chunk_id          text not null,
  ease_factor       double precision not null default 2.5,
  interval_days     integer not null default 0,
  repetition_count  integer not null default 0,
  next_review_date  date,
  last_review_date  date,
  grade_history     smallint[] not null default '{}',
  total_reviews     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, chunk_id)
);

-- Tự động cập nhật updated_at mỗi lần ghi đè (upsert) một thẻ.
create or replace function public.set_sm2_cards_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sm2_cards_updated_at on public.sm2_cards;
create trigger trg_sm2_cards_updated_at
  before update on public.sm2_cards
  for each row execute function public.set_sm2_cards_updated_at();

-- ─── Row Level Security: mỗi người dùng CHỈ thấy/sửa được dữ liệu của chính mình ───

alter table public.sm2_cards enable row level security;

create policy "Users can view own cards"
  on public.sm2_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own cards"
  on public.sm2_cards for insert
  with check (auth.uid() = user_id);

create policy "Users can update own cards"
  on public.sm2_cards for update
  using (auth.uid() = user_id);

create policy "Users can delete own cards"
  on public.sm2_cards for delete
  using (auth.uid() = user_id);

-- Index để truy vấn "thẻ đến hạn hôm nay" nhanh hơn khi dữ liệu lớn dần.
create index if not exists idx_sm2_cards_user_next_review
  on public.sm2_cards (user_id, next_review_date);
