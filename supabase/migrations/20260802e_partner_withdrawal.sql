-- 夥伴收款帳戶 + 提領申請
-- 每月第 1 次免手續費；第 2 次起 fee_amount=15，實匯 = amount - fee_amount

create table if not exists public.partner_bank_accounts (
  id              bigint generated always as identity primary key,
  partner_id      bigint not null references public.partners(id) on delete cascade,
  bank_name       text not null default '',
  bank_code       text not null default '',
  branch_name     text not null default '',
  account_name    text not null default '',
  account_number  text not null default '',
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (partner_id)
);

create table if not exists public.partner_withdrawal_requests (
  id              bigint generated always as identity primary key,
  partner_id      bigint not null references public.partners(id) on delete cascade,
  amount          integer not null check (amount > 0),
  fee_amount      integer not null default 0 check (fee_amount >= 0),
  status          text not null default 'pending'
                  check (status in ('pending', 'approved', 'rejected', 'remitted', 'cancelled')),
  requested_at    timestamptz not null default now(),
  processed_at    timestamptz,
  remitted_at     timestamptz,
  admin_note      text not null default '',
  remittance_memo text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_partner_withdrawals_partner
  on public.partner_withdrawal_requests (partner_id, requested_at desc);

create index if not exists idx_partner_withdrawals_status
  on public.partner_withdrawal_requests (status, requested_at desc);

comment on table public.partner_bank_accounts is
  '夥伴收款帳戶（匯款前由平台與夥伴確認）';
comment on table public.partner_withdrawal_requests is
  '提領申請：實匯 = amount - fee_amount';
comment on column public.partner_withdrawal_requests.fee_amount is
  '銀行轉帳手續費（每月第 1 次為 0；之後通常為 15）';
