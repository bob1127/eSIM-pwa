import { resolveAdminUser } from "./adminAuth";
import {
  ESIM_INTERNAL_TOKEN_HEADER,
  esimCatalogInternalHeaders,
  getEsimInternalToken,
  safeCompareToken,
} from "./esimInternalToken";

/**
 * MicroeSIM 完整方案目錄（成本價、供應商方案 ID、電信商、限速規則）是營業機密，
 * 一旦公開就等於把整份進價表送給同業。這裡集中管控所有會吐出目錄的 API：
 *
 * 1. 內部 token（伺服器對伺服器、維運腳本）
 * 2. 管理者身分（Supabase Bearer token 或 NextAuth session）
 *
 * 兩者皆不符合時一律回 404（不用 401/403，避免向掃描者確認端點存在），
 * 並強制 no-store，防止 CDN／瀏覽器把目錄資料快取成任何人都拿得到的檔案。
 */

export { ESIM_INTERNAL_TOKEN_HEADER, esimCatalogInternalHeaders };

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = Number(process.env.ESIM_CATALOG_RATE_LIMIT || 20);
const rateBuckets = new Map();

function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0];
  return (
    forwarded.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function hitRateLimit(key) {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  // 避免長時間執行的 instance 記憶體無限增長
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (now > v.resetAt) rateBuckets.delete(k);
    }
  }
  return bucket.count > RATE_LIMIT_MAX;
}

function lockdownHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  res.setHeader("Vary", "Authorization, Cookie");
}

function isTrustedOrigin(req) {
  const raw = req.headers.origin || req.headers.referer;
  // 非瀏覽器發出的請求（腳本、SSR）不帶 Origin/Referer，交由 token／身分驗證把關
  if (!raw) return true;

  const allowed = new Set(
    [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXTAUTH_URL,
      "http://localhost:3000",
    ]
      .filter(Boolean)
      .map((u) => {
        try {
          return new URL(u).host;
        } catch {
          return null;
        }
      })
      .filter(Boolean),
  );
  if (req.headers.host) allowed.add(req.headers.host);

  try {
    return allowed.has(new URL(raw).host);
  } catch {
    return false;
  }
}

/**
 * 目錄 API 守門員。通過回傳 true；未通過會直接寫出回應並回傳 false，
 * 呼叫端只要 `if (!(await guardEsimCatalog(req, res))) return;` 即可。
 */
export async function guardEsimCatalog(req, res) {
  lockdownHeaders(res);

  const token = getEsimInternalToken();
  const provided = req.headers[ESIM_INTERNAL_TOKEN_HEADER];
  if (token && safeCompareToken(provided, token)) return true;

  // 本機開發不擋，正式站（含 Vercel preview）一律驗身分
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL_ENV);
  if (!isProduction) return true;

  if (hitRateLimit(`catalog:${clientIp(req)}`)) {
    res.status(429).json({ error: "Too Many Requests" });
    return false;
  }

  if (!isTrustedOrigin(req)) {
    res.status(404).json({ error: "Not Found" });
    return false;
  }

  let admin = null;
  try {
    admin = await resolveAdminUser(req, res);
  } catch {
    admin = null;
  }
  if (admin) return true;

  res.status(404).json({ error: "Not Found" });
  return false;
}
