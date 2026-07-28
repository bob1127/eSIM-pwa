-- 專屬商店定價安全強化：
-- 1) markup_rate 邊界限制（防止透過任何管道寫入離譜數值）
-- 2) 價格異動稽核紀錄表（markup_rate／custom_prices 變更留痕，供追查竄改）
--
-- 在 Supabase SQL Editor 執行。

-- ── 1. stores.markup_rate 邊界 ───────────────────────────────
alter table public.stores
  drop constraint if exists stores_markup_rate_range;
alter table public.stores
  add constraint stores_markup_rate_range
  check (markup_rate >= 0 and markup_rate <= 500);

-- ── 2. 價格異動稽核紀錄 ───────────────────────────────────────
create table if not exists public.partner_pricing_audit (
  id             bigint generated always as identity primary key,
  store_id       bigint not null references public.stores(id) on delete cascade,
  actor_user_id  uuid,
  actor_email    text,
  action         text not null,
  field          text,
  old_value      jsonb,
  new_value      jsonb,
  ip             text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_partner_pricing_audit_store
  on public.partner_pricing_audit (store_id, created_at desc);

alter table public.partner_pricing_audit enable row level security;

-- 夥伴僅能「查看」自己商店的稽核紀錄；寫入一律走 service role（API 端），
-- 不開放 authenticated/anon 的 insert/update/delete policy。
drop policy if exists "partner_select_own_pricing_audit" on public.partner_pricing_audit;
create policy "partner_select_own_pricing_audit"
  on public.partner_pricing_audit for select to authenticated
  using (
    exists (
      select 1 from public.stores s
      where s.id = partner_pricing_audit.store_id and s.user_id = auth.uid()
    )
  );
