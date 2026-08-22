-- 夥伴刪除賣場：記錄刪除時間，保留 30 天後可永久刪除
alter table public.stores
  add column if not exists deleted_at timestamptz;

comment on column public.stores.deleted_at is
  '夥伴軟刪除賣場時間；30 天內可重新開啟，逾期由系統永久刪除';

create index if not exists idx_stores_deleted_at
  on public.stores (deleted_at)
  where status = 'deleted';
