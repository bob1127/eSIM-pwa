-- 夥伴自訂 Blog（加值功能）
-- blog_custom_enabled = true 時，夥伴可在後台新增文章；前台會與主站 WP 文章合併顯示

alter table public.stores
  add column if not exists blog_custom_enabled boolean not null default false;

comment on column public.stores.blog_custom_enabled is
  '加值：允許夥伴自建文章（額外收費開關，由平台 Admin 開啟）';

create table if not exists public.store_blog_posts (
  id              uuid primary key default gen_random_uuid(),
  store_id        bigint not null references public.stores(id) on delete cascade,
  slug            text not null,
  title           text not null,
  excerpt         text,
  content_html    text not null default '',
  cover_image_url text,
  category_label  text default 'TRAVEL',
  tags            text[] default '{}',
  author_name     text,
  author_bio      text,
  status          text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (store_id, slug)
);

create index if not exists idx_store_blog_posts_store
  on public.store_blog_posts (store_id, status, published_at desc);

create index if not exists idx_store_blog_posts_slug
  on public.store_blog_posts (store_id, slug);

drop trigger if exists store_blog_posts_updated_at on public.store_blog_posts;
create trigger store_blog_posts_updated_at
  before update on public.store_blog_posts
  for each row execute function public.set_updated_at();

alter table public.store_blog_posts enable row level security;

-- 公開讀：已發布文章
drop policy if exists "public_read_published_store_blog" on public.store_blog_posts;
create policy "public_read_published_store_blog"
  on public.store_blog_posts for select
  using (status = 'published');

-- 夥伴 CRUD：只能操作自己 store 的文章
drop policy if exists "partner_select_own_store_blog" on public.store_blog_posts;
create policy "partner_select_own_store_blog"
  on public.store_blog_posts for select to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "partner_insert_own_store_blog" on public.store_blog_posts;
create policy "partner_insert_own_store_blog"
  on public.store_blog_posts for insert to authenticated
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_id
        and s.user_id = auth.uid()
        and s.blog_custom_enabled = true
    )
  );

drop policy if exists "partner_update_own_store_blog" on public.store_blog_posts;
create policy "partner_update_own_store_blog"
  on public.store_blog_posts for update to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id
        and s.user_id = auth.uid()
        and s.blog_custom_enabled = true
    )
  );

drop policy if exists "partner_delete_own_store_blog" on public.store_blog_posts;
create policy "partner_delete_own_store_blog"
  on public.store_blog_posts for delete to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_id
        and s.user_id = auth.uid()
        and s.blog_custom_enabled = true
    )
  );
