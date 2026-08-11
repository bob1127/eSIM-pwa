-- 提領申請當下收款帳戶快照（夥伴之後改帳戶時，審核頁仍可對照）
alter table public.partner_withdrawal_requests
  add column if not exists payout_snapshot jsonb not null default '{}'::jsonb;

comment on column public.partner_withdrawal_requests.payout_snapshot is
  '申請當下收款帳戶快照；匯款審核以 partner_bank_accounts 最新資料為準，若有差異需人工確認';
