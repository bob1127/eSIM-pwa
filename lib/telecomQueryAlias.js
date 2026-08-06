/**
 * 商品規格 query 社群防護：
 * - URL 只放 ASCII 別名（a-z 0-9 -）
 * - 內部／變體比對仍用完整電信商顯示名稱
 * - 舊連結（中文、全形括號、已編碼）仍可解析
 * - 未登錄的新電信商：自動 slugify（含短 hash），並用商品現有電信列表還原
 */

/** 顯示名稱 → 可讀安全別名（可選；沒登錄也能自動處理） */
export const TELECOM_TO_ALIAS = {
  "SK電信（韓國IP）": "sk-native",
  "LG U+ / SK電信": "lg-sk",
  "LG U+ / SKT 5G 雙切換": "lg-skt-dual",
  "SKT 5G": "skt",
  "AU(KDDI)": "au-kddi",
  KDDI: "kddi",
  "IIJ Docomo": "iij-docomo",
  "IIJ(DOCOMO)": "iij-docomo",
  "SoftBank / KDDI": "softbank-kddi",
  "SoftBank / KDDI 10Mbps": "softbank-kddi-10m",
  "KDDI / SoftBank": "kddi-softbank",
  中國移動: "cmcc",
  中國聯通: "cucc",
  "中國聯通 GPT + TikTok (CUCC)": "cucc-gpt",
  "Truemove H 當地號碼": "truemove",
  "TRRE 電信": "trre",
  "True Dtac": "trre", // 舊名 → 同別名
  "短天數｜中國電信／CSL／澳門電信": "cnhkmo-ct-short",
  "短天數｜中國移動／香港移動／澳門電訊": "cnhkmo-ct-short", // 舊名
  "長天數｜中國電信／聯通／CSL／澳門電訊": "cnhkmo-tc-long",
  "中國電信／聯通／CSL／澳門電訊": "cnhkmo-tc-daily",
  AIS: "ais",
  TRUE: "true",
  Viettel: "viettel",
  Vinaphone: "vinaphone",
  Wintel: "wintel",
  "CSL / China Telecom HK": "csl-ct",
  "CSL / SmarTone（總量型）": "csl-smartone-total",
  "CSL / SmarTone（每日型）": "csl-smartone-daily",
  "UMobile 5G": "umobile",
  "UMobile 5G 當地": "umobile",
  "Maxis / Celcom / Digi": "maxis-celcom-digi",
};

/** 別名 → 顯示名稱（同別名多個顯示名時取第一個登錄者） */
export const ALIAS_TO_TELECOM = (() => {
  const out = {};
  for (const [label, alias] of Object.entries(TELECOM_TO_ALIAS)) {
    if (!out[alias]) out[alias] = label;
  }
  return out;
})();

function decodeOnce(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

/** 穩定短 hash（新中文電信商 slug 去重用） */
function shortHash(str) {
  let h = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * 任意電信商名稱 → ASCII slug
 * 純英文可讀；含中文等特殊字元時附短 hash，避免撞名、可還原比對
 */
export function slugifyTelecom(label) {
  const s = String(label || "").trim().normalize("NFKC");
  if (!s) return "telecom";
  const ascii = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const hasNonAscii = /[^\x00-\x7F]/.test(s);
  if (!hasNonAscii && ascii) return ascii.slice(0, 48);
  const base = ascii && ascii.length >= 2 ? ascii : "t";
  return `${base}-${shortHash(s)}`.replace(/-+/g, "-").slice(0, 48);
}

/** 比對用：去掉空白／括號差異，全形轉半形 */
export function normalizeTelecomKey(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[（）()【】\[\]／/·・]/g, "")
    .toLowerCase();
}

function pickFromAvailable(candidate, available = []) {
  if (!candidate) return "";
  if (!available.length) return candidate;
  if (available.includes(candidate)) return candidate;
  const want = normalizeTelecomKey(candidate);
  const hit = available.find((a) => normalizeTelecomKey(a) === want);
  if (hit) return hit;
  const loose = available.find((a) => {
    const n = normalizeTelecomKey(a);
    return n.includes(want) || want.includes(n);
  });
  return loose || candidate;
}

/** 用現有電信列表，把 URL 別名對回顯示名稱 */
function matchAliasAgainstAvailable(alias, available = []) {
  if (!alias || !available.length) return "";
  const want = String(alias).toLowerCase();
  // 1) 手動表
  for (const label of available) {
    const mapped = TELECOM_TO_ALIAS[label];
    if (mapped && mapped === want) return label;
  }
  // 2) 自動 slug（新產品）
  for (const label of available) {
    if (slugifyTelecom(label) === want) return label;
    if (toTelecomQueryValue(label) === want) return label;
  }
  return "";
}

/** 寫入 URL：電信商 → 安全別名（無對照則自動 slugify） */
export function toTelecomQueryValue(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  if (TELECOM_TO_ALIAS[s]) return TELECOM_TO_ALIAS[s];
  // 已是已知手動別名
  if (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s) &&
    ALIAS_TO_TELECOM[s.toLowerCase()]
  ) {
    return s.toLowerCase();
  }
  // 已是 slug 形態且看起來像輸出結果 → 原樣
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(s) && !/[^\x00-\x7F]/.test(s)) {
    // 若整段就是某個已登錄別名字串當顯示名誤傳，上面已處理；其餘當 slug
    return s.toLowerCase();
  }
  return slugifyTelecom(s);
}

/**
 * 讀取 URL：別名／舊中文參數 → 實際電信商名稱
 * @param {string} raw
 * @param {string[]} [availableCarriers] 該商品電信商列表（新產品自動還原必備）
 */
export function resolveTelecomQuery(raw, availableCarriers = []) {
  const s = decodeOnce(raw);
  if (!s) return "";

  const lower = s.toLowerCase();

  // A) 手動別名表
  if (ALIAS_TO_TELECOM[lower]) {
    return pickFromAvailable(ALIAS_TO_TELECOM[lower], availableCarriers);
  }
  if (TELECOM_TO_ALIAS[s]) {
    return pickFromAvailable(s, availableCarriers);
  }

  // B) 對照商品現有電信商（含自動 slug 的新產品）
  const fromAvailable = matchAliasAgainstAvailable(lower, availableCarriers);
  if (fromAvailable) return fromAvailable;

  // C) 舊連結直接帶中文／特殊字元
  return pickFromAvailable(s, availableCarriers);
}

/** 寫入 URL：天數只留數字（5天 → 5） */
export function toDaysQueryValue(label) {
  const s = String(label || "").trim();
  const m = s.match(/(\d+)/);
  return m ? m[1] : s;
}

/** 讀取 URL：5／5天 → 對齊 option（多為純數字字串） */
export function resolveDaysQuery(raw, availableDays = []) {
  const s = decodeOnce(raw);
  if (!s) return "";
  const n = String(s).replace(/天$/u, "");
  if (availableDays.includes(n)) return n;
  const withDay = /^\d+$/.test(n) ? `${n}天` : s;
  if (availableDays.includes(withDay)) return withDay;
  if (availableDays.includes(s)) return s;
  return /^\d+$/.test(n) ? n : s;
}

/** 寫入 URL：無限流量 → unlimited；其餘保留如 5GB */
export function toDataAmountQueryValue(label) {
  const s = String(label || "").trim();
  if (!s) return "";
  if (/無限|unlimited/i.test(s)) return "unlimited";
  return s.replace(/\s+/g, "");
}

/** 讀取 URL data_amount */
export function resolveDataAmountQuery(raw, availableAmounts = []) {
  const s = decodeOnce(raw);
  if (!s) return "";
  if (/^unlimited$/i.test(s) || /無限/i.test(s)) {
    const hit = availableAmounts.find((a) => /無限|unlimited/i.test(a));
    return hit || "無限流量";
  }
  if (availableAmounts.includes(s)) return s;
  const norm = s.toUpperCase().replace(/\s+/g, "");
  const hit = availableAmounts.find(
    (a) => String(a).toUpperCase().replace(/\s+/g, "") === norm,
  );
  return hit || s;
}

/**
 * 組成商品頁 query（社群友善）
 * @param {{ telecom?: string, days?: string|number, data_amount?: string }} opts
 */
export function buildProductOptionQuery(opts = {}) {
  const q = new URLSearchParams();
  if (opts.telecom != null && opts.telecom !== "") {
    q.set("telecom", toTelecomQueryValue(opts.telecom));
  }
  if (opts.days != null && opts.days !== "") {
    q.set("days", toDaysQueryValue(opts.days));
  }
  if (opts.data_amount != null && opts.data_amount !== "") {
    q.set("data_amount", toDataAmountQueryValue(opts.data_amount));
  }
  return q.toString();
}

/**
 * 從 router.query 解析成內部選取狀態
 */
export function resolveProductOptionQuery(query = {}, available = {}) {
  const carriers = available.telecoms || available.carriers || [];
  const days = available.days || [];
  const amounts = available.dataAmounts || available.amounts || [];

  const out = {};
  const telecomRaw = query.telecom;
  const daysRaw = query.days;
  const dataRaw = query.data_amount;

  if (telecomRaw != null && telecomRaw !== "") {
    const raw = Array.isArray(telecomRaw) ? telecomRaw[0] : telecomRaw;
    out.telecom = resolveTelecomQuery(raw, carriers);
  }
  if (daysRaw != null && daysRaw !== "") {
    const raw = Array.isArray(daysRaw) ? daysRaw[0] : daysRaw;
    out.days = resolveDaysQuery(raw, days);
  }
  if (dataRaw != null && dataRaw !== "") {
    const raw = Array.isArray(dataRaw) ? dataRaw[0] : dataRaw;
    out.data_amount = resolveDataAmountQuery(raw, amounts);
  }
  return out;
}

/** 把 query 物件裡的規格改成安全別名（其餘參數原樣） */
export function sanitizeProductQueryForUrl(query = {}) {
  const next = { ...query };
  if (next.telecom != null && next.telecom !== "") {
    const raw = Array.isArray(next.telecom) ? next.telecom[0] : next.telecom;
    const resolved = resolveTelecomQuery(raw);
    next.telecom = toTelecomQueryValue(resolved || raw);
  }
  if (next.days != null && next.days !== "") {
    const raw = Array.isArray(next.days) ? next.days[0] : next.days;
    next.days = toDaysQueryValue(raw);
  }
  if (next.data_amount != null && next.data_amount !== "") {
    const raw = Array.isArray(next.data_amount)
      ? next.data_amount[0]
      : next.data_amount;
    next.data_amount = toDataAmountQueryValue(raw);
  }
  return next;
}
