-- 資安加固：折扣碼套用嘗試記錄（供輕量防暴力破解／異常監控）
-- 結帳套碼 API 會在套用前檢查同 IP 近期嘗試次數，超過門檻即擋下並回 429。

create table if not exists public.coupon_apply_attempts (
  id          bigint generated always as identity primary key,
  ip          text,
  cart_id     text,
  code        text,
  success     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists idx_coupon_apply_attempts_ip_time
  on public.coupon_apply_attempts (ip, created_at desc);

alter table public.coupon_apply_attempts enable row level security;

comment on table public.coupon_apply_attempts is
  '折扣碼套用嘗試流水；僅伺服器（service role）寫入／查詢，用於節流與異常監控，非商業資料，可定期清除舊資料。';
