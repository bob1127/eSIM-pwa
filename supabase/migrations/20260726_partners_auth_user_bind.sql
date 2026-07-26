-- 夥伴帳號綁定 Auth 使用者（支援 LINE／Google／FB 零摩擦登入）
alter table public.partners
  add column if not exists auth_user_id uuid;

alter table public.partners
  add column if not exists line_user_id text;

create unique index if not exists idx_partners_auth_user_id
  on public.partners (auth_user_id)
  where auth_user_id is not null;

create unique index if not exists idx_partners_line_user_id
  on public.partners (line_user_id)
  where line_user_id is not null;

comment on column public.partners.auth_user_id is
  '綁定的 Supabase auth.users.id；社群登入以此驗證夥伴資格';
comment on column public.partners.line_user_id is
  'LINE Login 的 user id（U 開頭）；供 LINE 會員綁定';
