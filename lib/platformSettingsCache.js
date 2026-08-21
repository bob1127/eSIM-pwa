/**
 * 平台設定的行程內快取（無任何相依，client／server 皆可安全 import）。
 *
 * 為什麼需要它：
 * getPartnerB2BMarkupMultiplier()／applyPartnerB2BMarkup() 是「同步」函式，
 * 被前台顯示與結帳權威重算等大量路徑呼叫。我們要讓「平台抽成倍率」可從
 * boss 後台（DB）調整，但又不想把這些同步函式全部改成 async。
 *
 * 作法：伺服器端的 async 進入點（fetchStoreListings／computeAuthoritativeStoreOrder
 * ／各顯示 API）在請求開始時先 await 從 DB 載入倍率並寫進這個快取；隨後同步的
 * getPartnerB2BMarkupMultiplier() 只需讀快取即可。快取未命中時退回 env → 預設值。
 */

const B2B_MARKUP_MIN = 1;
const B2B_MARKUP_MAX = 5;

let cachedB2BMultiplier = null; // number | null
let cachedAtMs = 0;

/** 驗證倍率是否落在合理範圍（1~5）。無效回傳 null。 */
export function sanitizeB2BMultiplier(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < B2B_MARKUP_MIN || n > B2B_MARKUP_MAX) return null;
  return n;
}

/** 讀取快取中的倍率（同步）；未設定回傳 null。 */
export function getCachedB2BMultiplier() {
  return cachedB2BMultiplier;
}

/** 快取寫入時間（ms epoch），供 TTL 判斷。 */
export function getCachedB2BMultiplierAt() {
  return cachedAtMs;
}

/** 寫入快取（會先驗證範圍）。回傳實際寫入值或 null。 */
export function setCachedB2BMultiplier(raw) {
  const clean = sanitizeB2BMultiplier(raw);
  if (clean == null) return null;
  cachedB2BMultiplier = clean;
  cachedAtMs = Date.now();
  return clean;
}

export const B2B_MARKUP_LIMITS = { min: B2B_MARKUP_MIN, max: B2B_MARKUP_MAX };
