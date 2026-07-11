-- 商品變體新增 retail_price 欄位，供聊天機器人知識庫與前端 card 使用
alter table public.product_variations
  add column if not exists retail_price numeric(12, 2) not null default 0;

-- 同時補齊 products 可能缺少的欄位
alter table public.products
  add column if not exists handle text,
  add column if not exists medusa_product_id text,
  add column if not exists medusa_synced_at timestamptz,
  add column if not exists image_url text;

create unique index if not exists idx_products_medusa_id_v2
  on public.products (medusa_product_id)
  where medusa_product_id is not null;

create unique index if not exists idx_products_handle_v2
  on public.products (handle)
  where handle is not null;

-- product_variations 補齊 medusa_variant_id 與 title（若 00002 未跑）
alter table public.product_variations
  add column if not exists medusa_variant_id text,
  add column if not exists title text;

create unique index if not exists idx_variations_medusa_id_v2
  on public.product_variations (medusa_variant_id)
  where medusa_variant_id is not null;
