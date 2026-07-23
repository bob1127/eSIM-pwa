-- 夥伴賣場 Footer 可編輯欄位（公司資訊 + 社群連結）
-- 執行於 Supabase SQL Editor

alter table public.stores
  add column if not exists footer_company_name text;

alter table public.stores
  add column if not exists footer_address text;

alter table public.stores
  add column if not exists footer_address_note text;

alter table public.stores
  add column if not exists footer_tax_id text;

alter table public.stores
  add column if not exists footer_email text;

alter table public.stores
  add column if not exists footer_phone text;

alter table public.stores
  add column if not exists footer_copyright text;

alter table public.stores
  add column if not exists social_instagram text;

alter table public.stores
  add column if not exists social_facebook text;

alter table public.stores
  add column if not exists social_line text;

comment on column public.stores.footer_company_name is 'Footer 顯示公司／店鋪名稱';
comment on column public.stores.footer_address is 'Footer 地址';
comment on column public.stores.footer_address_note is 'Footer 地址備註（如僅收件）';
comment on column public.stores.footer_tax_id is 'Footer 統一編號';
comment on column public.stores.footer_email is 'Footer 客服信箱';
comment on column public.stores.footer_phone is 'Footer 客服電話';
comment on column public.stores.footer_copyright is 'Footer 版權文字';
comment on column public.stores.social_instagram is 'Instagram URL';
comment on column public.stores.social_facebook is 'Facebook URL';
comment on column public.stores.social_line is 'LINE URL';
