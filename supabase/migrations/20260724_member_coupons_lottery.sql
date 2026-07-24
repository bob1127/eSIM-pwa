-- 會員拉霸優惠券（個人持有，非夥伴折扣碼）
-- 在 Supabase SQL Editor 執行一次

create table if not exists public.member_coupons (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  email           text not null,
  line_user_id    text,
  amount          integer not null check (amount in (30, 50, 100, 200, 300, 999)),
  code            text not null unique,
  label           text not null,
  source          text not null default 'lottery',
  status          text not null default 'available'
                  check (status in ('available', 'redeemed', 'expired')),
  lottery_day     date,
  created_at      timestamptz not null default now(),
  redeemed_at     timestamptz,
  redeemed_order_id text
);

create index if not exists idx_member_coupons_email
  on public.member_coupons (email);

create index if not exists idx_member_coupons_status
  on public.member_coupons (email, status);

create index if not exists idx_member_coupons_code
  on public.member_coupons (code);

-- 每日拉霸紀錄（含沒中），用來做每日限抽
create table if not exists public.member_lottery_plays (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  email           text not null,
  line_user_id    text,
  play_day        date not null,
  prize_id        text not null,
  amount          integer not null default 0,
  coupon_id       uuid references public.member_coupons(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_member_lottery_plays_email_day
  on public.member_lottery_plays (email, play_day);

-- 正式上線每日限一次時啟用（測試無限次期間可先不建 unique）
-- create unique index if not exists uq_member_lottery_one_per_day
--   on public.member_lottery_plays (email, play_day);

alter table public.member_coupons enable row level security;
alter table public.member_lottery_plays enable row level security;

-- 僅 service role / 後端 API 讀寫；不開 anon 直連寫入
drop policy if exists "member_coupons_no_public" on public.member_coupons;
drop policy if exists "member_lottery_plays_no_public" on public.member_lottery_plays;
