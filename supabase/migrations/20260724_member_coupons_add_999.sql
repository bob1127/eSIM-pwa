-- 拉霸新增 999 元獎項
-- 在 Supabase SQL Editor 執行一次

alter table public.member_coupons
  drop constraint if exists member_coupons_amount_check;

alter table public.member_coupons
  add constraint member_coupons_amount_check
  check (amount in (50, 100, 200, 300, 999));
