import crypto from "crypto";

/**
 * 內部服務／維運腳本呼叫自家 eSIM 目錄 API 時使用的共享密鑰。
 * 獨立成一支小模組，讓伺服器端呼叫方不需要連帶載入 next-auth / supabase。
 */
export const ESIM_INTERNAL_TOKEN_HEADER = "x-esim-internal-token";

export function getEsimInternalToken() {
  return String(process.env.ESIM_INTERNAL_API_TOKEN || "").trim();
}

export function esimCatalogInternalHeaders() {
  const token = getEsimInternalToken();
  return token ? { [ESIM_INTERNAL_TOKEN_HEADER]: token } : {};
}

export function safeCompareToken(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
