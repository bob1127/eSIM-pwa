-- 專屬商店加價模式：比例（percent）或固定金額（fixed）
-- 在 Supabase SQL Editor 執行。

alter table public.stores
  add column if not exists markup_mode text not null default 'percent';

alter table public.stores
  add column if not exists markup_fixed integer not null default 50;

alter table public.stores
  drop constraint if exists stores_markup_mode_check;
alter table public.stores
  add constraint stores_markup_mode_check
  check (markup_mode in ('percent', 'fixed'));

alter table public.stores
  drop constraint if exists stores_markup_fixed_range;
alter table public.stores
  add constraint stores_markup_fixed_range
  check (markup_fixed >= 0 and markup_fixed <= 10000);
