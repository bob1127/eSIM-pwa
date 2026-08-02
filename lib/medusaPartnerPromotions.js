/**
 * 「專屬折扣碼連結」的 Medusa 折扣碼生命週期管理。
 *
 * 安全設計重點：
 * - 每位夥伴一組獨立、高熵亂數碼（generateReferralMedusaCode），不共用
 *   命名規律，外流也只影響單一夥伴，且可隨時「重新產生」讓舊碼失效。
 * - 這裡的函式只在管理者後台（已通過 requireMedusaAdminFromRequest 驗證）
 *   的請求中被呼叫，使用當次登入 session 的 Medusa JWT，本檔案不持有、
 *   也不需要任何長期 Medusa 管理員憑證。
 * - 旅客結帳流程（pages/api/checkout/promotion.js）只會讀取 Supabase 已存好
 *   的 referral_medusa_code 做映射，完全不呼叫這裡、也拿不到 Medusa 權杖。
 */
import crypto from "crypto";
import { getMedusaBackendUrl } from "./medusaAdminAuth";

const CODE_PREFIX = "JEKO-REF-";

/** 128 bit 亂數（16 bytes → 32 hex），實務上不可能被猜中或暴力枚舉 */
export function generateReferralMedusaCode() {
  return `${CODE_PREFIX}${crypto.randomBytes(16).toString("hex")}`.toUpperCase();
}

async function medusaAdminFetch(token, path, options = {}) {
  const res = await fetch(`${getMedusaBackendUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status: res.status,
      data: { message: text.slice(0, 300) },
    };
  }
  return { ok: res.ok, status: res.status, data };
}

async function findPromotionByCode(token, code) {
  const q = new URLSearchParams({ q: code, limit: "5" });
  const { ok, data } = await medusaAdminFetch(token, `/admin/promotions?${q}`);
  if (!ok) return null;
  const list = data.promotions || [];
  return (
    list.find(
      (p) => String(p.code || "").toUpperCase() === String(code).toUpperCase(),
    ) || null
  );
}

function percentagePayload(code, percent, targetType = "order") {
  return {
    code,
    type: "standard",
    status: "active",
    is_automatic: false,
    application_method: {
      type: "percentage",
      target_type: targetType,
      allocation: "across",
      value: percent,
      currency_code: "twd",
    },
  };
}

/**
 * 讓 Medusa 上該折扣碼的狀態／趴數與期望值一致：
 * - active=false → 停用（不刪除，保留歷史紀錄／未來可重新啟用）
 * - active=true  → 建立（不存在時）或更新趴數並確保啟用
 *
 * @returns {Promise<{ ok: boolean, code: string, id?: string, action?: string, error?: string }>}
 */
export async function syncPartnerDiscountPromotion(token, { code, percent, active }) {
  if (!token) return { ok: false, code: code || "", error: "缺少 Medusa 授權" };
  if (!code) return { ok: false, code: "", error: "缺少折扣碼" };

  const existing = await findPromotionByCode(token, code);

  if (!active) {
    if (!existing) return { ok: true, code, action: "noop" };
    if (existing.status === "inactive") {
      return { ok: true, code, id: existing.id, action: "already_inactive" };
    }
    const upd = await medusaAdminFetch(
      token,
      `/admin/promotions/${existing.id}`,
      { method: "POST", body: JSON.stringify({ status: "inactive" }) },
    );
    return {
      ok: upd.ok,
      code,
      id: existing.id,
      action: "deactivated",
      error: upd.ok ? null : upd.data?.message,
    };
  }

  const safePercent = Math.min(50, Math.max(1, Math.round(Number(percent) || 1)));

  if (existing) {
    const targetType = existing.application_method?.target_type || "order";
    const upd = await medusaAdminFetch(
      token,
      `/admin/promotions/${existing.id}`,
      {
        method: "POST",
        body: JSON.stringify({
          status: "active",
          application_method: {
            type: "percentage",
            target_type: targetType,
            allocation: "across",
            value: safePercent,
            currency_code: "twd",
          },
        }),
      },
    );
    return {
      ok: upd.ok,
      code,
      id: existing.id,
      action: "updated",
      error: upd.ok ? null : upd.data?.message,
    };
  }

  let created = await medusaAdminFetch(token, "/admin/promotions", {
    method: "POST",
    body: JSON.stringify(percentagePayload(code, safePercent, "order")),
  });

  if (!created.ok) {
    created = await medusaAdminFetch(token, "/admin/promotions", {
      method: "POST",
      body: JSON.stringify(percentagePayload(code, safePercent, "items")),
    });
  }

  if (!created.ok) {
    return {
      ok: false,
      code,
      error: created.data?.message || `建立失敗（${created.status}）`,
    };
  }

  return { ok: true, code, id: created.data?.promotion?.id, action: "created" };
}

/**
 * 依夥伴目前完整狀態（status／cooperation_model／enabled／percent／code）
 * 反推 Medusa 折扣碼「應該」是什麼狀態並同步，供狀態變更（批准／停用／
 * 調整趴數）等各處呼叫，避免各處各自判斷邏輯漂移不一致。
 */
export async function reconcilePartnerDiscountPromotion(token, partner) {
  const code = partner?.referral_medusa_code;
  if (!code) return { ok: true, action: "no_code" };

  const percent = Number(partner.referral_discount_percent) || 0;
  const shouldBeActive =
    partner.status === "active" &&
    partner.cooperation_model === "referral" &&
    partner.referral_discount_enabled !== false &&
    percent > 0;

  return syncPartnerDiscountPromotion(token, {
    code,
    percent: percent || 1,
    active: shouldBeActive,
  });
}
