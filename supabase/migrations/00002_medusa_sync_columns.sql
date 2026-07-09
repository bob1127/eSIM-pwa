-- Medusa 商品同步欄位（可選，sync 腳本亦會把 ID 寫入 attributes）
alter table public.products
  add column if not exists handle text,
  add column if not exists medusa_product_id text,
  add column if not exists medusa_synced_at timestamptz;

create unique index if not exists idx_products_medusa_id
  on public.products (medusa_product_id)
  where medusa_product_id is not null;

create unique index if not exists idx_products_handle
  on public.products (handle)
  where handle is not null;

alter table public.product_variations
  add column if not exists medusa_variant_id text,
  add column if not exists title text;

create unique index if not exists idx_variations_medusa_id
  on public.product_variations (medusa_variant_id)
  where medusa_variant_id is not null;
