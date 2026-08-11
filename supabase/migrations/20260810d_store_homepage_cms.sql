-- 夥伴賣場首頁 CMS（hero／促銷卡／Discover banner）
alter table public.stores
  add column if not exists homepage_cms jsonb not null default '{}'::jsonb;

comment on column public.stores.homepage_cms is
  '夥伴賣場首頁可編輯區塊：hero、promoCards、discover（僅店主可寫）';
