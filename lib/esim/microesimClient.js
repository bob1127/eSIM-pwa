/**
 * MicroeSIM 供應商共用設定與簽章。
 * 目前預設接測試環境（test.microesim.com），正式上線前改 .env 即可。
 */
import crypto from "crypto";

export const ESIM_TEST_PLAN_ID =
  (process.env.ESIM_TEST_PLAN_ID || "b1a926e1-d770-4e03-804e-c527b9397eb9").trim();

export const ESIM_ACCOUNT = (
  process.env.ESIM_ACCOUNT || "test_account_9999"
).trim();
export const ESIM_SECRET = (
  process.env.ESIM_SECRET || "7119968f9ff07654ga485487822g"
).trim();
export const ESIM_SALT = (
  process.env.ESIM_SALT || "c38ab89bd01537b3915848d689090e56"
).trim();
export const ESIM_BASE_URL = (
  process.env.ESIM_BASE_URL || "https://test.microesim.com"
).trim().replace(/\/$/, "");

/** 測試主機或明確開啟時，訂購一律改打測試方案 ID（方便跑通購買流程） */
export function shouldForceTestPlan() {
  const v = process.env.ESIM_FORCE_TEST_PLAN;
  if (v != null && v !== "") {
    return v === "1" || /^true$/i.test(v);
  }
  return /test\.microesim\.com/i.test(ESIM_BASE_URL);
}

export function getMicroesimConfig() {
  return {
    account: ESIM_ACCOUNT,
    secret: ESIM_SECRET,
    salt: ESIM_SALT,
    baseUrl: ESIM_BASE_URL,
    testPlanId: ESIM_TEST_PLAN_ID,
    forceTestPlan: shouldForceTestPlan(),
  };
}

export function signMicroesimHeaders({
  account = ESIM_ACCOUNT,
  secret = ESIM_SECRET,
  salt = ESIM_SALT,
} = {}) {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto
    .pbkdf2Sync(secret, Buffer.from(salt, "hex"), 1024, 32, "sha256")
    .toString("hex");
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey, "utf8"))
    .update(account + nonce + timestamp)
    .digest("hex");
  return { timestamp, nonce, signature };
}

export function microesimAuthHeaders(extra = {}) {
  const { timestamp, nonce, signature } = signMicroesimHeaders();
  return {
    "MICROESIM-ACCOUNT": ESIM_ACCOUNT,
    "MICROESIM-NONCE": nonce,
    "MICROESIM-TIMESTAMP": timestamp,
    "MICROESIM-SIGN": signature,
    ...extra,
  };
}

/**
 * 將商品 SKU / planId 解析成供應商 channel_dataplan_id。
 * 測試環境可強制改寫為 ESIM_TEST_PLAN_ID。
 */
export function resolveChannelDataplanId(rawPlanId, planIdMap = {}) {
  const cleaned = String(rawPlanId || "")
    .trim()
    .replace(/\u200B/g, "")
    .replace(/,/g, "-");
  if (shouldForceTestPlan()) {
    return ESIM_TEST_PLAN_ID;
  }
  if (!cleaned) return "";
  return planIdMap[cleaned] || cleaned;
}

function envStr(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

/**
 * 取得 MicroeSIM 完整方案目錄（與 pages/api/esim/list.ts 相同的來源優先序，
 * 獨立實作以免影響既有已在正式環境運作的購買/選品流程）。
 * 只回傳原始欄位陣列，不做快取（快取由呼叫端如 lib/esim/livePlanCost.js 處理）。
 */
export async function fetchMicroesimCatalog() {
  const axios = (await import("axios")).default;
  const { esimCatalogInternalHeaders } = await import("../esimInternalToken");

  const catalogProxy = envStr("ESIM_CATALOG_PROXY_URL");
  if (catalogProxy) {
    const response = await axios.get(catalogProxy, {
      timeout: 60000,
      headers: esimCatalogInternalHeaders(),
    });
    return response.data?.result || [];
  }

  const catalogBase = envStr("ESIM_CATALOG_BASE_URL");
  const catalogAccount = envStr("ESIM_CATALOG_ACCOUNT");
  const catalogSecret = envStr("ESIM_CATALOG_SECRET");
  const catalogSalt = envStr("ESIM_CATALOG_SALT");
  if (catalogBase && catalogAccount && catalogSecret && catalogSalt) {
    const { timestamp, nonce, signature } = signMicroesimHeaders({
      account: catalogAccount,
      secret: catalogSecret,
      salt: catalogSalt,
    });
    const response = await axios.get(
      `${catalogBase.replace(/\/$/, "")}/allesim/v1/esimDataplanList`,
      {
        headers: {
          "Content-Type": "application/json",
          "MICROESIM-ACCOUNT": catalogAccount,
          "MICROESIM-NONCE": nonce,
          "MICROESIM-TIMESTAMP": timestamp,
          "MICROESIM-SIGN": signature,
        },
        timeout: 45000,
      },
    );
    return response.data?.result || [];
  }

  if (shouldForceTestPlan() || /test\.microesim\.com/i.test(ESIM_BASE_URL)) {
    const fallback =
      envStr("ESIM_CATALOG_FALLBACK_URL") ||
      "https://www.jeko-esim.com.tw/api/esim/test-list";
    const response = await axios.get(fallback, {
      timeout: 60000,
      headers: esimCatalogInternalHeaders(),
    });
    return response.data?.result || [];
  }

  const response = await axios.get(
    `${ESIM_BASE_URL}/allesim/v1/esimDataplanList`,
    {
      headers: {
        "Content-Type": "application/json",
        ...microesimAuthHeaders(),
      },
      timeout: 45000,
    },
  );
  return response.data?.result || [];
}
