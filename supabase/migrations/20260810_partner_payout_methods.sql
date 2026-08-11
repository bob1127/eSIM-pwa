-- 夥伴收款方式擴充：台灣銀行以外（海外／LINE Pay／PayPal／其他）
alter table public.partner_bank_accounts
  add column if not exists payout_method text not null default 'tw_bank';

alter table public.partner_bank_accounts
  add column if not exists payout_note text not null default '';

comment on column public.partner_bank_accounts.payout_method is
  'tw_bank | overseas_bank | line_pay | paypal | other';
comment on column public.partner_bank_accounts.payout_note is
  '其他說明／海外地址等，供平台人工匯款確認';
