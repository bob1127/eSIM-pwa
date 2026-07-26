-- 訂單狀態通知紀錄（Email / LINE / Web Push）
create table if not exists public.order_notifications (
  id              bigint generated always as identity primary key,
  order_id        bigint not null references public.orders(id) on delete cascade,
  event_type      text not null,
  channel         text not null check (channel in ('email', 'line', 'push')),
  status          text not null default 'sent'
                    check (status in ('sent', 'skipped', 'failed')),
  detail          text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_order_notifications_order
  on public.order_notifications (order_id, event_type, channel);

create index if not exists idx_order_notifications_created
  on public.order_notifications (created_at desc);

comment on table public.order_notifications is
  '訂單通知發送紀錄：未付款提醒、已付款、已出貨等（email / line / push）';

-- 訂單可選：紀錄最近一次未付款提醒時間（方便 cron 篩選）
alter table public.orders
  add column if not exists last_unpaid_remind_at timestamptz;

alter table public.orders
  add column if not exists unpaid_remind_count integer not null default 0;
