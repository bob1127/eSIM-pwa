-- 夥伴部落格 CMS（IG 貼文輪播、側欄精選商品）
alter table public.stores
  add column if not exists blog_cms jsonb not null default '{}'::jsonb;

comment on column public.stores.blog_cms is
  '夥伴部落格可編輯區塊：ig_posts、featured_product_id（僅店主可寫）';
