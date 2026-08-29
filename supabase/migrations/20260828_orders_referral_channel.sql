-- 優惠連結（referral）夥伴訂單同步：付款成功後，orders 會同時容納兩種夥伴通道
--   channel = 'store'    → 夥伴商店訂單（夥伴自訂售價，帶 store_id）
--   channel = 'referral' → 優惠連結訂單（官網同價 + Cookie 歸因，只有 partner_id）
-- 在 Supabase SQL Editor 執行本檔。

alter table public.orders
  add column if not exists channel text;

alter table public.orders
  add column if not exists referral_code text;

alter table public.orders
  drop constraint if exists orders_channel_check;

alter table public.orders
  add constraint orders_channel_check
  check (channel is null or channel in ('main', 'store', 'referral'));

-- 既有列回填：有 store_id 的一律是夥伴商店訂單
update public.orders
   set channel = 'store'
 where channel is null
   and store_id is not null;

create index if not exists idx_orders_channel
  on public.orders (channel);

create index if not exists idx_orders_partner_channel
  on public.orders (partner_id, channel);

comment on column public.orders.channel is
  'store=夥伴商店訂單 / referral=優惠連結（官網同價、Cookie 歸因）/ main=主站直客';
comment on column public.orders.referral_code is
  'channel=referral 時的 partners.referral_code，供對帳追溯';
