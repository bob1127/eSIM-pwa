/** 退款政策常數與資格判斷 */

export const REFUND_FULL_DAYS = 7;
export const REFUND_DISPUTE_DAYS = 30;
export const MAX_REFUND_IMAGES = 3;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const REFUND_REASONS_FULL = [
  { value: "wrong_purchase", label: "誤購／下錯方案" },
  { value: "trip_cancelled", label: "行程取消" },
  { value: "duplicate_order", label: "重複下單" },
  { value: "device_incompatible", label: "發現手機不支援 eSIM" },
  { value: "other", label: "其他原因" },
];

export const REFUND_REASONS_DISPUTE = [
  { value: "no_connection", label: "完全無法連線" },
  { value: "cannot_scan", label: "無法掃描 QR Code" },
  { value: "wrong_product", label: "收到錯誤方案" },
  { value: "duplicate_charge", label: "重複扣款" },
  { value: "partial_failure", label: "部分功能異常" },
  { value: "other", label: "其他問題" },
];

export const ACTIVATION_CLAIMS = [
  { value: "not_activated", label: "我尚未掃描 QR Code／未安裝 eSIM" },
  { value: "activated", label: "我已掃描或安裝 eSIM" },
];

export function daysSince(dateString) {
  if (!dateString) return Infinity;
  const ms = Date.now() - new Date(dateString).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

export function getLatestRefundRequest(order) {
  const list = order?.refund_requests || [];
  if (!Array.isArray(list) || list.length === 0) return null;
  return [...list].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0];
}

export function isOrderEsimActivated(order) {
  return String(order?.esim_activation_status || "").toLowerCase() === "activated";
}

export function getRefundEligibility(order) {
  if (!order) return { canApply: false, code: "NO_ORDER" };

  const status = String(order.status || "").toLowerCase();
  const latest = getLatestRefundRequest(order);

  if (latest?.status === "pending") {
    return { canApply: false, code: "PENDING", request: latest };
  }
  if (status === "refunded" || latest?.status === "approved") {
    return { canApply: false, code: "REFUNDED", request: latest };
  }
  if (status === "refund_pending") {
    return { canApply: false, code: "PENDING", request: latest };
  }
  if (status !== "completed") {
    return { canApply: false, code: "NOT_COMPLETED" };
  }

  const age = daysSince(order.created_at);
  const activated = isOrderEsimActivated(order);

  /** 已掃 QR／已開通 → 售後爭議（須舉證） */
  if (activated) {
    if (age <= REFUND_DISPUTE_DAYS) {
      return {
        canApply: true,
        requestType: "dispute",
        label: "申請售後／爭議處理",
        hint: "此 eSIM 已開通，請上傳設定畫面或錯誤截圖，由客服個案審核（不保證退款）。",
      };
    }
    return { canApply: false, code: "EXPIRED", request: latest };
  }

  /** 尚未開通 → 7 日內全額退款（簡化表單） */
  if (age <= REFUND_FULL_DAYS) {
    return {
      canApply: true,
      requestType: "full_refund",
      label: "申請退款（未開通）",
      hint: `購買後 ${REFUND_FULL_DAYS} 日內且尚未掃描 QR Code，可申請全額退款。`,
    };
  }

  /** 超過 7 日且未標記開通 → 仍可走爭議 */
  if (age <= REFUND_DISPUTE_DAYS) {
    return {
      canApply: true,
      requestType: "dispute",
      label: "申請售後／爭議處理",
      hint: `已超過 ${REFUND_FULL_DAYS} 日未開通退款期限；若已使用 eSIM 或有異常，請提交爭議與舉證。`,
    };
  }

  return { canApply: false, code: "EXPIRED", request: latest };
}

export function refundReasonLabel(reasonType, requestType) {
  const list =
    requestType === "dispute" ? REFUND_REASONS_DISPUTE : REFUND_REASONS_FULL;
  return list.find((r) => r.value === reasonType)?.label || reasonType || "—";
}

/** 會員 UI — 退款欄位短標籤 */
export function refundColumnLabel(order) {
  const badge = refundStatusLabel(order);
  if (badge) {
    if (badge.label === "退款審核中") return "審核中";
    if (badge.label === "退款未通過") return "未通過";
    if (badge.label === "已退款") return "已退";
  }
  const el = getRefundEligibility(order);
  if (el.canApply) return el.requestType === "full_refund" ? "可退" : "爭議";
  return "—";
}

/** 會員 UI — 是否應顯示退款詳情（審核中／已退／駁回） */
export function shouldShowRefundDetail(order) {
  const status = String(order?.status || "").toLowerCase();
  const latest = getLatestRefundRequest(order);
  if (status === "refund_pending" || status === "refunded") return true;
  if (latest && ["pending", "approved", "rejected"].includes(latest.status)) return true;
  return false;
}

export function getRefundUiState(order) {
  const latest = getLatestRefundRequest(order);
  const badge = refundStatusLabel(order);
  const eligibility = getRefundEligibility(order);
  return {
    latest,
    badge,
    eligibility,
    showRefundDetail: shouldShowRefundDetail(order),
    canReapply: eligibility.canApply && latest?.status === "rejected",
  };
}

export function refundStatusLabel(order) {
  const status = String(order?.status || "").toLowerCase();
  const latest = getLatestRefundRequest(order);

  if (status === "refunded" || latest?.status === "approved") {
    return {
      label: "已退款",
      color: "bg-[#F1F3F7] text-[#5B6570] border-[#E3E7EE]",
    };
  }
  if (status === "refund_pending" || latest?.status === "pending") {
    return {
      label: "退款審核中",
      color: "bg-[#FFF6C8] text-[#1E4AD1] border-[#FADE2B]",
    };
  }
  if (latest?.status === "rejected") {
    return {
      label: "退款未通過",
      color: "bg-[#FFF0D6] text-[#1E4AD1] border-[#F2CC40]",
    };
  }
  return null;
}

/** 可計業績／分潤：已完成或待付款（不含取消、退款） */
export function isSettledOrderStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "completed" || s === "pending";
}

export function orderItemSummary(order) {
  let items = order?.item_details;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];
  const first = items[0];
  return first?.name || first?.productName || "eSIM 方案";
}
