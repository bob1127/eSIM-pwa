-- 新會員歡迎禮 50 元：官網註冊 / LINE 會員 擇一，不可重複
-- 在 Supabase SQL Editor 執行一次

-- source 擴充：welcome = 新會員歡迎禮（web 或 line 只算一次）
alter table public.member_coupons
  drop constraint if exists member_coupons_amount_check;

alter table public.member_coupons
  add constraint member_coupons_amount_check
  check (amount in (30, 50, 100, 200, 300, 999));

-- 同一 email 只能有一張 welcome 券
create unique index if not exists uq_member_coupons_welcome_email
  on public.member_coupons (lower(email))
  where source = 'welcome';

-- 同一 LINE user 只能有一張 welcome 券
create unique index if not exists uq_member_coupons_welcome_line
  on public.member_coupons (line_user_id)
  where source = 'welcome' and line_user_id is not null;

-- 歡迎禮領取紀錄（方便稽核：從哪個渠道領的）
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

alter table public.member_welcome_claims enable row level security;
