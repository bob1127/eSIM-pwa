/**
 * 供應商方案可用性：防止 planMap 幽靈舊名把已下架／改名方案「偷換成」別的貨。
 * 規則（由嚴到寬）：
 * 1) 解析出的 channel_dataplan_id 必須在即時目錄存在
 * 2) 若 Medusa SKU（去掉本地後綴後）與目錄現名「商品家族」不同 → 視為替換，拒絕
 * 3) 目錄完全找不到可解析 ID → 拒絕下單
 */
import PLAN_ID_MAP from "./planMap";
import {
  ESIM_TEST_PLAN_ID,
  fetchMicroesimCatalog,
  shouldForceTestPlan,
} from "./microesimClient";

const LOCAL_SKU_SUFFIXES = [
  "-TC",
  "-TOTAL",
  "-TRIPLE",
  "-IIJ",
  "-AUHS",
  "-TRRE",
  "-CTEXCEL",
];

const CATALOG_TTL_MS =
  (Number(process.env.ESIM_PLAN_AVAILABILITY_CACHE_MINUTES) || 5) * 60 * 1000;

let catalogCache = { at: 0, byId: null, byName: null };
let catalogInFlight = null;

function normalizeKey(v) {
  return String(v || "")
    .trim()
    .replace(/\u200B/g, "");
}

/** 去掉門市／電信本地後綴與 #tag，還原供應商方案名候選 */
export function skuNameCandidates(rawSku) {
  const raw = normalizeKey(rawSku);
  if (!raw) return [];
  const out = new Set([raw]);
  const noHash = raw.includes("#") ? raw.split("#")[0] : raw;
  out.add(noHash);
  for (const base of [raw, noHash]) {
    for (const suf of LOCAL_SKU_SUFFIXES) {
      if (base.endsWith(suf)) out.add(base.slice(0, -suf.length));
    }
  }
  // planMap 舊邏輯曾把逗號換成 -
  if (raw.includes(",")) out.add(raw.replace(/,/g, "-"));
  if (noHash.includes(",")) out.add(noHash.replace(/,/g, "-"));
  return [...out].filter(Boolean);
}

/** unlimited / Daily2GB / Total10GB … 用來抓「偷換貨」 */
export function planFamily(name) {
  const s = String(name || "");
  if (/unlimited/i.test(s)) return "unlimited";
  const daily = s.match(/Daily\d+(?:GB|MB)/i);
  if (daily) return daily[0].toLowerCase();
  const total = s.match(/Total\d+(?:GB|MB)/i);
  if (total) return total[0].toLowerCase();
  if (/Daily/i.test(s)) return "daily";
  if (/Total/i.test(s)) return "total";
  return "other";
}

function looksLikeUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(v || "").trim(),
  ) || /^[0-9a-f]{32}$/i.test(String(v || "").trim());
}

async function getCatalogIndexes({ forceRefresh = false } = {}) {
  const fresh =
    !forceRefresh &&
    catalogCache.byId &&
    Date.now() - catalogCache.at < CATALOG_TTL_MS;
  if (fresh) return catalogCache;
  if (catalogInFlight) return catalogInFlight;

  catalogInFlight = fetchMicroesimCatalog()
    .then((plans) => {
      const byId = new Map();
      const byName = new Map();
      for (const p of plans || []) {
        const id = String(p.channel_dataplan_id || p.id || "").trim();
        const name = normalizeKey(p.channel_dataplan_name || p.name);
        const entry = {
          id,
          name,
          data: p.data || p.flow || "",
          day: p.day ?? null,
          status: p.status,
        };
        if (id) byId.set(id, entry);
        if (name) byName.set(name, entry);
      }
      catalogCache = { at: Date.now(), byId, byName };
      return catalogCache;
    })
    .finally(() => {
      catalogInFlight = null;
    });

  return catalogInFlight;
}

function resolveMappedId(sku, planIdMap = PLAN_ID_MAP) {
  for (const c of skuNameCandidates(sku)) {
    if (planIdMap[c]) return String(planIdMap[c]);
    // 與舊 resolveChannelDataplanId 相容：逗號→-
    const dashed = c.replace(/,/g, "-");
    if (dashed !== c && planIdMap[dashed]) return String(planIdMap[dashed]);
  }
  return "";
}

function skipPlanAvailabilityCheck() {
  const v = process.env.ESIM_SKIP_PLAN_AVAILABILITY;
  return v === "1" || /^true$/i.test(String(v || ""));
}

/**
 * @param {{ sku?: string, planId?: string, name?: string }} item
 * @returns {Promise<{
 *   ok: boolean,
 *   code?: string,
 *   message?: string,
 *   sku?: string,
 *   liveName?: string,
 *   channelDataplanId?: string,
 * }>}
 */
export async function validatePlanAvailability(item, opts = {}) {
  // 僅緊急開關可整段略過；ESIM_FORCE_TEST_PLAN 不再略過（否則幽靈方案會被放行）
  if (skipPlanAvailabilityCheck() && !opts.strictInTest) {
    return {
      ok: true,
      code: "SKIP_AVAILABILITY",
      sku: item?.sku,
      liveName: "SKIPPED",
      channelDataplanId: ESIM_TEST_PLAN_ID,
    };
  }

  const sku = normalizeKey(item?.sku);
  const planId = normalizeKey(item?.planId || item?.plan_id);
  const label = item?.name || sku || planId || "eSIM";

  if (!sku && !planId) {
    return {
      ok: false,
      code: "PLAN_MISSING",
      message: `「${label}」缺少方案 SKU／planId，無法下單`,
      sku,
    };
  }

  let catalog;
  try {
    catalog = await getCatalogIndexes({ forceRefresh: !!opts.forceRefresh });
  } catch (err) {
    // 本機 test 帳號拉不到正式目錄時：允許走測試訂購，但仍記錄
    if (shouldForceTestPlan() && !opts.strictInTest) {
      console.warn(
        "[planAvailability] catalog unavailable under FORCE_TEST → soft bypass",
        err?.message || err,
      );
      return {
        ok: true,
        code: "TEST_BYPASS_NO_CATALOG",
        sku,
        liveName: "TEST_PLAN",
        channelDataplanId: ESIM_TEST_PLAN_ID,
      };
    }
    return {
      ok: false,
      code: "CATALOG_UNAVAILABLE",
      message: `暫時無法向供應商確認方案狀態，請稍後再試（${err?.message || err}）`,
      sku,
    };
  }

  // 目錄為空（或幾乎空）時，無法可靠判斷 → 正式環境拒絕；測試環境 soft bypass
  if (!catalog?.byId?.size) {
    if (shouldForceTestPlan() && !opts.strictInTest) {
      return {
        ok: true,
        code: "TEST_BYPASS_EMPTY_CATALOG",
        sku,
        liveName: "TEST_PLAN",
        channelDataplanId: ESIM_TEST_PLAN_ID,
      };
    }
    return {
      ok: false,
      code: "CATALOG_UNAVAILABLE",
      message: "供應商方案目錄為空，暫時無法確認可否出貨，請稍後再試。",
      sku,
    };
  }

  const { byId, byName } = catalog;
  const candidates = skuNameCandidates(sku);

  // A) SKU 現名仍在目錄 → 通過
  for (const c of candidates) {
    const hit = byName.get(c);
    if (hit?.id) {
      return {
        ok: true,
        sku,
        liveName: hit.name,
        channelDataplanId: hit.id,
      };
    }
  }

  // B) 明確 UUID
  let resolvedId = looksLikeUuid(planId) ? planId : "";
  if (!resolvedId && looksLikeUuid(sku)) resolvedId = sku;
  if (!resolvedId) resolvedId = resolveMappedId(sku, opts.planIdMap || PLAN_ID_MAP);

  if (!resolvedId || !byId.has(resolvedId)) {
    return {
      ok: false,
      code: "PLAN_DELISTED",
      message: `「${label}」對應的供應商方案已下架或目錄中不存在，暫時無法下單。請改選其他天數／方案或聯絡客服。`,
      sku,
      channelDataplanId: resolvedId || undefined,
    };
  }

  const live = byId.get(resolvedId);
  const skuFam = planFamily(candidates[0] || sku);
  const liveFam = planFamily(live.name);

  // C) 幽靈舊名對到別的家族（unlimited → Daily2GB）→ 禁止偷換貨
  if (skuFam !== "other" && liveFam !== "other" && skuFam !== liveFam) {
    return {
      ok: false,
      code: "PLAN_SUBSTITUTED",
      message: `「${label}」供應商已更名／調整為「${live.name}」，與原方案類型不符，系統已禁止下單以免發錯貨。請改選目前目錄中的方案。`,
      sku,
      liveName: live.name,
      channelDataplanId: live.id,
    };
  }

  // D) 同家族改名（Vietnam-local → Vietnam、後綴拿掉）→ 允許發貨
  return {
    ok: true,
    sku,
    liveName: live.name,
    channelDataplanId: live.id,
    renamed: live.name !== sku,
  };
}

/**
 * @param {Array<{ sku?: string, planId?: string, name?: string }>} items
 */
export async function validatePlansAvailability(items, opts = {}) {
  const list = Array.isArray(items) ? items : [];
  const results = [];
  for (const it of list) {
    results.push(await validatePlanAvailability(it, opts));
  }
  const invalid = results.filter((r) => !r.ok);
  return {
    ok: invalid.length === 0,
    results,
    invalid,
    message: invalid[0]?.message || undefined,
    code: invalid[0]?.code || undefined,
  };
}

export function cartItemsToPlanChecks(cartItems = []) {
  return (cartItems || [])
    .filter((it) => {
      const meta = it.metadata || it.variant?.metadata || {};
      const type = String(
        meta.type || meta.product_type || it.type || "",
      ).toLowerCase();
      // 實體商城商品無供應商 plan，略過核對（否則藍新／LINE Pay 都會被擋）
      if (type === "physical") return false;
      if (meta.is_physical === true || meta.is_physical === "true") return false;
      return true;
    })
    .map((it) => {
    const variant = it.variant || {};
    const meta = it.metadata || variant.metadata || {};
    return {
      name: it.product_title || it.title || variant.title || meta.name || "eSIM",
      sku:
        it.variant_sku ||
        variant.sku ||
        it.sku ||
        meta.sku ||
        "",
      planId:
        meta.esim_plan_id ||
        meta.plan_id ||
        meta.planId ||
        it.planId ||
        it.plan_id ||
        "",
    };
  });
}
