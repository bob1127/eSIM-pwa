-- 專屬連結＋折扣碼：referral 夥伴可發專屬折扣碼連結
-- 旅客輸入／點連結的代碼 = partners.referral_code
-- 實際套用到 Medusa 的為對應趴數碼 JEKO_PREF_{n}（見 scripts/seed-partner-pref-promotions.mjs）

alter table public.partners
  add column if not exists referral_discount_enabled boolean not null default true;

alter table public.partners
  add column if not exists referral_discount_percent numeric(5, 2) not null default 10;

comment on column public.partners.referral_discount_enabled is
  '專屬連結是否同時為折扣碼（點 /r/{code} 帶 coupon、結帳可輸入代碼折抵）';
comment on column public.partners.referral_discount_percent is
  '專屬折扣碼折抵趴數（例 10 = 全單 10%）；對應 Medusa 碼 JEKO_PREF_10';

-- 既有 referral 夥伴預設開啟 10%（欄位 default 已涵蓋；此處保險再對齊）
update public.partners
set
  referral_discount_enabled = coalesce(referral_discount_enabled, true),
  referral_discount_percent = coalesce(referral_discount_percent, 10)
where cooperation_model = 'referral';
