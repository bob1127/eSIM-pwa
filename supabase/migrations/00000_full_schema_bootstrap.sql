-- ============================================================
-- JEKO eSIM — 新 Supabase 專案完整 Schema（一次執行）
-- 用途：在新組織建立 Project 後，到 SQL Editor 貼上並 Run
-- 注意：auth.users 需在新專案重新註冊；舊 user uuid 匯入時要對應
-- ============================================================

-- ── 共用：updated_at trigger ────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 1. 合作夥伴 ───────────────────────────────────────────
create table if not exists public.partners (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text not null unique,
  email       text not null unique,
  status      text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'suspended')),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_partners_status on public.partners (status);
create index if not exists idx_partners_slug on public.partners (slug);

-- ── 2. 夥伴店鋪 ───────────────────────────────────────────
create table if not exists public.stores (
  id           bigint generated always as identity primary key,
  domain       text not null unique,
  store_name   text not null,
  description  text,
  logo_url     text,
  status       text not null default 'active',
  markup_rate  numeric(5, 2) not null default 20,
  footer_company_name text,
  footer_address text,
  footer_address_note text,
  footer_tax_id text,
  footer_email text,
  footer_phone text,
  footer_copyright text,
  social_instagram text,
  social_facebook text,
  social_line text,
  user_id      uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_stores_user_id on public.stores (user_id);
create index if not exists idx_stores_domain on public.stores (domain);

-- ── 3. 商品主表 + 變體 ─────────────────────────────────────
create table if not exists public.products (
  id          bigint generated always as identity primary key,
  name        text not null,
  description text,
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.product_variations (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products(id) on delete cascade,
  sku         text not null,
  b2b_price   numeric(12, 2) not null default 0,
  attributes  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_product_variations_product on public.product_variations (product_id);
create unique index if not exists idx_product_variations_sku on public.product_variations (sku);

-- ── 4. 店鋪上架商品 ───────────────────────────────────────
create table if not exists public.store_products (
  id             bigint generated always as identity primary key,
  store_id       bigint not null references public.stores(id) on delete cascade,
  product_id     bigint not null references public.products(id) on delete cascade,
  custom_prices  jsonb default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (store_id, product_id)
);

create index if not exists idx_store_products_store on public.store_products (store_id);

-- ── 5. 折扣碼 ─────────────────────────────────────────────
create table if not exists public.coupons (
  id              bigint generated always as identity primary key,
  code            text not null unique,
  discount_type   text not null check (discount_type in ('fixed', 'percent')),
  discount_value  numeric(12, 2) not null,
  partner_id      bigint references public.partners(id) on delete cascade,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists idx_coupons_partner on public.coupons (partner_id);
create index if not exists idx_coupons_code on public.coupons (code);

-- ── 6. 訂單主表 ───────────────────────────────────────────
create table if not exists public.orders (
  id                     bigint generated always as identity primary key,
  store_id               bigint references public.stores(id) on delete set null,
  partner_id             bigint references public.partners(id) on delete set null,
  coupon_id              bigint references public.coupons(id) on delete set null,
  customer_email         text,
  customer_name          text,
  total_amount           numeric(12, 2) not null default 0,
  total_price            numeric(12, 2),
  b2b_cost               numeric(12, 2) not null default 0,
  partner_profit         numeric(12, 2) not null default 0,
  status                 text not null default 'pending',
  item_details           jsonb not null default '[]'::jsonb,
  items                  jsonb not null default '[]'::jsonb,
  qrcode_data            jsonb,
  payment_info           jsonb,
  esim_activation_status text not null default 'unknown',
  refunded_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_orders_customer_email on public.orders (customer_email);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_partner_id on public.orders (partner_id);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

comment on column public.orders.payment_info is '待付款訂單：CVS/ATM 取號資訊 JSON';

-- ── 7. 退款申請 ───────────────────────────────────────────
create table if not exists public.refund_requests (
  id                     uuid primary key default gen_random_uuid(),
  order_id               bigint not null references public.orders(id) on delete cascade,
  customer_email         text not null,
  request_type           text not null check (request_type in ('full_refund', 'dispute')),
  reason_type            text not null,
  reason_note            text,
  device_model           text,
  activation_claim       text check (activation_claim in ('not_activated', 'activated')),
  image_urls             jsonb not null default '[]'::jsonb,
  status                 text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note             text,
  esim_activation_status text default 'unknown',
  agreed_terms_at        timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  reviewed_at            timestamptz,
  reviewed_by            text
);

create index if not exists idx_refund_requests_order_id on public.refund_requests (order_id);
create index if not exists idx_refund_requests_status on public.refund_requests (status);
create index if not exists idx_refund_requests_email on public.refund_requests (customer_email);

-- ── 8. 推播訂閱 ───────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete cascade,
  endpoint          text unique not null,
  p256dh            text not null,
  auth              text not null,
  iccid             text,
  guest_email       text,
  topup_id          text,
  iccid_bound_at    timestamptz,
  monitor_enabled   boolean default false,
  product_label     text,
  order_id          uuid,
  bind_method       text,
  line_user_id      text,
  line_alert_enabled boolean default false,
  last_checked_at   timestamptz,
  last_remaining_mb numeric,
  last_alert_at     timestamptz,
  created_at        timestamptz default now()
);

create index if not exists idx_push_subscriptions_iccid
  on public.push_subscriptions (iccid) where iccid is not null;
create index if not exists idx_push_subscriptions_monitor
  on public.push_subscriptions (monitor_enabled) where monitor_enabled = true;
create index if not exists idx_push_subscriptions_line_user
  on public.push_subscriptions (line_user_id) where line_user_id is not null;

-- ── 9. LINE 流量提醒 ──────────────────────────────────────
create table if not exists public.line_traffic_alerts (
  id                uuid primary key default gen_random_uuid(),
  line_user_id      text not null,
  topup_id          text,
  iccid             text,
  product_label     text,
  order_id          uuid,
  guest_email       text,
  monitor_enabled   boolean default true,
  last_checked_at   timestamptz,
  last_remaining_mb numeric,
  last_alert_at     timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  unique (line_user_id, topup_id)
);

create index if not exists idx_line_traffic_alerts_monitor
  on public.line_traffic_alerts (monitor_enabled) where monitor_enabled = true;

create table if not exists public.line_oa_friends (
  line_user_id   text primary key,
  display_name   text,
  followed_at    timestamptz default now(),
  unfollowed_at  timestamptz
);

-- ── 10. 聯絡表單 ───────────────────────────────────────────
create table if not exists public.contact_submissions (
  id         bigserial primary key,
  type       text not null check (type in ('general', 'partner', 'refund')),
  name       text,
  email      text not null,
  phone      text,
  company    text,
  order_id   text,
  partner_type text,
  subject    text,
  message    text not null,
  metadata   jsonb default '{}'::jsonb,
  image_urls jsonb default '[]'::jsonb,
  status     text not null default 'pending'
    check (status in ('pending', 'processing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_submissions_type on public.contact_submissions(type);
create index if not exists idx_contact_submissions_email on public.contact_submissions(email);
create index if not exists idx_contact_submissions_status on public.contact_submissions(status);
create index if not exists idx_contact_submissions_created on public.contact_submissions(created_at desc);

-- ── 11. 部落格評論 ────────────────────────────────────────
create table if not exists public.blog_reviews (
  id           uuid primary key default gen_random_uuid(),
  post_slug    text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  user_name    text not null,
  user_avatar  text,
  rating       smallint not null check (rating between 1 and 5),
  content      text not null check (char_length(content) >= 2),
  likes        integer not null default 0,
  is_approved  boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.blog_review_media (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid references public.blog_reviews(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  media_type   text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  public_url   text not null,
  file_name    text not null,
  file_size    bigint not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.blog_review_likes (
  review_id   uuid not null references public.blog_reviews(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists blog_reviews_post_slug_idx on public.blog_reviews(post_slug);
create index if not exists blog_reviews_user_id_idx on public.blog_reviews(user_id);
create index if not exists blog_review_media_review_idx on public.blog_review_media(review_id);

drop trigger if exists blog_reviews_updated_at on public.blog_reviews;
create trigger blog_reviews_updated_at
  before update on public.blog_reviews
  for each row execute function public.set_updated_at();

-- ── 12. Storage Buckets ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('blog-review-media', 'blog-review-media', true, 52428800,
   array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm']),
  ('review-media', 'review-media', true, 52428800,
   array['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/quicktime','video/webm']),
  ('refund-evidence', 'refund-evidence', true, 10485760,
   array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 13. RLS（Row Level Security）────────────────────────────
alter table public.partners enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_variations enable row level security;
alter table public.store_products enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.refund_requests enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.blog_reviews enable row level security;
alter table public.blog_review_media enable row level security;
alter table public.blog_review_likes enable row level security;

-- orders：會員讀自己的訂單
drop policy if exists "orders_select_own_email" on public.orders;
create policy "orders_select_own_email"
  on public.orders for select to authenticated
  using (customer_email = (auth.jwt() ->> 'email'));

-- refund_requests：會員讀自己的退款
drop policy if exists "refund_requests_select_own" on public.refund_requests;
create policy "refund_requests_select_own"
  on public.refund_requests for select to authenticated
  using (customer_email = (auth.jwt() ->> 'email'));

-- push_subscriptions
drop policy if exists "Users manage own subscriptions" on public.push_subscriptions;
create policy "Users manage own subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- blog_reviews
drop policy if exists "公開讀取已審核評論" on public.blog_reviews;
create policy "公開讀取已審核評論"
  on public.blog_reviews for select using (is_approved = true);
drop policy if exists "登入者可新增評論" on public.blog_reviews;
create policy "登入者可新增評論"
  on public.blog_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "只有作者可更新自己評論" on public.blog_reviews;
create policy "只有作者可更新自己評論"
  on public.blog_reviews for update using (auth.uid() = user_id);
drop policy if exists "只有作者可刪除自己評論" on public.blog_reviews;
create policy "只有作者可刪除自己評論"
  on public.blog_reviews for delete using (auth.uid() = user_id);

-- blog_review_media
drop policy if exists "公開讀取媒體" on public.blog_review_media;
create policy "公開讀取媒體" on public.blog_review_media for select using (true);
drop policy if exists "登入者可新增媒體" on public.blog_review_media;
create policy "登入者可新增媒體"
  on public.blog_review_media for insert with check (auth.uid() = user_id);
drop policy if exists "只有作者可刪除媒體" on public.blog_review_media;
create policy "只有作者可刪除媒體"
  on public.blog_review_media for delete using (auth.uid() = user_id);

-- blog_review_likes
drop policy if exists "公開讀取按讚" on public.blog_review_likes;
create policy "公開讀取按讚" on public.blog_review_likes for select using (true);
drop policy if exists "登入者可按讚" on public.blog_review_likes;
create policy "登入者可按讚"
  on public.blog_review_likes for insert with check (auth.uid() = user_id);
drop policy if exists "只有自己可退讚" on public.blog_review_likes;
create policy "只有自己可退讚"
  on public.blog_review_likes for delete using (auth.uid() = user_id);

-- Storage policies
drop policy if exists "公開讀取評論媒體檔" on storage.objects;
create policy "公開讀取評論媒體檔"
  on storage.objects for select using (bucket_id = 'blog-review-media');
drop policy if exists "登入者可上傳評論媒體" on storage.objects;
create policy "登入者可上傳評論媒體"
  on storage.objects for insert
  with check (bucket_id = 'blog-review-media' and auth.role() = 'authenticated');
drop policy if exists "登入者可刪除自己的評論媒體" on storage.objects;
create policy "登入者可刪除自己的評論媒體"
  on storage.objects for delete
  using (bucket_id = 'blog-review-media' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "review_media_public_read" on storage.objects;
create policy "review_media_public_read"
  on storage.objects for select using (bucket_id = 'review-media');
drop policy if exists "review_media_auth_upload" on storage.objects;
create policy "review_media_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'review-media' and auth.role() = 'authenticated');
drop policy if exists "review_media_auth_delete" on storage.objects;
create policy "review_media_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'review-media' and auth.role() = 'authenticated');

-- ============================================================
-- 完成。接下來請執行 supabase/scripts/export_from_old_project.sql
-- 在「舊專案」匯出資料，再在新專案匯入。
-- ============================================================
