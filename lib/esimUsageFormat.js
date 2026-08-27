/** 客戶端／伺服器共用的用量顯示格式（不可 import 含 service role 的模組） */

export function formatMb(mb) {
  if (mb == null || Number.isNaN(Number(mb))) return null;
  const n = Number(mb);
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${Math.round(n)} MB`;
}

export function usagePercent(remaining, total) {
  if (remaining == null || total == null || Number(total) <= 0) return null;
  return Math.min(100, Math.max(0, (Number(remaining) / Number(total)) * 100));
}

/** 流量監測／推播用時間（Asia/Taipei） */
export function formatTrafficCheckedAt(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * 供應商效期字串 → 台灣時間顯示（含年月日＋時分）
 * 無時區時視為 Asia/Taipei（MicroeSIM 常見 `YYYY-MM-DD HH:mm:ss`）
 */
export function formatExpiryTaiwan(expiresAt, { withYear = true } = {}) {
  const s = String(expiresAt || "").trim();
  if (!s) return "";

  let ms = NaN;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    ms = Date.parse(s);
  } else {
    const normalized = s.includes("T") ? s : s.replace(" ", "T");
    ms = Date.parse(`${normalized}+08:00`);
  }
  if (!Number.isFinite(ms)) return s.slice(0, 16);

  const opts = {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  if (withYear) opts.year = "numeric";

  return new Date(ms).toLocaleString("zh-TW", opts);
}

/** LINE 補充行：若模板未含監測時間則自動補上 */
export function ensureTrafficCheckedAtLine(text, checkedAt) {
  if (!checkedAt) return String(text || "").trim();
  const t = String(text || "").trim();
  if (t.includes("監測時間")) return t;
  const line = `※ 監測時間 ${checkedAt}`;
  return t ? `${t}\n${line}` : line;
}

/** Web Push 內文：若未含監測時間則附加一行 */
export function appendTrafficCheckedAtToBody(body, checkedAt) {
  if (!checkedAt) return body;
  if (String(body || "").includes("監測時間")) return body;
  return `${body}\n※ 監測時間 ${checkedAt}`;
}
