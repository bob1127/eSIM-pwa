-- 優惠連結夥伴（referral）禁止直接 SELECT orders（含 b2b_cost）
-- 後台改走 /api/partner/stats（service role 讀取並剝除底價後回傳）
-- 商店夥伴／買家 Email 政策維持不變

drop policy if exists "partner_select_own_orders" on public.orders;

create policy "partner_select_own_orders"
  on public.orders for select to authenticated
  using (
    partner_id in (
      select p.id
      from public.partners p
      where p.status = 'active'
        and coalesce(p.cooperation_model, 'store') is distinct from 'referral'
        and (
          p.auth_user_id = auth.uid()
          or lower(p.email) = lower(auth.jwt() ->> 'email')
        )
    )
  );

comment on policy "partner_select_own_orders" on public.orders is
  '商店夥伴可讀自己的訂單；referral 夥伴禁止直讀（防底價外洩），須經 /api/partner/stats';
