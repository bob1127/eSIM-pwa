-- 一般會員（Google／FB／Email）綁定 LINE 帳號，啟用新會員 50 折價券
-- 一個 LINE 帳號僅能綁定一個會員帳號（unique index 保證）；
-- 只有 service role（伺服器端 API）可讀寫，前端 anon/authenticated key 一律無權限。
-- 在正確專案 fxwwyqkowdmhofctrhjs 的 SQL Editor 執行

create table if not exists public.line_account_links (
  id            uuid primary key default gen_random_uuid(),
  line_user_id  text not null unique,
  user_id       uuid,
  email         text not null,
  display_name  text,
  linked_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_line_account_links_email
  on public.line_account_links (lower(email));

create index if not exists idx_line_account_links_user_id
  on public.line_account_links (user_id);

alter table public.line_account_links enable row level security;
drop policy if exists "line_account_links_no_public" on public.line_account_links;

-- 綁定嘗試防暴力／異常監控（比照 coupon_apply_attempts 風格）
create table if not exists public.line_bind_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip          text,
  email       text,
  success     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_line_bind_attempts_ip_created
  on public.line_bind_attempts (ip, created_at);

alter table public.line_bind_attempts enable row level security;
drop policy if exists "line_bind_attempts_no_public" on public.line_bind_attempts;
