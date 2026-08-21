/**
 * 瀏覽器端：向後端核對供應商目錄（幽靈／下架／家族錯位一律擋）。
 * 不針對特定 SKU 白名單；任何 Medusa 上架的失效方案都會被拒絕。
 */

/** 給使用者看的短訊；細節只留在 API／後端 log */
export const PLAN_SOLD_OUT_MESSAGE = "商品已完售";

const USER_FACING_PLAN_CODES = new Set([
  "PLAN_DELISTED",
  "PLAN_SUBSTITUTED",
  "PLAN_UNAVAILABLE",
  "PLAN_MISSING",
]);

export function planUnavailableUserMessage(code) {
  if (USER_FACING_PLAN_CODES.has(String(code || ""))) {
    return PLAN_SOLD_OUT_MESSAGE;
  }
  return PLAN_SOLD_OUT_MESSAGE;
}

/**
 * @param {{ sku?: string, planId?: string, plan_id?: string, name?: string }} item
 * @returns {Promise<{ ok: true, results?: any[] } | { ok: false, code: string, message: string }>}
 */
export async function checkPlanAvailableClient(item) {
  const sku = String(item?.sku || "").trim();
  const planId = String(item?.planId || item?.plan_id || "").trim();
  const name = String(item?.name || sku || "eSIM").trim();

  if (!sku && !planId) {
    return {
      ok: false,
      code: "PLAN_MISSING",
      message: PLAN_SOLD_OUT_MESSAGE,
    };
  }

  try {
    const res = await fetch("/api/esim/validate-cart-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ sku, planId, name }],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return {
        ok: false,
        code: data?.code || "PLAN_UNAVAILABLE",
        message: planUnavailableUserMessage(data?.code),
      };
    }
    return { ok: true, results: data?.results };
  } catch {
    return {
      ok: false,
      code: "VALIDATE_ERROR",
      message: PLAN_SOLD_OUT_MESSAGE,
    };
  }
}

/**
 * @param {Array<{ sku?: string, planId?: string, plan_id?: string, name?: string }>} items
 */
export async function checkPlansAvailableClient(items) {
  const list = (Array.isArray(items) ? items : []).map((it) => ({
    sku: String(it?.sku || "").trim(),
    planId: String(it?.planId || it?.plan_id || "").trim(),
    name: String(it?.name || it?.sku || "eSIM").trim(),
  }));
  if (!list.length) {
    return { ok: false, code: "EMPTY", message: PLAN_SOLD_OUT_MESSAGE };
  }
  try {
    const res = await fetch("/api/esim/validate-cart-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: list }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return {
        ok: false,
        code: data?.code || "PLAN_UNAVAILABLE",
        message: planUnavailableUserMessage(data?.code),
        invalid: data?.invalid,
      };
    }
    return { ok: true, results: data?.results };
  } catch {
    return {
      ok: false,
      code: "VALIDATE_ERROR",
      message: PLAN_SOLD_OUT_MESSAGE,
    };
  }
}
