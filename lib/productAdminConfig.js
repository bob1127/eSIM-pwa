/**
 * 商品內容前台編輯器 — 管理者 Email 白名單。
 *
 * ⚠️ 安全性：只信任環境變數 PRODUCT_ADMIN_EMAILS／ADMIN_EMAIL（伺服器端設定，
 * 不會進入前端 bundle）。過去曾在原始碼中寫死一組預設管理者 Email 當
 * fallback，等同把「誰是永久管理員」寫進 git 歷史，且無法在不改程式碼、
 * 不重新部署的情況下撤銷。現已改為僅讀環境變數；請確認正式站（Vercel 等）
 * 也已設定 PRODUCT_ADMIN_EMAILS，否則此白名單會是空的。
 */
export function getAdminEmailAllowlist() {
  const raw =
    process.env.PRODUCT_ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return [
    ...new Set(
      raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function isAdminEmail(email) {
  if (!email) return false;
  return getAdminEmailAllowlist().includes(String(email).trim().toLowerCase());
}
