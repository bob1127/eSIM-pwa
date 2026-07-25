/**
 * 伺服器端環境變數讀取（禁止在 client component 引用）
 */

export function getWooCommerceCredentials() {
  const baseUrl = (
    process.env.WORDPRESS_URL ||
    process.env.WC_API_BASE ||
    process.env.NEXT_PUBLIC_WP_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");

  const consumerKey =
    process.env.WOOCOMMERCE_CONSUMER_KEY ||
    process.env.WC_CONSUMER_KEY ||
    "";

  const consumerSecret =
    process.env.WOOCOMMERCE_CONSUMER_SECRET ||
    process.env.WC_CONSUMER_SECRET ||
    "";

  return { baseUrl, consumerKey, consumerSecret };
}

/** 內部 API / Cron / Admin：Bearer 或 query secret */
export function assertInternalSecret(req, res) {
  const expected =
    process.env.ADMIN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.PUSH_INTERNAL_SECRET ||
    "";

  if (!expected || expected.length < 24) {
    res.status(500).json({ error: "伺服器未設定足夠強度的內部密鑰" });
    return false;
  }

  const auth = req.headers.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const querySecret =
    typeof req.query?.secret === "string" ? req.query.secret : "";

  if (bearer !== expected && querySecret !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }

  return true;
}

/** production 關閉公開 debug；本機可用 ?secret= */
export function assertDebugAccess(req, res) {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return assertInternalSecret(req, res);
}
