-- store_products 對應 Medusa 商品 ID（方案 A lazy sync）
alter table public.store_products
  add column if not exists medusa_product_id text;

create index if not exists idx_store_products_medusa
  on public.store_products (medusa_product_id)
  where medusa_product_id is not null;

create unique index if not exists idx_store_products_store_medusa
  on public.store_products (store_id, medusa_product_id)
  where medusa_product_id is not null;
