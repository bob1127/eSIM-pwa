/**
 * 用量查詢補齊 FUP 規則：topupDetail 若缺 special_desc，
 * 用本機已匯入的 MicroeSIM 目錄（korea-unlimited 等）對照 sku／plan_id。
 * （含 fs，僅供 server／API 使用）
 */
import fs from "fs";
import path from "path";
import { buildFriendlyPlanDisplayName } from "./esimPlanDisplayName";

export {
  buildFriendlyPlanDisplayName,
  resolveMemberEsimDisplayName,
} from "./esimPlanDisplayName";

let cachedRows = null;
let cachedAllRows = null;

function loadJsonCatalogFile(filePath) {
  try {
    const catalog = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const rows = [];
    for (const key of Object.keys(catalog || {})) {
      if (["source", "fetched_at", "note", "count", "count_tc", "count_skt"].includes(key)) {
        continue;
      }
      const list = catalog[key];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (p && (p.sku || p.plan_id)) rows.push(p);
      }
    }
    return rows;
  } catch {
    return [];
  }
}

/** 全部 *-plans.json（推播加購／FUP 補齊共用；只讀、不影響下單） */
export function loadAllCatalogRows() {
  if (cachedAllRows) return cachedAllRows;
  const rows = [];
  try {
    const dir = path.join(process.cwd(), "scripts/data");
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith("-plans.json")) continue;
      rows.push(...loadJsonCatalogFile(path.join(dir, file)));
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[trafficPlanCatalog] 無法載入 plans 目錄",
        err?.message || err,
      );
    }
  }
  cachedAllRows = rows;
  return rows;
}

function loadCatalogRows() {
  if (cachedRows) return cachedRows;
  cachedRows = loadAllCatalogRows();
  return cachedRows;
}

export function findCatalogPlan({ sku, planId, productName }) {
  const catalog = loadCatalogRows();
  const skuN = String(sku || "").trim();
  const planN = String(planId || "").trim();
  const nameN = String(productName || "").trim();

  if (skuN) {
    const hit = catalog.find((p) => p.sku === skuN);
    if (hit) return hit;
  }
  if (planN) {
    const hit = catalog.find((p) => p.plan_id === planN);
    if (hit) return hit;
  }
  if (nameN) {
    const skuFromName = nameN.match(
      /(South\s*Korea-(?:Promo|Local)-unlimited-\d+-[A-Za-z]\d+)/i,
    );
    if (skuFromName) {
      const normalized = skuFromName[1].replace(/\s+/g, " ");
      const hit = catalog.find(
        (p) =>
          p.sku &&
          p.sku.toLowerCase() === normalized.toLowerCase().replace(/\s/g, ""),
      );
      // sku 無空白：South Korea-Promo...
      const hit2 =
        hit ||
        catalog.find(
          (p) =>
            p.sku &&
            normalized.replace(/\s+/g, "").toLowerCase() ===
              p.sku.replace(/\s+/g, "").toLowerCase(),
        ) ||
        catalog.find((p) => p.sku && nameN.includes(p.sku));
      if (hit2) return hit2;
    }
    const hit = catalog.find(
      (p) =>
        p.sku === nameN ||
        (p.sku && nameN.includes(p.sku)) ||
        (p.sku && p.sku.includes(nameN)),
    );
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {object} data queryEsimUsage data
 */
export function enrichUsagePlanRules(data) {
  if (!data || typeof data !== "object") return data;

  let ruleDesc = data.ruleDesc || null;
  let specialDesc = data.specialDesc || null;
  let speedDesc = data.speedDesc || null;
  let hit = null;

  if (!ruleDesc || !specialDesc || !data.sku) {
    hit = findCatalogPlan({
      sku: data.sku,
      planId: data.planId,
      productName: data.productName,
    });
    if (hit) {
      ruleDesc = ruleDesc || hit.rule_desc || null;
      specialDesc = specialDesc || hit.special_desc || null;
      if (!data.sku && hit.sku) data.sku = hit.sku;
      if (!data.planId && hit.plan_id) data.planId = hit.plan_id;
    }
  }

  const productName = buildFriendlyPlanDisplayName({
    sku: data.sku,
    productName: data.productName,
    day: hit?.day ?? data.day ?? data.serviceDays,
    specialDesc,
    ruleDesc,
  });

  return {
    ...data,
    productName,
    ruleDesc,
    specialDesc,
    speedDesc,
  };
}
