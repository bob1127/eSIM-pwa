/**
 * 維運腳本呼叫自家 /api/esim/list、/api/esim/test-list 時的內部憑證。
 * 正式站的目錄 API 只接受此 token 或管理者身分（見 lib/esimCatalogGuard.js）。
 * token 從 .env.local 的 ESIM_INTERNAL_API_TOKEN 取得，未設定時回空物件（本機 dev 不需要）。
 */
export function internalCatalogHeaders() {
  const token = String(process.env.ESIM_INTERNAL_API_TOKEN || "").trim();
  return token ? { "x-esim-internal-token": token } : {};
}
