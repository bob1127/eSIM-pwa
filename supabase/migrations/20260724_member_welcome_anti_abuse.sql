-- 歡迎禮防濫用：一個 LINE 終身只能核銷一次新會員 50
-- 在正確專案 fxwwyqkowdmhofctrhjs 的 SQL Editor 執行

-- 領取紀錄：email 唯一、line 唯一（有值時）
create unique index if not exists uq_member_welcome_claims_email
  on public.member_welcome_claims (lower(email));

create unique index if not exists uq_member_welcome_claims_line
  on public.member_welcome_claims (line_user_id)
  where line_user_id is not null;

-- 核銷／綁定紀錄：同一個 LINE 只能成功使用一次歡迎禮
create table if not exists public.member_welcome_redemptions (
  id              uuid primary key default gen_random_uuid(),
  line_user_id    text not null unique,
  email           text not null,
  coupon_id       uuid references public.member_coupons(id) on delete set null,
  coupon_code     text,
  cart_id         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_member_welcome_redemptions_email
  on public.member_welcome_redemptions (lower(email));

alter table public.member_welcome_redemptions enable row level security;
drop policy if exists "member_welcome_redemptions_no_public"
  on public.member_welcome_redemptions;
