-- ============================================================
-- 一次執行：會員優惠券 + 歡迎禮（請在 Supabase SQL Editor 整段執行）
-- 專案：Jeko-eSIM
-- 檔案：supabase/migrations/20260724_member_coupons_AND_welcome_ALL.sql
-- ============================================================

-- 1) 會員優惠券（拉霸／歡迎禮）
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

-- 金額約束（若表已存在且舊約束不同，先 drop 再建）
alter table public.member_coupons
  drop constraint if exists member_coupons_amount_check;

alter table public.member_coupons
  add constraint member_coupons_amount_check
  check (amount in (30, 50, 100, 200, 300, 999));

-- 同一 email / LINE 只能一張 welcome
create unique index if not exists uq_member_coupons_welcome_email
  on public.member_coupons (lower(email))
  where source = 'welcome';

create unique index if not exists uq_member_coupons_welcome_line
  on public.member_coupons (line_user_id)
  where source = 'welcome' and line_user_id is not null;

-- 2) 每日拉霸紀錄
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

-- 3) 歡迎禮領取紀錄
create table if not exists public.member_welcome_claims (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  line_user_id    text,
  channel         text not null check (channel in ('web_signup', 'line_login', 'line_oa')),
  coupon_id       uuid references public.member_coupons(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists idx_member_welcome_claims_email
  on public.member_welcome_claims (lower(email));

create index if not exists idx_member_welcome_claims_line
  on public.member_welcome_claims (line_user_id)
  where line_user_id is not null;

-- 4) RLS：僅 service role / 後端 API
alter table public.member_coupons enable row level security;
alter table public.member_lottery_plays enable row level security;
alter table public.member_welcome_claims enable row level security;

drop policy if exists "member_coupons_no_public" on public.member_coupons;
drop policy if exists "member_lottery_plays_no_public" on public.member_lottery_plays;
drop policy if exists "member_welcome_claims_no_public" on public.member_welcome_claims;

-- 完成後可用這句確認：
-- select tablename from pg_tables where schemaname='public' and tablename like 'member_%';
