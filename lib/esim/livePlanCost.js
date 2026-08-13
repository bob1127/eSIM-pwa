/**
 * 夥伴底價「即時」成本來源：直接向 MicroeSIM 抓目前報價，取代「零售價 × 估算
 * 比例」或「當初手動填一次就不會變」的固定 metadata.b2b_price。
 *
 * 用量設計（避免外部 API 依賴／額度爆掉）：
 * - 每次刷新只打「1 次」MicroeSIM 目錄 API（一口氣抓全部方案清單），跟商品
 *   數量無關，量非常小，就算一天刷新多次也不會有問題。
 * - 匯率改用固定保守值（見 lib/esim/platformFx.js，與選品神器預設同一套），
 *   可用環境變數調整，不再打第三方即時匯率 API——
 *   那個服務免費額度很低（約每天 50 次），如果部署在 Serverless（記憶體
 *   不會跨呼叫保留），15 分鐘刷新一次就可能超額度。底價本來就是抓寬鬆一點
 *   的估算用途，不需要匯率精準到小數點。
 * - 目錄本身有記憶體快取（預設 60 分鐘，可調），只影響「同一個溫執行環境內
 *   短時間內重複查詢」要不要重打 API；真正決定 Supabase 底價快照多久更新
 *   一次的，是你排程呼叫 /api/admin/refresh-b2b-costs 的頻率（建議每天 1
 *   次到每小時 1 次都可以，成本差異可忽略——都只是 1 次 API 呼叫）。
 * - 這裡完全不會出現在結帳熱路徑（/api/create-order）；結帳一律讀 Supabase
 *   product_variations.b2b_price 這個快照，確保下單當下不會因供應商 API
 *   忙線／逾時而擋單。
 * - 抓不到即時報價（找不到方案／API 掛掉）時回傳 null，呼叫端會退回舊的
 *   估算邏輯，不會讓底價變成 0 或 NaN。
 */
import PLAN_ID_MAP from "./planMap";
import { fetchMicroesimCatalog } from "./microesimClient";
import { getPlatformFxRates } from "./platformFx";

const CATALOG_TTL_MINUTES = Number(process.env.ESIM_CATALOG_CACHE_MINUTES) || 60;
const CATALOG_TTL_MS = CATALOG_TTL_MINUTES * 60 * 1000;

let catalogCache = { at: 0, byLocation: new Map(), byId: new Map() };
let catalogInFlight = null;

function normalizeKey(v) {
  return String(v || "")
    .trim()
    .replace(/\u200B/g, "");
}

async function loadCatalog() {
  const plans = await fetchMicroesimCatalog();
  const byLocation = new Map();
  const byId = new Map();
  for (const p of plans || []) {
    const id = p.channel_dataplan_id || p.id;
    const location = p.location;
    const entry = {
      price: p.price,
      currency: p.currency,
      id,
      location,
      name: p.channel_dataplan_name || p.name,
    };
    if (location) byLocation.set(normalizeKey(location), entry);
    if (id) byId.set(String(id), entry);
  }
  return { at: Date.now(), byLocation, byId };
}

async function getCatalog({ forceRefresh = false } = {}) {
  const fresh = !forceRefresh && Date.now() - catalogCache.at < CATALOG_TTL_MS;
  // 用 byId 判斷「是否已有資料」：channel_dataplan_id 幾乎保證存在，
  // 原始 API 物件不一定有 location 欄位（那是 /api/esim/list.ts 事後補的），
  // 用 byLocation.size 當旗標在 0 筆 location 時會誤判成「未快取」而一直重抓。
  if (fresh && catalogCache.byId.size) return catalogCache;
  if (catalogInFlight) return catalogInFlight;

  catalogInFlight = loadCatalog()
    .then((next) => {
      catalogCache = next;
      return next;
    })
    .catch((err) => {
      console.error("[livePlanCost] 抓取 MicroeSIM 目錄失敗：", err?.message || err);
      // 失敗時沿用舊快取（哪怕過期），總比整批判定「查無方案」好
      return catalogCache;
    })
    .finally(() => {
      catalogInFlight = null;
    });

  return catalogInFlight;
}

function getFxRates() {
  return getPlatformFxRates();
}

/**
 * 幣別優先讀 API 回傳的 `currency` 欄位（實測全數為 HKD，且欄位穩定存在）。
 * 舊版曾用「金額 < 20 猜美金」的經驗法則（沿用 pages/admin/japan-scanner.jsx），
 * 但實測該法則會把約 2000+ 筆低價 HKD 方案誤判成 USD，讓底價暴增 33/4.5≈7.3
 * 倍，屬於資安／定價正確性問題，故僅在完全沒有 currency 欄位時才退回此猜測。
 */
function resolveCurrency(rawCurrency, rawPrice) {
  const normalized = String(rawCurrency || "").trim().toUpperCase();
  if (normalized === "USD" || normalized === "HKD") return normalized;
  return rawPrice > 0 && rawPrice < 20 ? "USD" : "HKD";
}

/**
 * 依 SKU 解析「當下」的 MicroeSIM 底價（TWD，無條件進位，寧可估高不估低）。
 * 找不到方案或發生任何錯誤都回傳 null，交由呼叫端退回舊的估算邏輯。
 *
 * @param {string} sku product_variations.sku（與 lib/esim/planMap.ts 的 key 同格式）
 * @returns {Promise<{ costTWD: number, currency: string, rawPrice: number, channelDataplanId: string, source: 'live_api' } | null>}
 */
export async function resolveLivePlanCostTWD(sku) {
  const key = normalizeKey(sku);
  if (!key) return null;

  try {
    const catalog = await getCatalog();
    let entry = catalog.byLocation.get(key);
    if (!entry) {
      const mappedId =
        PLAN_ID_MAP[key] || PLAN_ID_MAP[key.replace(/#[^#]+$/, "")];
      if (mappedId) entry = catalog.byId.get(String(mappedId));
    }
    if (!entry) return null;

    const rawPrice = parseFloat(entry.price || 0);
    if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;

    const currency = resolveCurrency(entry.currency, rawPrice);
    const rates = getFxRates();
    const rate = currency === "USD" ? rates.USD : rates.HKD;
    const costTWD = Math.ceil(rawPrice * rate);

    return {
      costTWD,
      currency,
      rawPrice,
      channelDataplanId: String(entry.id || ""),
      source: "live_api",
    };
  } catch (err) {
    console.error(`[livePlanCost] 解析 ${sku} 即時底價失敗：`, err?.message || err);
    return null;
  }
}

/** 供後台批次刷新用：強制重抓目錄（略過記憶體快取） */
export async function refreshCatalogNow() {
  return getCatalog({ forceRefresh: true });
}
