/**
 * 平台全域設定（server-only）：目前用於「夥伴底價平台抽成倍率」。
 *
 * 儲存於 Supabase 資料表 platform_settings：
 *   create table if not exists platform_settings (
 *     key        text primary key,
 *     value      text not null,
 *     updated_at timestamptz not null default now()
 *   );
 *
 * 讀取優先序：DB → 環境變數 PARTNER_B2B_COST_RATE → 預設 1.2。
 * 所有 async 進入點應在請求開始時呼叫 loadB2BMarkupMultiplier() 暖快取，
 * 之後同步的 getPartnerB2BMarkupMultiplier() 便能拿到 DB 設定值。
 */
import { getSupabaseAdminServer } from "./supabaseAdminServer";
import {
  sanitizeB2BMultiplier,
  setCachedB2BMultiplier,
  getCachedB2BMultiplier,
  getCachedB2BMultiplierAt,
} from "./platformSettingsCache";
import { DEFAULT_PARTNER_B2B_COST_RATE } from "./medusaPartnerPricing";

export const B2B_MARKUP_SETTING_KEY = "partner_b2b_cost_rate";

/** 快取 TTL：暖過快取後 30 秒內不重打 DB。 */
const CACHE_TTL_MS = 30_000;

/** 環境變數的倍率（驗證後）；無效回傳 null。 */
function envB2BMultiplier() {
  const raw = process.env.PARTNER_B2B_COST_RATE;
  if (raw == null || raw === "") return null;
  return sanitizeB2BMultiplier(raw);
}

/**
 * 從 DB 讀取倍率並寫入快取。找不到／異常時回退 env → 預設。
 * 一律回傳一個合法倍率（number）。
 */
export async function loadB2BMarkupMultiplier({ force = false } = {}) {
  if (typeof window !== "undefined") {
    // client 不讀 DB：用快取或預設
    return getCachedB2BMultiplier() ?? envB2BMultiplier() ?? DEFAULT_PARTNER_B2B_COST_RATE;
  }

  const cached = getCachedB2BMultiplier();
  const fresh = Date.now() - getCachedB2BMultiplierAt() < CACHE_TTL_MS;
  if (!force && cached != null && fresh) return cached;

  try {
    const supabase = getSupabaseAdminServer();
    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", B2B_MARKUP_SETTING_KEY)
      .maybeSingle();

    if (!error && data?.value != null) {
      const clean = setCachedB2BMultiplier(data.value);
      if (clean != null) return clean;
    }
  } catch (err) {
    // 資料表不存在／連線失敗都不致命：安靜退回 env/預設
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[platformSettings] 讀取 platform_settings 失敗，改用 env/預設：",
        err?.message || err,
      );
    }
  }

  const fallback = envB2BMultiplier() ?? DEFAULT_PARTNER_B2B_COST_RATE;
  // 也把 fallback 寫進快取（避免每次都打 DB）
  setCachedB2BMultiplier(fallback);
  return fallback;
}

/**
 * 寫入倍率到 DB 並即時更新快取。回傳 { ok, value, message }。
 */
export async function saveB2BMarkupMultiplier(rawValue) {
  const clean = sanitizeB2BMultiplier(rawValue);
  if (clean == null) {
    return {
      ok: false,
      message: "抽成倍率需為 1 ~ 5 之間的數字（例如 1.2 = 抽兩成、1.5 = 抽五成）",
    };
  }

  const supabase = getSupabaseAdminServer();
  const { error } = await supabase
    .from("platform_settings")
    .upsert(
      { key: B2B_MARKUP_SETTING_KEY, value: String(clean), updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) {
    return { ok: false, message: error.message };
  }

  setCachedB2BMultiplier(clean);
  return { ok: true, value: clean };
}

/** 目前生效倍率的來源與值（供後台顯示）。 */
export async function describeB2BMarkupMultiplier() {
  let dbValue = null;
  if (typeof window === "undefined") {
    try {
      const supabase = getSupabaseAdminServer();
      const { data } = await supabase
        .from("platform_settings")
        .select("value, updated_at")
        .eq("key", B2B_MARKUP_SETTING_KEY)
        .maybeSingle();
      if (data?.value != null) {
        dbValue = { value: sanitizeB2BMultiplier(data.value), updated_at: data.updated_at };
      }
    } catch {
      dbValue = null;
    }
  }

  const env = envB2BMultiplier();
  const effective =
    (dbValue?.value ?? null) ?? env ?? DEFAULT_PARTNER_B2B_COST_RATE;
  const source = dbValue?.value != null ? "db" : env != null ? "env" : "default";

  return {
    effective,
    source,
    dbValue: dbValue?.value ?? null,
    dbUpdatedAt: dbValue?.updated_at ?? null,
    envValue: env,
    defaultValue: DEFAULT_PARTNER_B2B_COST_RATE,
  };
}
