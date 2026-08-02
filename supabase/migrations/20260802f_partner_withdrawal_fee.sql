-- 提領手續費：每月首次免收；第 2 次起每次 NT$15（自申請金額內扣，實匯 = amount - fee_amount）

alter table public.partner_withdrawal_requests
  add column if not exists fee_amount integer not null default 0
  check (fee_amount >= 0);

comment on column public.partner_withdrawal_requests.fee_amount is
  '銀行轉帳手續費（申請當下計算；實匯 = amount - fee_amount）';
