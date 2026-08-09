-- 登入 / 註冊 / 忘記密碼共用限流表（防暴力破解）
-- 在正確專案 fxwwyqkowdmhofctrhjs 的 SQL Editor 執行
-- 只由 service_role（伺服器端 API）讀寫，前端 anon/authenticated 皆不可存取。

create table if not exists public.auth_rate_limit_attempts (
  id bigint generated always as identity primary key,
  action text not null,
  identifier text not null,
  ip text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists auth_rate_limit_attempts_lookup_idx
  on public.auth_rate_limit_attempts (action, identifier, created_at desc);

create index if not exists auth_rate_limit_attempts_created_at_idx
  on public.auth_rate_limit_attempts (created_at);

alter table public.auth_rate_limit_attempts enable row level security;
-- 刻意不建立任何 policy：預設拒絕所有 anon / authenticated 存取，
-- 僅 service_role（繞過 RLS）可讀寫，供伺服器端 API 使用。

comment on table public.auth_rate_limit_attempts is
  '登入 / 註冊驗證碼 / 忘記密碼等敏感操作的嘗試紀錄，供伺服器端限流判斷用。僅 service_role 可存取。';

-- 選用：定期清理超過 7 天的舊紀錄（避免資料表無限增長）。
-- 可在 Supabase Dashboard → Database → Cron 建立排程呼叫，或手動執行：
-- delete from public.auth_rate_limit_attempts where created_at < now() - interval '7 days';
