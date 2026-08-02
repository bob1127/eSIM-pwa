-- 資安加固：專屬折扣碼連結改用「每位夥伴獨立、高熵亂數」的 Medusa 折扣碼，
-- 取代先前共用、規律可猜的 JEKO_PREF_{n}（例如 JEKO_PREF_10）。
--
-- 舊設計的問題：JEKO_PREF_5 / 10 / 15 / 20 是固定命名、跨夥伴共用的碼，
-- 任何人只要在結帳頁直接輸入猜測的字串（甚至不需要拿到任何夥伴連結），
-- 就能繞過「必須經由夥伴專屬連結」的商業邏輯直接折抵；且一旦外流，
-- 影響的是所有使用該趴數的夥伴，無法單獨停權或追蹤來源。
--
-- 新設計：每位夥伴各自對應一組亂數碼（見 lib/medusaPartnerPromotions.js
-- generateReferralMedusaCode()），只在後台由你（管理者）用已登入的 Medusa
-- session 建立／更新／停用，旅客與夥伴都看不到這組內部代碼；旅客輸入的
-- 一律是 partners.referral_code（例如 TOKYO2024），由伺服器代為映射。

alter table public.partners
  add column if not exists referral_medusa_code text;

create unique index if not exists idx_partners_referral_medusa_code
  on public.partners (referral_medusa_code)
  where referral_medusa_code is not null;

comment on column public.partners.referral_medusa_code is
  '此夥伴專屬、高熵亂數 Medusa 折扣碼（例：JEKO-REF-9f3ac1b2e7c04d11）。每位夥伴獨立、不共用、可由後台隨時「重新產生」讓舊碼立即失效。絕不對外顯示或回傳給前端。';
