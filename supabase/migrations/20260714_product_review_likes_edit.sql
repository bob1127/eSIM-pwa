-- ============================================================
-- 商品評價：頭像 / 已編輯 / 按讚
-- 請在 Supabase → SQL Editor 執行此檔案
-- ============================================================

-- 補充欄位（若已存在則略過）
alter table public.product_reviews
  add column if not exists user_avatar text;

alter table public.product_reviews
  add column if not exists is_edited boolean not null default false;

alter table public.product_reviews
  add column if not exists edited_at timestamptz;

-- 按讚關聯表（每人每則評價只能讚一次）
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

-- 確保作者可更新自己的評價（編輯內容）
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
