/**
 * 流量提醒推播：解析「快速加購」商品頁連結（只讀目錄 JSON，不碰下單／QR）。
 *
 * 推三種 1 天方案（無 1 天則該類型取最短天數）：
 * - 每日型 daily
 * - 總量型 total
 * - 吃到飽 unlimited
 *
 * 若綁定方案本身為吃到飽 eSIM（SKU unlimited 家族），不推任何補方案加購。
 *
 * 同類型優先同電信（SKU 後綴 A0/B0），沒有再選其他電信。
 */
import { buildProductOptionQuery } from "./telecomQueryAlias";
import { getPublicSiteUrl } from "./siteUrl";
import { findCatalogPlan, loadAllCatalogRows } from "./trafficPlanCatalog";

/** @typedef {'daily' | 'total' | 'unlimited'} UpsellCategory */

const CATEGORY_CONFIG = [
  { id: "daily", label1: "每日型 1 天", labelN: (d) => `每日型 ${d} 天` },
  { id: "total", label1: "總量型 1 天", labelN: (d) => `總量型 ${d} 天` },
  {
    id: "unlimited",
    label1: "吃到飽 1 天",
    labelN: (d) => (d === 1 ? "吃到飽 1 天" : `吃到飽 ${d} 天`),
  },
];

/** 國家 slug → 商品 handle */
const PRODUCT_HANDLES = {
  korea: {
    daily: "korea-daily-esim",
    total: "korea-total-esim",
    unlimited: "korea-unlimited-esim",
  },
  japan: {
    daily: "japan-daily-esim",
    total: "japan-total-esim",
    unlimited: "japan-unlimited-esim",
  },
  thailand: {
    daily: "thailand-daily-esim",
    total: "thailand-total-esim",
    unlimited: "thailand-unlimited-esim",
  },
  malaysia: {
    daily: "malaysia-daily-esim",
    total: "malaysia-total-esim",
    unlimited: "malaysia-unlimited-esim",
  },
  singapore: {
    daily: "singapore-daily-esim",
    total: "singapore-total-esim",
    unlimited: "singapore-unlimited-esim",
  },
  indonesia: {
    daily: "indonesia-daily-esim",
    total: "indonesia-total-esim",
    unlimited: "indonesia-unlimited-esim",
  },
  hongkong: {
    daily: "hongkong-daily-esim",
    total: "hongkong-total-esim",
    unlimited: "hongkong-unlimited-esim",
  },
  china: {
    daily: "china-daily-esim",
    total: "china-total-esim",
    unlimited: "china-unlimited-esim",
  },
  vietnam: {
    daily: "vietnam-daily-esim",
    total: "vietnam-total-esim",
    unlimited: "vietnam-unlimited-esim",
  },
  usa: {
    daily: "usa-daily-esim",
    total: "usa-total-esim",
    unlimited: "usa-unlimited-esim",
  },
  canada: {
    daily: "canada-daily-esim",
    total: "canada-total-esim",
    unlimited: "usa-canada-unlimited-esim",
  },
  australia: {
    daily: "australia-daily-esim",
    total: "australia-total-esim",
    unlimited: "anz-unlimited-esim",
  },
  taiwan: {
    daily: "taiwan-daily-esim",
    total: "taiwan-total-esim",
    unlimited: "taiwan-unlimited-esim",
  },
};

const KOREA_TELECOM = {
  unlimited: { A0: "LG U+ / SK電信", B0: "SK電信（韓國IP）" },
  daily: { A0: "LG U+ / SK電信 5G 雙切換", B0: "SK電信 5G" },
  total: { A0: "LG U+ / SK電信 5G 雙切換", B0: "SK電信 5G" },
};

export function parseSkuMeta(sku) {
  const s = String(sku || "").trim();
  if (!s) return null;

  const tail = s.match(/-(\d+)-([A-Za-z]\d+)$/);
  const day = tail ? Number(tail[1]) : null;
  const suffix = tail ? tail[2] : null;

  let planType = "other";
  if (/unlimited/i.test(s)) planType = "unlimited";
  else if (/Daily/i.test(s)) planType = "daily";
  else if (/Total/i.test(s)) planType = "total";

  let flow = null;
  const flowM = s.match(/(Daily\d+(?:GB|MB)|Total\d+(?:GB|MB)|unlimited)/i);
  if (flowM) flow = flowM[1];

  return {
    sku: s,
    country: extractCountrySlug(s),
    day: Number.isFinite(day) ? day : null,
    suffix,
    planType,
    flow,
  };
}

function extractCountrySlug(sku) {
  const s = String(sku || "");
  if (/^South\s*Korea/i.test(s)) return "korea";
  if (/^Japan/i.test(s)) return "japan";
  if (/^Thailand/i.test(s)) return "thailand";
  if (/^Malaysia/i.test(s)) return "malaysia";
  if (/^Singapore/i.test(s)) return "singapore";
  if (/^Indonesia/i.test(s)) return "indonesia";
  if (/^Hong\s*Kong/i.test(s)) return "hongkong";
  if (/^China/i.test(s)) return "china";
  if (/^Vietnam/i.test(s)) return "vietnam";
  if (/^Taiwan/i.test(s)) return "taiwan";
  if (/^(USA|United\s*States)/i.test(s)) return "usa";
  if (/^Canada/i.test(s)) return "canada";
  if (/^(Australia|New\s*Zealand)/i.test(s)) return "australia";
  return null;
}

function extractCountryKey(sku) {
  const slug = extractCountrySlug(sku);
  const map = {
    korea: "South Korea",
    japan: "Japan",
    thailand: "Thailand",
    malaysia: "Malaysia",
    singapore: "Singapore",
    indonesia: "Indonesia",
    hongkong: "Hong Kong",
    china: "China",
    vietnam: "Vietnam",
    taiwan: "Taiwan",
    usa: "USA",
    canada: "Canada",
    australia: "Australia",
  };
  return slug ? map[slug] || null : null;
}

function sameCountrySku(a, b) {
  const ka = extractCountryKey(a);
  const kb = extractCountryKey(b);
  return ka && kb && ka === kb;
}

function sameTelecomSuffix(a, b) {
  const sa = String(a || "").match(/-([A-Za-z]\d+)$/);
  const sb = String(b || "").match(/-([A-Za-z]\d+)$/);
  if (!sa || !sb) return false;
  return sa[1] === sb[1];
}

function skuMatchesCategory(sku, category) {
  if (category === "daily") return /Daily/i.test(sku);
  if (category === "total") return /Total/i.test(sku);
  if (category === "unlimited") return /unlimited/i.test(sku);
  return false;
}

function inferTelecom(row, meta) {
  if (row?.telecom) return row.telecom;
  if (!meta) return null;
  if (meta.country === "korea" && meta.suffix) {
    return KOREA_TELECOM[meta.planType]?.[meta.suffix] || null;
  }
  if (meta.country === "korea") {
    if (/\(T\+C\)/i.test(row?.sku || meta.sku)) return KOREA_TELECOM.daily.A0;
    if (meta.suffix === "B0") return KOREA_TELECOM.daily.B0;
  }
  return null;
}

function inferDataAmount(row, meta) {
  if (row?.data_amount) return row.data_amount;
  if (!meta?.flow) return null;
  if (/^unlimited$/i.test(meta.flow)) return "unlimited";
  const daily = meta.flow.match(/^Daily(\d+(?:GB|MB))$/i);
  if (daily) {
    const num = daily[1].match(/^(\d+(?:\.\d+)?)(GB|MB)$/i);
    if (num) {
      return num[2].toUpperCase() === "GB"
        ? `每日 ${num[1]}GB`
        : `每日 ${num[1]}MB`;
    }
  }
  const total = meta.flow.match(/^Total(\d+(?:GB|MB))$/i);
  if (total) {
    return total[1].replace(/gb/i, "GB").replace(/mb/i, "MB");
  }
  return null;
}

function getProductHandle(country, planType) {
  return PRODUCT_HANDLES[country]?.[planType] || null;
}

function buildProductPathFromPlan(row) {
  const meta = parseSkuMeta(row?.sku);
  if (!meta?.country) return null;

  const planType = /Daily/i.test(row.sku)
    ? "daily"
    : /Total/i.test(row.sku)
      ? "total"
      : /unlimited/i.test(row.sku)
        ? "unlimited"
        : meta.planType;

  const handle = getProductHandle(meta.country, planType);
  if (!handle) {
    return meta.country ? `/product/${meta.country}/?days=1` : null;
  }

  const telecom = inferTelecom(row, { ...meta, planType });
  const dataAmount = inferDataAmount(row, meta);
  const qs = buildProductOptionQuery({
    telecom: telecom || undefined,
    days: row.day ?? 1,
    data_amount: dataAmount || undefined,
  });

  const base = `/product/${meta.country}/${handle}/`;
  return qs ? `${base}?${qs}` : base;
}

function rankDailyRow(a, b) {
  const gbA = Number(a.daily_gb) || 0;
  const gbB = Number(b.daily_gb) || 0;
  if (gbB !== gbA) return gbB - gbA;
  if (/Daily1GB/i.test(a.sku) && !/Daily1GB/i.test(b.sku)) return -1;
  if (/Daily1GB/i.test(b.sku) && !/Daily1GB/i.test(a.sku)) return 1;
  return String(a.sku).localeCompare(String(b.sku));
}

/**
 * @param {UpsellCategory} category
 */
function pickCategoryPlan(catalog, currentSku, category) {
  const rows = catalog.filter((row) => {
    if (!row?.sku || row.day == null) return false;
    if (!sameCountrySku(currentSku, row.sku)) return false;
    if (!skuMatchesCategory(row.sku, category)) return false;
    return Number(row.day) >= 1;
  });
  if (!rows.length) return null;

  const day1 = rows.filter((r) => Number(r.day) === 1);
  const pool = day1.length ? day1 : rows;

  const sameTelecom = pool.filter((r) => sameTelecomSuffix(currentSku, r.sku));
  const otherTelecom = pool.filter((r) => !sameTelecomSuffix(currentSku, r.sku));

  const sortPool = (list) => {
    list.sort((a, b) => {
      const dayDiff = Number(a.day) - Number(b.day);
      if (dayDiff !== 0) return dayDiff;
      if (category === "daily") return rankDailyRow(a, b);
      return String(a.sku).localeCompare(String(b.sku));
    });
    return list[0] || null;
  };

  return sortPool(sameTelecom) || sortPool(otherTelecom);
}

function buildOfferFromPlan(picked, category, currentSku) {
  if (!picked?.sku) return null;
  const path = buildProductPathFromPlan(picked);
  if (!path) return null;

  const day = Number(picked.day) || 1;
  const cfg = CATEGORY_CONFIG.find((c) => c.id === category);
  const label = day === 1 ? cfg?.label1 : cfg?.labelN?.(day);
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");

  return {
    id: category,
    label: label || `加購 ${day} 天`,
    path,
    url: `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`,
    targetSku: picked.sku,
    targetDay: day,
    sameTelecom: sameTelecomSuffix(currentSku, picked.sku),
  };
}

/**
 * @returns {Array<{
 *   id: string,
 *   label: string,
 *   path: string,
 *   url: string,
 *   targetSku: string,
 *   targetDay: number,
 *   sameTelecom: boolean,
 * }>}
 */
export function resolveTrafficUpsellOffers(input = {}) {
  const sku = String(input.sku || "").trim();
  const planId = input.planId || null;
  if (!sku && !planId) return [];

  let current =
    findCatalogPlan({ sku, planId, productName: input.productName }) || null;
  if (!current?.sku && sku) {
    current = { sku, day: parseSkuMeta(sku)?.day };
  }
  const currentSku = current?.sku || sku;
  if (!currentSku) return [];

  const currentMeta = parseSkuMeta(currentSku);
  if (currentMeta?.planType === "unlimited") return [];

  const catalog = loadAllCatalogRows();
  const offers = [];
  const seenUrls = new Set();

  for (const { id } of CATEGORY_CONFIG) {
    const picked = pickCategoryPlan(catalog, currentSku, id);
    const offer = buildOfferFromPlan(picked, id, currentSku);
    if (!offer || seenUrls.has(offer.url)) continue;
    seenUrls.add(offer.url);
    offers.push(offer);
  }

  return offers;
}

/** @deprecated 取第一個 offer；新程式請用 resolveTrafficUpsellOffers */
export function resolveTrafficUpsellLink(input = {}) {
  const offers = resolveTrafficUpsellOffers(input);
  if (!offers.length) return null;
  const first = offers[0];
  return {
    ...first,
    strategy: first.id,
  };
}
