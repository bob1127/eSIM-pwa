-- 專屬推薦連結合作（與「開店賣場」並存）
-- 在 Supabase SQL Editor 執行本檔

alter table public.partners
  add column if not exists cooperation_model text not null default 'store';

alter table public.partners
  drop constraint if exists partners_cooperation_model_check;

alter table public.partners
  add constraint partners_cooperation_model_check
  check (cooperation_model in ('store', 'referral'));

alter table public.partners
  add column if not exists referral_code text;

alter table public.partners
  add column if not exists referral_rate numeric(5, 2) not null default 20;

create unique index if not exists idx_partners_referral_code
  on public.partners (referral_code)
  where referral_code is not null;

comment on column public.partners.cooperation_model is
  'store=專屬賣場 / referral=專屬推薦連結（官網 Cookie 歸因）';
comment on column public.partners.referral_code is
  '推薦代碼，用於 ?ref= 與 Cookie';
comment on column public.partners.referral_rate is
  '推薦分潤：給夥伴的成本加成點數（例：官網抓 50%、此欄 20 → 夥伴拿成本×20%，你留×30%；售價與官網相同）';

alter table public.partners
  add column if not exists referral_og_image text;

comment on column public.partners.referral_og_image is
  '專屬分享網址 /r/{code} 的 OG 圖（完整 URL 或站內路徑）；空白則用 /images/referral/og-share.jpg';

-- 點擊紀錄（可選分析）
create table if not exists public.referral_clicks (
  id             bigint generated always as identity primary key,
  partner_id     bigint not null references public.partners(id) on delete cascade,
  referral_code  text not null,
  landing_path   text,
  user_agent     text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_referral_clicks_partner
  on public.referral_clicks (partner_id, created_at desc);

-- 主站購物車與推薦夥伴綁定（Medusa cart_id）
create table if not exists public.referral_cart_links (
  cart_id        text primary key,
  partner_id     bigint not null references public.partners(id) on delete cascade,
  referral_code  text not null,
  created_at     timestamptz not null default now()
);

alter table public.referral_clicks enable row level security;
alter table public.referral_cart_links enable row level security;
