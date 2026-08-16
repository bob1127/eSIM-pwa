-- 追蹤創作者、文章人氣／按讚、發文推播去重

create table if not exists public.creator_follows (
  id            uuid primary key default gen_random_uuid(),
  member_key    text not null,
  user_id       uuid references auth.users(id) on delete cascade,
  member_email  text,
  line_user_id  text,
  creator_key   text not null,
  creator_name  text,
  notify_push   boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (member_key, creator_key)
);

create index if not exists idx_creator_follows_creator
  on public.creator_follows (creator_key);
create index if not exists idx_creator_follows_member
  on public.creator_follows (member_key);

create table if not exists public.blog_post_stats (
  post_key    text primary key,
  view_count  integer not null default 0,
  like_count  integer not null default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.blog_post_likes (
  post_key    text not null,
  member_key  text not null,
  created_at  timestamptz not null default now(),
  primary key (post_key, member_key)
);

create table if not exists public.creator_follow_notify_log (
  post_url     text primary key,
  creator_key  text not null,
  created_at   timestamptz not null default now()
);

alter table public.creator_follows enable row level security;
alter table public.blog_post_stats enable row level security;
alter table public.blog_post_likes enable row level security;
alter table public.creator_follow_notify_log enable row level security;

drop policy if exists "public_read_blog_post_stats" on public.blog_post_stats;
create policy "public_read_blog_post_stats"
  on public.blog_post_stats for select
  using (true);
