-- 日常推播（優惠／公告）與流量提醒分開：使用者可關閉日常廣播，仍保留流量 Cron 推播
alter table push_subscriptions
  add column if not exists general_push_enabled boolean default true;

create index if not exists idx_push_subscriptions_general_push
  on push_subscriptions (general_push_enabled)
  where general_push_enabled = true;
