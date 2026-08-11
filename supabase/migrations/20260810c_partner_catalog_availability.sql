-- 主站下架／刪除時：標記 catalog 狀態，並可暫停夥伴上架，避免幽靈販售

alter table public.products
  add column if not exists catalog_status text not null default 'active';

alter table public.products
  add column if not exists catalog_unavailable_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'products_catalog_status_check'
  ) then
    alter table public.products
      add constraint products_catalog_status_check
      check (catalog_status in ('active', 'unavailable', 'deleted'));
  end if;
end $$;

comment on column public.products.catalog_status is
  '主站目錄狀態：active=可售；unavailable=Store API 已不可見（下架）；deleted=已刪除';

alter table public.store_products
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'store_products_status_check'
  ) then
    alter table public.store_products
      add constraint store_products_status_check
      check (status in ('active', 'paused'));
  end if;
end $$;

comment on column public.store_products.status is
  '夥伴上架狀態：active=賣場可見可售；paused=停用（含主站下架後自動暫停）';

create index if not exists idx_products_catalog_status
  on public.products (catalog_status);

create index if not exists idx_store_products_status
  on public.store_products (store_id, status);

create index if not exists idx_store_products_medusa
  on public.store_products (medusa_product_id)
  where medusa_product_id is not null;
