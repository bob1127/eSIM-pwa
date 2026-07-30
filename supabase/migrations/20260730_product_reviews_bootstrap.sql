-- ============================================================
-- 商品評價：一次建齊（若線上缺表請在 Supabase → SQL Editor 執行）
-- 專案：與 NEXT_PUBLIC_SUPABASE_URL 同一個
-- ============================================================

create table if not exists public.product_reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   text        not null,
  parent_id    uuid        references public.product_reviews(id) on delete cascade,
  user_id      uuid        references auth.users(id) on delete set null,
  user_name    text        not null,
  user_avatar  text,
  title        text,
  content      text        not null check (char_length(content) >= 1),
  rating       smallint    not null default 5 check (rating between 1 and 5),
  media_urls   text[]      not null default '{}',
  status       text        not null default 'approved'
                           check (status in ('pending', 'approved', 'rejected')),
  is_edited    boolean     not null default false,
  edited_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx
  on public.product_reviews(product_id);
create index if not exists product_reviews_parent_id_idx
  on public.product_reviews(parent_id);
create index if not exists product_reviews_status_idx
  on public.product_reviews(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_reviews_updated_at on public.product_reviews;
create trigger product_reviews_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

alter table public.product_reviews enable row level security;

drop policy if exists "公開讀取已核准商品評價" on public.product_reviews;
create policy "公開讀取已核准商品評價"
  on public.product_reviews for select
  using (status = 'approved');

drop policy if exists "登入者可新增商品評價" on public.product_reviews;
create policy "登入者可新增商品評價"
  on public.product_reviews for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "作者可刪除自己的商品評價" on public.product_reviews;
create policy "作者可刪除自己的商品評價"
  on public.product_reviews for delete
  using (
    auth.uid() = user_id
    or auth.jwt() ->> 'email' = 'bob112722761236tom@gmail.com'
  );

drop policy if exists "作者可更新自己的商品評價" on public.product_reviews;
create policy "作者可更新自己的商品評價"
  on public.product_reviews for update
  using (
    auth.uid() = user_id
    or auth.jwt() ->> 'email' = 'bob112722761236tom@gmail.com'
  )
  with check (
    auth.uid() = user_id
    or auth.jwt() ->> 'email' = 'bob112722761236tom@gmail.com'
  );

create table if not exists public.product_review_likes (
  review_id  uuid not null references public.product_reviews(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists product_review_likes_review_id_idx
  on public.product_review_likes(review_id);
create index if not exists product_review_likes_user_id_idx
  on public.product_review_likes(user_id);

alter table public.product_review_likes enable row level security;

drop policy if exists "公開讀取商品評價按讚" on public.product_review_likes;
create policy "公開讀取商品評價按讚"
  on public.product_review_likes for select
  using (true);

drop policy if exists "登入者可按讚" on public.product_review_likes;
create policy "登入者可按讚"
  on public.product_review_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "登入者可取消按讚" on public.product_review_likes;
create policy "登入者可取消按讚"
  on public.product_review_likes for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-media',
  'review-media',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- 建完後：Settings → API → Reload schema（或等約 1 分鐘）再重整商品頁
