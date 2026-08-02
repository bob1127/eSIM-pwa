-- 官網商品推薦電信商（Medusa metadata.hot_sale_telecoms）快取到本機，供夥伴定價頁標示
alter table public.products
  add column if not exists hot_sale_telecoms jsonb not null default '[]'::jsonb;

comment on column public.products.hot_sale_telecoms is
  '熱銷推薦電信商名稱陣列，對齊 Medusa metadata.hot_sale_telecoms';
