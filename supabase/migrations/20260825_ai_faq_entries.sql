-- AI FAQ 知識庫（人工審核後供 J寶關鍵字檢索；之後可升級向量搜尋）
create table if not exists public.ai_faq_entries (
  id                bigserial primary key,
  question          text not null,
  answer            text not null,
  keywords          text, -- 選填，逗號／空白分隔，加強命中
  enabled           boolean not null default true,
  sort_order        integer not null default 0,
  hit_count         integer not null default 0,
  source_note       text, -- 例如「來自 chat_logs #123」
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_ai_faq_enabled
  on public.ai_faq_entries (enabled, sort_order, id)
  where enabled = true;

alter table public.ai_faq_entries enable row level security;

drop policy if exists "service_full_access_ai_faq" on public.ai_faq_entries;
create policy "service_full_access_ai_faq" on public.ai_faq_entries
  for all using (true) with check (true);

comment on table public.ai_faq_entries is
  'J寶 FAQ 知識庫：後台人工維護，chat API 關鍵字檢索注入 system prompt';
