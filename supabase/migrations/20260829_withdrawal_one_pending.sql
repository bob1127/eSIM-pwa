-- 提領防呆：同一夥伴同時僅能有一筆「審核中」申請（防連點／併發超額）
-- 並加上金額上下限 check（與程式 PAYOUT_MIN／MAX 對齊）

create unique index if not exists uniq_partner_withdrawal_one_pending
  on public.partner_withdrawal_requests (partner_id)
  where (status = 'pending');

-- 既有列可能超出範圍時先不強制改資料；僅對新寫入加約束需小心。
-- 使用 check 可能擋到歷史異常列 → 先加註解、由 API 硬擋；此處僅確保 amount 正整數已有。
-- 補充：單次上限／下限由 API validateWithdrawalAmount 強制。

comment on index uniq_partner_withdrawal_one_pending is
  '同一夥伴同時只能有一筆 pending 提領，防止併發超額申請';
