-- ============================================================
-- 在「舊 eSIM Supabase 專案」的 SQL Editor 執行
-- 用途：查看各表資料量、確認 schema、準備匯出
-- 舊專案 ref: ppxaexmahlwmabklwoct (Jeek Design / eSIM)
-- 新專案 ref: fxwwyqkowdmhofctrhjs (blulink1127's Org / Jeko-eSIM)
-- URL: https://fxwwyqkowdmhofctrhjs.supabase.co
-- ============================================================

-- 1) 列出 public schema 所有資料表
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;

-- 2) 各表筆數（確認要搬哪些）
select 'partners' as tbl, count(*) from public.partners
union all select 'stores', count(*) from public.stores
union all select 'products', count(*) from public.products
union all select 'product_variations', count(*) from public.product_variations
union all select 'store_products', count(*) from public.store_products
union all select 'coupons', count(*) from public.coupons
union all select 'orders', count(*) from public.orders
union all select 'refund_requests', count(*) from public.refund_requests
union all select 'push_subscriptions', count(*) from public.push_subscriptions
union all select 'line_traffic_alerts', count(*) from public.line_traffic_alerts
union all select 'line_oa_friends', count(*) from public.line_oa_friends
union all select 'contact_submissions', count(*) from public.contact_submissions
union all select 'blog_reviews', count(*) from public.blog_reviews
union all select 'blog_review_media', count(*) from public.blog_review_media
union all select 'blog_review_likes', count(*) from public.blog_review_likes;

-- 3) 查看 orders 範例（確認欄位）
select id, customer_email, status, total_amount, created_at
from public.orders
order by id desc
limit 5;

-- ============================================================
-- 【推薦】用 pg_dump 匯出（最完整）
-- 到舊專案：Settings → Database → Connection string → URI
-- 在本機終端機執行：
--
--   pg_dump "postgresql://postgres.[OLD_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres" \
--     --schema=public \
--     --data-only \
--     --no-owner \
--     --no-privileges \
--     -f esim_data_export.sql
--
-- 若只要結構（不含資料）：
--   pg_dump ... --schema-only -f esim_schema_export.sql
--
-- 在新專案匯入：
--   psql "postgresql://postgres.[NEW_REF]:[PASSWORD]@..." -f esim_data_export.sql
-- ============================================================

-- ============================================================
-- 【替代方案】Supabase Dashboard 手動匯出 CSV
-- Table Editor → 選表 → Export CSV
-- 新專案用 Table Editor → Import CSV
-- 注意：有外鍵的表要依順序匯入：
--   partners → stores → products → product_variations
--   → store_products → coupons → orders → refund_requests
--   → push_subscriptions → line_* → contact_submissions → blog_*
-- ============================================================

-- ============================================================
-- 【小量資料】單表 COPY 匯出（在 psql 連線舊 DB 時）
--   \copy public.orders to 'orders.csv' csv header
-- 新 DB：
--   \copy public.orders from 'orders.csv' csv header
-- 匯入前需先：ALTER TABLE orders ALTER COLUMN id DROP IDENTITY IF EXISTS;
-- 或匯入後重置 sequence：
--   SELECT setval(pg_get_serial_sequence('orders','id'), (SELECT MAX(id) FROM orders));
-- ============================================================
