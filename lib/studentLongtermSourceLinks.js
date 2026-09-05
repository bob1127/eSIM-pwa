/**
 * 學生／出差長天數商品 → 原本每日／總量／吃到飽（或短天數）商品連結
 * 用於「找不到你要的天數嗎？」
 */

/** @typedef {"daily"|"total"|"unlimited"} PlanKind */

/**
 * handle → 分類＋各方案類型來源商品
 * category 用於組 /product/{category}/{handle}/
 */
export const STUDENT_LONGTERM_SOURCE_MAP = {
  "australia-student-longterm-esim": {
    category: "australia",
    byPlan: {
      daily: "australia-daily-esim",
      total: "australia-total-esim",
      unlimited: "australia-unlimited-esim",
    },
  },
  "japan-student-longterm-esim": {
    category: "japan",
    byPlan: {
      daily: "daily-jp",
      total: "japan-total-esim",
      unlimited: "japan-unlimited-esim",
    },
  },
  "uk-student-longterm-esim": {
    category: "uk",
    byPlan: {
      daily: "uk-daily-esim",
      total: "uk-total-esim",
      unlimited: "uk-unlimited-esim",
    },
  },
  "canada-student-longterm-esim": {
    category: "canada",
    byPlan: {
      daily: "canada-daily-esim",
      total: "canada-total-esim",
      unlimited: "canada-unlimited-esim",
    },
  },
  "korea-student-longterm-esim": {
    category: "korea",
    byPlan: {
      daily: "korea-daily-esim",
      total: "korea-total-esim",
      unlimited: "korea-unlimited-esim",
    },
  },
  "singapore-student-longterm-esim": {
    category: "singapore",
    byPlan: {
      daily: "singapore-daily-esim",
      total: "singapore-total-esim",
      unlimited: "singapore-unlimited-esim",
    },
  },
  /** 美國原生卡長天數：短於 31 天改北美 AT&T */
  "usa-native-unlimited-longterm-esim": {
    category: "north-america",
    byPlan: {
      daily: "north-america-att-unlimited-esim",
      total: "north-america-att-unlimited-esim",
      unlimited: "north-america-att-unlimited-esim",
    },
  },
};

/**
 * @param {{ handle?: string, slug?: string, metadata?: Record<string, unknown> }|null|undefined} product
 */
export function isStudentLongtermProduct(product) {
  if (!product) return false;
  const handle = String(product.handle || product.slug || "").trim();
  if (STUDENT_LONGTERM_SOURCE_MAP[handle]) return true;
  const meta = product.metadata || {};
  if (meta.student_longterm === true || meta.student_business_zone === true) {
    return true;
  }
  return /student-longterm|longterm-esim/i.test(handle);
}

/**
 * @param {string} telecomLabel
 * @returns {PlanKind}
 */
export function inferPlanKindFromTelecom(telecomLabel) {
  const t = String(telecomLabel || "");
  if (/每日/.test(t)) return "daily";
  if (/總量/.test(t)) return "total";
  if (/吃到飽|不限流量|unlimited|無限/i.test(t)) return "unlimited";
  return "unlimited";
}

function productPath(category, handle) {
  const cat = String(category || "").replace(/^\/+|\/+$/g, "");
  const h = String(handle || "").replace(/^\/+|\/+$/g, "");
  if (!h) return null;
  if (!cat) return `/product/${h}/`;
  return `/product/${cat}/${h}/`;
}

/**
 * 從 metadata.cloned_from_handles 依方案類型挑來源 handle
 * @param {string[]} handles
 * @param {PlanKind} planKind
 */
function pickFromClonedHandles(handles, planKind) {
  const list = (handles || []).map((h) => String(h || "").trim()).filter(Boolean);
  if (!list.length) return null;
  const prefer =
    planKind === "daily"
      ? [/daily|每日/i]
      : planKind === "total"
        ? [/total|總量/i]
        : [/unlimited|吃到飽|unlim/i];
  const hit = list.find((h) => prefer.some((re) => re.test(h)));
  return hit || list.find((h) => /unlimited|吃到飽/i.test(h)) || list[0];
}

/**
 * @param {{ handle?: string, slug?: string, categories?: Array<{handle?: string}>, metadata?: Record<string, unknown> }|null|undefined} product
 * @param {string} [selectedTelecom]
 * @returns {string|null} 前台路徑（trailing slash）
 */
export function resolveStudentLongtermSourceHref(product, selectedTelecom = "") {
  if (!product || !isStudentLongtermProduct(product)) return null;

  const handle = String(product.handle || product.slug || "").trim();
  const planKind = inferPlanKindFromTelecom(selectedTelecom);
  const mapped = STUDENT_LONGTERM_SOURCE_MAP[handle];

  if (mapped) {
    const sourceHandle =
      mapped.byPlan?.[planKind] ||
      mapped.byPlan?.unlimited ||
      Object.values(mapped.byPlan || {})[0];
    if (sourceHandle) {
      return productPath(mapped.category, sourceHandle);
    }
  }

  const meta = product.metadata || {};
  const cloned = Array.isArray(meta.cloned_from_handles)
    ? meta.cloned_from_handles
    : [];
  const sourceHandle = pickFromClonedHandles(cloned, planKind);
  if (!sourceHandle) return null;

  const category =
    product.categories?.[0]?.handle ||
    String(meta.country || "")
      .toLowerCase()
      .replace(/\s+/g, "") ||
    handle.split("-")[0] ||
    "";

  // 日本每日型 handle 例外：daily-jp 仍在 japan 分類
  const cat =
    sourceHandle === "daily-jp"
      ? "japan"
      : /australia|japan|uk|canada|korea|singapore|usa|north-america/.test(
            sourceHandle,
          )
        ? sourceHandle.split("-")[0] === "north"
          ? "north-america"
          : sourceHandle.startsWith("usa")
            ? "usa"
            : sourceHandle.split("-")[0]
        : category;

  return productPath(cat, sourceHandle);
}
