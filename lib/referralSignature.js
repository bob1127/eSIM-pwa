// 伺服器端專用：簽章版推薦 Cookie，防止使用者於瀏覽器端竄改代碼或延長歸因效期。
//
// 背景問題：舊版 `jeko_ref`（見 lib/partnerReferral.js）是純文字 Cookie，
// 由前端 JS 寫入、也由前端 JS 讀出後隨結帳請求送到後端。使用者能在 DevTools
// 直接修改 Cookie 值或其 Max-Age／Expires（例如把 30 天改成 5 個月），後端
// 完全無法分辨，因為代碼本身沒有任何「首次點擊時間」或防偽簽章。
//
// 解法：改由伺服器（/api/referral/hit）簽發 Cookie，內容為
//   `${code}.${firstClickedAtMs}.${HMAC-SHA256(secret, code+clickedAt)}`
// 並設定 HttpOnly（JS 無法讀寫）。下單時後端只信任「自己驗證過簽章、且時間戳
// 仍在效期內」的 Cookie；即使有人在瀏覽器手動竄改 Cookie 值或延長過期時間，
// 只要沒有伺服器端的 REFERRAL_COOKIE_SECRET 就無法產生合法簽章，該筆會被判定
// 無效（不計分潤），也無法透過拉長 Max-Age 讓一顆舊 Cookie「復活」。

import crypto from "crypto";
import { normalizeReferralCode, REFERRAL_COOKIE_DAYS } from "./partnerReferral";

export const SIGNED_REFERRAL_COOKIE = "jeko_ref_s";

function getSecret() {
  // ⚠️ 安全性：務必使用專用密鑰，不可 fallback 到 SUPABASE_SERVICE_ROLE_KEY
  // ——那把金鑰可繞過整個資料庫的 RLS，用途與此處 HMAC 完全不同；混用等於
  // 「Cookie 簽章機制的金鑰外洩風險」直接等同「資料庫服務金鑰外洩風險」，
  // 且兩者無法分開輪替。未設定時寧可回傳空字串（簽章失敗、Cookie 不生效），
  // 也不要用高權限金鑰頂替。
  return process.env.REFERRAL_COOKIE_SECRET || "";
}

function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function hmac(payload) {
  const secret = getSecret();
  if (!secret) return "";
  return base64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

/**
 * 伺服器簽發 Cookie 值：代碼 + 首次點擊時間（毫秒）+ 簽章。
 * 只應在 /api/referral/hit（或未來其他伺服器端接點）呼叫，絕不可在瀏覽器端執行。
 */
export function buildSignedReferralCookie(code, clickedAtMs = Date.now()) {
  const c = normalizeReferralCode(code);
  if (!c) return "";
  const payload = `${c}.${clickedAtMs}`;
  const sig = hmac(payload);
  if (!sig) return "";
  return `${payload}.${sig}`;
}

/**
 * 驗證 Cookie 值：簽章正確、且未超過歸因效期（預設 30 天）才視為有效。
 * 回傳 { code, clickedAtMs } 或 null。
 */
export function verifySignedReferralCookie(raw, maxDays = REFERRAL_COOKIE_DAYS) {
  if (!raw) return null;
  const parts = String(raw).split(".");
  if (parts.length !== 3) return null;

  const [code, clickedAtStr, sig] = parts;
  const clickedAtMs = Number(clickedAtStr);
  if (!code || !sig || !Number.isFinite(clickedAtMs)) return null;

  const expected = hmac(`${code}.${clickedAtStr}`);
  if (!expected) return null;

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const ageMs = Date.now() - clickedAtMs;
  const maxAgeMs = Math.max(1, Number(maxDays) || REFERRAL_COOKIE_DAYS) * 86400000;
  // ageMs < 0：時間戳被改到未來，一併視為無效
  if (ageMs < 0 || ageMs > maxAgeMs) return null;

  return { code: normalizeReferralCode(code), clickedAtMs };
}

/**
 * 從 Next.js API Route 的 req 取得「已驗證」的推薦代碼。
 * 這是唯一應被信任、可用於計算分潤的來源；請勿改回信任前端傳來的 referral_code 欄位。
 */
export function getVerifiedReferralCodeFromRequest(req) {
  const raw = req?.cookies?.[SIGNED_REFERRAL_COOKIE];
  const verified = verifySignedReferralCookie(raw);
  return verified?.code || "";
}

/** 組出可直接塞進 Set-Cookie 標頭的字串（HttpOnly，JS 完全無法讀寫或竄改）。 */
export function buildSetSignedReferralCookieHeader(
  code,
  { days = REFERRAL_COOKIE_DAYS, secure } = {},
) {
  const value = buildSignedReferralCookie(code);
  if (!value) return "";
  const maxAge = Math.max(1, Number(days) || REFERRAL_COOKIE_DAYS) * 86400;
  const isSecure = secure ?? process.env.NODE_ENV === "production";
  return `${SIGNED_REFERRAL_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`;
}
