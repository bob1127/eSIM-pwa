-- 專屬連結分潤基本趴數：20 → 25（達標月仍為 30）
alter table public.partners
  alter column referral_rate set default 25;

update public.partners
set referral_rate = 25
where cooperation_model = 'referral'
  and (referral_rate is null or referral_rate = 20);

comment on column public.partners.referral_rate is
  '推薦分潤基本趴數（成本×%）：預設 25；當月有效單達 40 筆改為 30，次月重算';
