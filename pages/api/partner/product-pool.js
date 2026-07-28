import { fetchAllMedusaStoreProducts } from "../../../lib/medusaStoreApi";
import {
  applyPartnerB2BMarkup,
  getGlobalB2BCostRate,
} from "../../../lib/medusaPartnerPricing";
import { getSupabaseAdmin } from "../../../lib/partnerServer";

// 選品管理會反覆開關，Medusa 目錄短時間內幾乎不變；
// 記憶體快取可讓同溫執行環境內第二次開啟秒開。
const POOL_TTL_MS =
  Number(process.env.PARTNER_PRODUCT_POOL_CACHE_MS) || 5 * 60 * 1000;
let poolCache = { at: 0, payload: null };
let poolInFlight = null;

/**
 * 用 Supabase 已同步的 product_variations 補上 planCount / minB2B。
 * 對應順序：medusa_product_id → handle → 商品名稱（舊資料常缺前兩個欄位）。
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
    const { data: vars } = await supabase
      .from("product_variations")
      .select("product_id, b2b_price")
      .in("product_id", localIds);
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
    if (!stats || !stats.planCount) return p;
    return {
      ...p,
      planCount: stats.planCount,
      minB2B: applyPartnerB2BMarkup(stats.minApi),
      supabase_product_id: local.id,
    };
  });
}

async function loadPoolPayload() {
  const summaries = await fetchAllMedusaStoreProducts({ partnerPool: true });
  const products = await enrichPoolFromSupabase(summaries);
  return {
    products,
    pricing: {
      globalB2BCostRate: getGlobalB2BCostRate(),
      hint:
        "列表底價來自已同步快照（每日自動更新）；尚未同步的商品上架後會寫入完整底價。夥伴底價 = API 底價 × PARTNER_B2B_COST_RATE。",
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

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
