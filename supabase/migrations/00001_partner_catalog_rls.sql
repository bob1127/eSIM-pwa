-- 合作夥伴商店 / 商品池 / 申請表 — RLS 補齊
-- 在新 Supabase SQL Editor 執行（bootstrap 後若未跑過此檔）

-- ── 公開讀取：分店前台 SSR + 訪客瀏覽 ─────────────────────
drop policy if exists "public_read_active_stores" on public.stores;
create policy "public_read_active_stores"
  on public.stores for select
  using (status = 'active');

drop policy if exists "public_read_products" on public.products;
create policy "public_read_products"
  on public.products for select using (true);

drop policy if exists "public_read_variations" on public.product_variations;
create policy "public_read_variations"
  on public.product_variations for select using (true);

drop policy if exists "public_read_store_products" on public.store_products;
create policy "public_read_store_products"
  on public.store_products for select using (true);

drop policy if exists "public_read_active_coupons" on public.coupons;
create policy "public_read_active_coupons"
  on public.coupons for select using (is_active = true);

-- ── 合作夥伴申請 ───────────────────────────────────────────
drop policy if exists "insert_pending_partner" on public.partners;
create policy "insert_pending_partner"
  on public.partners for insert
  with check (status = 'pending');

drop policy if exists "partner_select_own_email" on public.partners;
create policy "partner_select_own_email"
  on public.partners for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- ── 已核准夥伴：讀寫自己的店 / 上架 / 折扣碼 / 訂單 ───────
drop policy if exists "partner_select_own_store" on public.stores;
create policy "partner_select_own_store"
  on public.stores for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "partner_update_own_store" on public.stores;
create policy "partner_update_own_store"
  on public.stores for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "partner_manage_store_products" on public.store_products;
create policy "partner_manage_store_products"
  on public.store_products for all to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = store_products.store_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.stores s
      where s.id = store_products.store_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "partner_manage_own_coupons" on public.coupons;
create policy "partner_manage_own_coupons"
  on public.coupons for all to authenticated
  using (
    partner_id in (
      select p.id from public.partners p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
        and p.status = 'active'
    )
  )
  with check (
    partner_id in (
      select p.id from public.partners p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
        and p.status = 'active'
    )
  );

drop policy if exists "partner_select_own_orders" on public.orders;
create policy "partner_select_own_orders"
  on public.orders for select to authenticated
  using (
    partner_id in (
      select p.id from public.partners p
      where lower(p.email) = lower(auth.jwt() ->> 'email')
        and p.status = 'active'
    )
  );

-- 聯絡表單僅後端 service role 寫入，不需 anon insert policy
