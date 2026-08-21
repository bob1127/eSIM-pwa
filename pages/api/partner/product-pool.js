import { fetchAllMedusaStoreProducts } from "../../../lib/medusaStoreApi";
import {
  applyPartnerB2BMarkup,
  getGlobalB2BCostRate,
} from "../../../lib/medusaPartnerPricing";
import { getSupabaseAdmin } from "../../../lib/partnerServer";
import { loadB2BMarkupMultiplier } from "../../../lib/platformSettings";

// 選品管理會反覆開關，Medusa 目錄短時間內幾乎不變；
// 記憶體快取可讓同溫執行環境內第二次開啟秒開。
const POOL_TTL_MS =
  Number(process.env.PARTNER_PRODUCT_POOL_CACHE_MS) || 5 * 60 * 1000;
let poolCache = { at: 0, payload: null };
let poolInFlight = null;

/**
 * 用 Supabase 已同步的 product_variations 補上／覆寫 planCount / minB2B。
 *
 * 底價規則（與上架／結帳一致）：
 * - product_variations.b2b_price = API 原始底價（不含平台抽成）
 * - 列表顯示 minB2B = API × PARTNER_B2B_COST_RATE
 *
 * 對應順序：medusa_product_id → handle → 商品名稱。
 * 僅在 Supabase 有可靠底價時覆寫；否則保留 Medusa metadata.cost_price 算出的值。
 */
async function enrichPoolFromSupabase(products) {
  const supabase = getSupabaseAdmin();
  if (!supabase || !products?.length) return products;

  const nameTries = [
    "id, medusa_product_id, handle, name",
    "id, handle, name",
    "id, name",
  ];
  let localProducts = null;
  for (const cols of nameTries) {
    const { data, error } = await supabase.from("products").select(cols);
    if (!error) {
      localProducts = data || [];
      break;
    }
  }
  if (!localProducts?.length) return products;

  const localIds = localProducts.map((r) => r.id).filter(Boolean);
  const statsByLocalId = new Map();
  if (localIds.length) {
    const chunk = 200;
    for (let i = 0; i < localIds.length; i += chunk) {
      const slice = localIds.slice(i, i + chunk);
      const { data: vars } = await supabase
        .from("product_variations")
        .select("product_id, b2b_price")
        .in("product_id", slice);
      for (const v of vars || []) {
        const cur = statsByLocalId.get(v.product_id) || {
          planCount: 0,
          minApi: 0,
        };
        cur.planCount += 1;
        const api = Number(v.b2b_price) || 0;
        if (api > 0 && (cur.minApi === 0 || api < cur.minApi)) cur.minApi = api;
        statsByLocalId.set(v.product_id, cur);
      }
    }
  }

  const byMedusaId = new Map();
  const byHandle = new Map();
  const byName = new Map();
  const preferBetter = (map, key, row) => {
    if (!key) return;
    const prev = map.get(key);
    const prevN = prev ? statsByLocalId.get(prev.id)?.planCount || 0 : -1;
    const nextN = statsByLocalId.get(row.id)?.planCount || 0;
    if (!prev || nextN >= prevN) map.set(key, row);
  };
  for (const row of localProducts) {
    preferBetter(byMedusaId, row.medusa_product_id, row);
    preferBetter(byHandle, row.handle, row);
    preferBetter(byName, String(row.name || "").trim(), row);
  }

  return products.map((p) => {
    const local =
      byMedusaId.get(p.medusa_product_id) ||
      (p.handle ? byHandle.get(p.handle) : null) ||
      byName.get(String(p.name || "").trim());
    if (!local) return p;

    const stats = statsByLocalId.get(local.id);
    const next = { ...p, supabase_product_id: local.id };
    if (!stats?.planCount) return next;

    // 已同步快照：方案數一定覆寫；底價僅在 API 成本 > 0 時覆寫（避免把正確的 Medusa 底價蓋成 0）
    next.planCount = stats.planCount;
    if (stats.minApi > 0) {
      next.minB2B = applyPartnerB2BMarkup(stats.minApi);
      next.costSource = "supabase_snapshot";
    }
    return next;
  });
}

async function loadPoolPayload() {
  // partnerPool：Medusa 變體 metadata.cost_price／b2b_price → 夥伴可見底價
  // 再以 Supabase 已同步快照覆寫（上架過的商品）
  const summaries = await fetchAllMedusaStoreProducts({ partnerPool: true });
  const products = await enrichPoolFromSupabase(summaries);
  const withPrice = products.filter((p) => Number(p.minB2B) > 0).length;
  return {
    products,
    pricing: {
      globalB2BCostRate: getGlobalB2BCostRate(),
      syncedWithPrice: withPrice,
      total: products.length,
      hint:
        "底價優先用已同步快照（上架寫入的 API 成本）；其餘讀 Medusa 變體 cost_price／b2b_price。夥伴可見底價 = API 底價 × PARTNER_B2B_COST_RATE。上架當下會再同步最新成本。",
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  await loadB2BMarkupMultiplier();

  try {
    const force = req.query.refresh === "1";
    const fresh =
      !force &&
      poolCache.payload &&
      Date.now() - poolCache.at < POOL_TTL_MS;

    if (fresh) {
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("X-Partner-Pool-Cache", "HIT");
      return res.status(200).json(poolCache.payload);
    }

    if (!poolInFlight) {
      poolInFlight = loadPoolPayload()
        .then((payload) => {
          poolCache = { at: Date.now(), payload };
          return payload;
        })
        .finally(() => {
          poolInFlight = null;
        });
    }

    const payload = await poolInFlight;
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("X-Partner-Pool-Cache", force ? "REFRESH" : "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[product-pool]", err);
    return res.status(502).json({
      error: err.message || "無法讀取 Medusa 商品池",
    });
  }
}
