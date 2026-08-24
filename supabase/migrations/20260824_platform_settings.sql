-- 平台全域設定（key-value）；流量提醒文案等會寫入此表
create table if not exists public.platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

comment on table public.platform_settings is
  '平台全域設定；例 partner_b2b_cost_rate、traffic_alert_copy';
