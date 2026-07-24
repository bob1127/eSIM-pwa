-- 允許歡迎禮／拉霸金額含 30 元
alter table public.member_coupons
  drop constraint if exists member_coupons_amount_check;

alter table public.member_coupons
  add constraint member_coupons_amount_check
  check (amount in (30, 50, 100, 200, 300, 999));
