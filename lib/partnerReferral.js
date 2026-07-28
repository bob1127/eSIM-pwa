/**
 * 專屬推薦連結（Saily 式）：?ref=代碼 + Cookie 30 天
 * 社群分享請用 /r/{code}（獨立 OG 圖），一般歸因仍可用 /?ref=
 * 與 /p/{slug} 開店賣場分開。
 */

export const REFERRAL_COOKIE = "jeko_ref";
export const REFERRAL_COOKIE_DAYS = 30;
/** 專屬連結預設：成本 × 25% */
export const DEFAULT_REFERRAL_RATE = 25;
/** 月達標後：成本 × 30% */
export const REFERRAL_BONUS_RATE = 30;
/** 當月有效訂單達此筆數 → 該月改用 30%（次月重算） */
export const REFERRAL_BONUS_ORDER_THRESHOLD = 40;
/** 預設行銷預覽圖（建議 1200×630 JPG）— 可換檔覆蓋 */
export const REFERRAL_DEFAULT_OG_PATH = "/images/referral/og-share.jpg";

export function normalizeReferralCode(raw) {
  if (!raw || typeof raw !== "string") return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");
}

/** 歸因用落地：官網首頁 + Cookie */
export function buildReferralUrl(siteUrl, code) {
  const base = String(siteUrl || "").replace(/\/$/, "");
  const c = normalizeReferralCode(code);
  if (!base || !c) return "";
  return `${base}/?ref=${encodeURIComponent(c)}`;
}

/**
 * 社群貼文用分享網址（獨立 OG，貼上會出專屬行銷圖）
 * 例：https://www.jeko-esim.com.tw/r/tokyo-travel
 */
export function buildReferralShareUrl(siteUrl, code) {
  const base = String(siteUrl || "").replace(/\/$/, "");
  const c = normalizeReferralCode(code);
  if (!base || !c) return "";
  return `${base}/r/${encodeURIComponent(c)}`;
}

export function resolveReferralOgImage(partner, siteUrl) {
  const custom =
    partner?.referral_og_image ||
    partner?.og_image ||
    partner?.share_image ||
    "";
  if (custom && /^https?:\/\//i.test(String(custom))) return String(custom);
  if (custom && String(custom).startsWith("/")) {
    const base = String(siteUrl || "").replace(/\/$/, "");
    return `${base}${custom}`;
  }
  const base = String(siteUrl || "").replace(/\/$/, "");
  return `${base}${REFERRAL_DEFAULT_OG_PATH}`;
}

/**
 * 基本／達標分潤趴數（固定規則）
 * - 基本：成本 × 25%
 * - 達標：成本 × 30%
 */
export function resolveReferralTierRates(_partner) {
  return {
    baseRate: DEFAULT_REFERRAL_RATE,
    bonusRate: REFERRAL_BONUS_RATE,
    threshold: REFERRAL_BONUS_ORDER_THRESHOLD,
  };
}

/** 依當月有效單量決定實際趴數（含本筆時傳 afterCount） */
export function referralRateForMonthCount(partner, monthValidCount) {
  const { baseRate, bonusRate, threshold } = resolveReferralTierRates(partner);
  const n = Number(monthValidCount) || 0;
  return n >= threshold ? bonusRate : baseRate;
}

/** 台灣曆月起迄（ISO UTC）— 分潤達標以台北時區計算 */
export function monthBoundsIso(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  // 台北該月 1 日 00:00 → UTC；下月 1 日 00:00 前一秒
  const start = new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+08:00`);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endExclusive = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+08:00`,
  );
  const end = new Date(endExclusive.getTime() - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function isReferralValidStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "completed" || s === "pending";
}

/**
 * 專屬連結分潤（與官網同價，夥伴不訂價）
 * 有成本時用成本計算；僅有售價時退回售價×趴（相容舊呼叫）。
 */
export function computeReferralProfit(amountOrCost, ratePercent, sellPrice) {
  const rate = Number(ratePercent);
  const pct = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_REFERRAL_RATE;
  const base = Number(amountOrCost) || 0;
  const raw = Math.round((base * pct) / 100);
  if (sellPrice != null && Number.isFinite(Number(sellPrice))) {
    const sell = Number(sellPrice);
    const gross = Math.max(0, sell - base);
    return Math.min(Math.max(0, raw), gross);
  }
  return Math.max(0, raw);
}

/** 總利潤點數 − 夥伴點數 = 你自動留下的點數 */
export function ownerMarkupFromPartner(totalMarkupPercent, partnerMarkupPoints) {
  const total = Number(totalMarkupPercent) || 0;
  const partner = Number(partnerMarkupPoints) || 0;
  return Math.round((total - partner) * 10) / 10;
}

/**
 * 瀏覽器：讀 Cookie。
 * ⚠️ 非權威來源——此 Cookie 可被使用者於瀏覽器端任意竄改代碼或延長效期，
 * 僅供前端即時顯示等非金流用途。分潤計算一律以 lib/referralSignature.js
 * 的伺服器簽章 Cookie（HttpOnly）驗證結果為準，請勿改回在下單流程中信任它。
 */
export function readReferralCookie() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`),
  );
  return match ? normalizeReferralCode(decodeURIComponent(match[1])) : "";
}

/** 瀏覽器：寫 Cookie（天數）。同上，僅供非權威的即時顯示用途。 */
export function writeReferralCookie(code, days = REFERRAL_COOKIE_DAYS) {
  if (typeof document === "undefined") return;
  const c = normalizeReferralCode(code);
  if (!c) return;
  const maxAge = Math.max(1, Number(days) || REFERRAL_COOKIE_DAYS) * 86400;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(c)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function isReferralPartner(partner) {
  return partner?.cooperation_model === "referral";
}

export function isStorePartner(partner) {
  return !partner?.cooperation_model || partner.cooperation_model === "store";
}

/** 社群爬蟲 UA：給 OG HTML；真人導向 /?ref= */
export function isSocialCrawlerUserAgent(ua) {
  return /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|pinterest|line-poker|line\/|linespider|googlebot|bingbot|applebot|embedly|quora link preview|showyoubot|outbrain|vkshare|redditbot|rogerbot|tumblr|bitlybot|skypeuripreview|nuzzel|viber|flipboard|yahoo!|duckduckbot/i.test(
    String(ua || ""),
  );
}

/** 從名稱推建議代碼（中文名會落到空字串 → 呼叫端用預設前綴） */
export function suggestCodeFromName(name) {
  const ascii = String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
  return normalizeReferralCode(ascii);
}

function randomCodeSuffix(len = 4) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/**
 * 自動配置不重複的夥伴代碼（slug / referral_code）
 * @param {{ from: Function }} supabase
 * @param {{ preferredBase?: string, forReferral?: boolean }} opts
 */
export async function allocateUniquePartnerCode(supabase, opts = {}) {
  const preferred = normalizeReferralCode(opts.preferredBase || "");
  const base = preferred || "jeko";
  const forReferral = opts.forReferral !== false;

  for (let attempt = 0; attempt < 14; attempt += 1) {
    const code =
      attempt === 0 && preferred.length >= 3
        ? preferred
        : `${base}-${randomCodeSuffix(attempt < 4 ? 4 : 6)}`;

    const { data: bySlug } = await supabase
      .from("partners")
      .select("id")
      .eq("slug", code)
      .maybeSingle();
    if (bySlug) continue;

    if (forReferral) {
      const { data: byRef } = await supabase
        .from("partners")
        .select("id")
        .eq("referral_code", code)
        .maybeSingle();
      if (byRef) continue;
    }

    return code;
  }

  return `jeko-${Date.now().toString(36)}`;
}

export { isReferralValidStatus };
