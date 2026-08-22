-- 統一結帳：夥伴店訂單改走主站 Medusa + 藍新流程後，藍新 notify 付款成功會把
-- 這筆訂單以 orders 列寫回 Supabase（供夥伴後台結算／出金）。需要一個能連回
-- Medusa 訂單的鍵，並用它做冪等 upsert（藍新重試不重複建單）。
alter table public.orders
  add column if not exists medusa_order_id text;

create unique index if not exists idx_orders_medusa_order_id
  on public.orders (medusa_order_id)
  where medusa_order_id is not null;

comment on column public.orders.medusa_order_id is
  '對應 Medusa 訂單 id（統一結帳的夥伴店訂單）；藍新 notify 以此冪等 upsert';
