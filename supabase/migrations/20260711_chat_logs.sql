-- J寶 AI 對話紀錄
create table if not exists public.chat_logs (
  id          bigserial primary key,
  session_id  text      not null,           -- 前端隨機產生的對話 Session UUID
  user_id     uuid      references auth.users(id) on delete set null,
  guest_id    text,                          -- 未登入時的 fingerprint（localStorage）
  role        text      not null check (role in ('user','ai','agent')),
  content     text      not null,
  provider    text,                          -- 'groq' | 'gemini-vision' | 'gemini-advanced' | 'preset' | 'human'
  created_at  timestamptz not null default now()
);

create index if not exists idx_chat_logs_session   on public.chat_logs (session_id);
create index if not exists idx_chat_logs_user      on public.chat_logs (user_id)    where user_id is not null;
create index if not exists idx_chat_logs_created   on public.chat_logs (created_at desc);

-- RLS：一般使用者只能看自己的；service_role 可看全部
alter table public.chat_logs enable row level security;

create policy "users_own_logs" on public.chat_logs
  for select using (auth.uid() = user_id);

create policy "service_full_access" on public.chat_logs
  for all using (true) with check (true);
