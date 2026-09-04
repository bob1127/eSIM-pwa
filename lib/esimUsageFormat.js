/** 客戶端／伺服器共用的用量顯示格式（不可 import 含 service role 的模組） */

import { inferEsimInstalled } from "./esimInstallStatus";

/** 從供應商 SKU 解析使用天數，例：Taiwan-unlimited-2-5mbps-D0 → 2 */
export function parseServiceDaysFromPlanSku(name) {
  const s = String(name || "").trim();
  if (!s) return null;
  const unlimited = s.match(/unlimited-(\d+)/i);
  if (unlimited?.[1]) return unlimited[1];
  const daily = s.match(/Daily\d+(?:GB|MB)?-(\d+)/i);
  if (daily?.[1]) return daily[1];
  const tail = s.match(/-(\d+)-D\d+$/i);
  if (tail?.[1]) return tail[1];
  return null;
}

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
 * 解析供應商效期字串（多為 Asia/Taipei 無時區）
 * @returns {number|null} epoch ms
 */
export function parseExpiryMs(expiresAt) {
  const s = String(expiresAt || "").trim();
  if (!s) return null;
  // 僅日期：視為當日 Asia/Taipei 結束（23:59:59.999）
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const t = Date.parse(`${s}T23:59:59.999+08:00`);
    return Number.isFinite(t) ? t : null;
  }
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }
  const normalized = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(`${normalized}+08:00`);
  return Number.isFinite(t) ? t : null;
}

/**
 * 用量結果是否已過期（status 或 expiresAt）
 */
export function isEsimUsageExpired(usage, options = {}) {
  if (!usage || typeof usage !== "object") return false;
  const s = String(usage.status || usage.state || "").toLowerCase().trim();
  if (
    /expired|過期|ended|finished|terminated|失效|已結束|已過期|inactive/.test(s)
  ) {
    return true;
  }

  const installed = inferEsimInstalled(usage) === true;
  if (
    !installed &&
    isSupplierPreActivationMisleadingExpiry(usage, options)
  ) {
    const installMs = computeInstallDeadlineMs(usage, options);
    if (installMs != null) return installMs < Date.now();
    return false;
  }

  const endMs = parseExpiryMs(usage.expiresAt);
  if (endMs != null && endMs < Date.now()) return true;
  return false;
}

/**
 * 供應商效期字串 → 台灣時間顯示（含年月日＋時分）
 * 無時區時視為 Asia/Taipei（MicroeSIM 常見 `YYYY-MM-DD HH:mm:ss`）
 */
export function formatExpiryTaiwan(expiresAt, { withYear = true } = {}) {
  const s = String(expiresAt || "").trim();
  if (!s) return "";

  const ms = parseExpiryMs(s);
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

/** epoch ms → 台灣時間顯示 */
export function formatExpiryMsTaiwan(ms, { withYear = true } = {}) {
  if (!Number.isFinite(ms)) return "";
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

function resolveUsagePlanFields(usage = {}, options = {}) {
  const productName = usage?.productName || usage?.sku || "";
  const serviceDays =
    options.serviceDays ||
    usage?.serviceDays ||
    parseServiceDaysFromPlanSku(productName);
  const validityPeriod = options.validityPeriod || usage?.validityPeriod || null;
  return { serviceDays, validityPeriod, productName };
}

/** 出貨／購買日 + validity_period → 安裝截止 epoch ms */
export function computeInstallDeadlineMs(usage, options = {}) {
  const { validityPeriod } = resolveUsagePlanFields(usage, options);
  const days = Number(String(validityPeriod || "").trim());
  const anchor = usage?.provisionedAt || usage?.createdAt;
  if (!days || !anchor) return null;
  const startMs = parseExpiryMs(anchor);
  if (!Number.isFinite(startMs)) return null;
  return startMs + days * 86400000;
}

/**
 * 未啟用時，供應商 plan_end_date 常誤填為「出貨日 + 方案天數（day）」，
 * 並非 validity_period 安裝截止，也不代表旅行方案到期。
 */
export function isSupplierPreActivationMisleadingExpiry(usage, options = {}) {
  if (!usage?.expiresAt) return false;
  if (inferEsimInstalled(usage) === true) return false;

  const expMs = parseExpiryMs(usage.expiresAt);
  const anchorMs = parseExpiryMs(usage?.provisionedAt || usage?.createdAt);
  if (!Number.isFinite(expMs) || !Number.isFinite(anchorMs)) return false;

  const { serviceDays, validityPeriod } = resolveUsagePlanFields(usage, options);
  const useDays = Number(String(serviceDays || "").trim());

  if (useDays > 0) {
    const fromServiceDays = anchorMs + useDays * 86400000;
    if (Math.abs(expMs - fromServiceDays) < 36 * 3600000) return true;
  }

  const installDays = Number(String(validityPeriod || "").trim());
  if (installDays > useDays && useDays > 0) {
    const realInstallMs = anchorMs + installDays * 86400000;
    if (expMs < realInstallMs - 5 * 86400000) return true;
  }

  return false;
}

/**
 * 供應商 expiresAt 語意依是否已使用而不同：
 * - 未安裝：勿盲信 plan_end_date（常為出貨日+方案天數）；改以 validity_period 估算安裝截止
 * - 已啟用：deviceDetail.expire_time 才是方案到期
 */
export function resolveEsimExpiryDisplay(usage, options = {}) {
  const installed =
    options.installed != null
      ? Boolean(options.installed)
      : inferEsimInstalled(usage) === true;
  const expired =
    options.expired != null
      ? Boolean(options.expired)
      : isEsimUsageExpired(usage, options);

  if (!installed) {
    const { validityPeriod } = resolveUsagePlanFields(usage, options);
    const misleading = isSupplierPreActivationMisleadingExpiry(usage, options);
    const installMs = computeInstallDeadlineMs(usage, options);
    const installLabel = installMs
      ? formatExpiryMsTaiwan(installMs)
      : "";

    if (misleading) {
      if (installLabel && validityPeriod) {
        return {
          kind: "install_deadline",
          line: `請於 ${installLabel} 前完成安裝（購買後 ${validityPeriod} 天內）`,
          shortLine: `安裝期限 ${installLabel}`,
          footer: ` · 請於 ${installLabel} 前完成安裝`,
        };
      }
      return { kind: "none", line: "", shortLine: "", footer: "" };
    }

    const formatted = usage?.expiresAt ? formatExpiryTaiwan(usage.expiresAt) : "";
    if (!formatted) {
      if (installLabel && validityPeriod) {
        return {
          kind: "install_deadline",
          line: `請於 ${installLabel} 前完成安裝（購買後 ${validityPeriod} 天內）`,
          shortLine: `安裝期限 ${installLabel}`,
          footer: ` · 請於 ${installLabel} 前完成安裝`,
        };
      }
      return { kind: "none", line: "", shortLine: "", footer: "" };
    }

    if (expired) {
      return {
        kind: "expired",
        line: `已於 ${formatted} 失效（未在期限內完成安裝）`,
        shortLine: `已過期 · ${formatted}`,
        footer: ` · 已於 ${formatted} 失效`,
      };
    }

    return {
      kind: "install_deadline",
      line: `請於 ${formatted} 前完成安裝`,
      shortLine: `安裝期限 ${formatted}`,
      footer: ` · 請於 ${formatted} 前完成安裝`,
    };
  }

  const formatted = usage?.expiresAt ? formatExpiryTaiwan(usage.expiresAt) : "";
  if (!formatted) {
    return { kind: "none", line: "", shortLine: "", footer: "" };
  }

  if (expired) {
    return {
      kind: "expired",
      line: `方案已於 ${formatted} 到期`,
      shortLine: `已過期 · ${formatted}`,
      footer: ` · 方案已於 ${formatted} 到期`,
    };
  }

  return {
    kind: "plan_end",
    line: `方案到期 ${formatted}`,
    shortLine: `到期 ${formatted}`,
    footer: ` · 方案到期 ${formatted}`,
  };
}

/**
 * 合併用量結果＋訂單方案欄位（與主 tab EsimBottomSheet 同語意）
 * 未查詢時也可依 orderDate + validityPeriod 估安裝截止
 */
export function buildEsimUsageExpiryContext(usage, plan = null) {
  if (!usage && !plan) return null;
  const anchor =
    usage?.provisionedAt ||
    usage?.createdAt ||
    plan?.orderDate ||
    plan?.createdAt ||
    null;
  return {
    ...(usage || {}),
    validityPeriod:
      usage?.validityPeriod ||
      plan?.validityPeriod ||
      plan?.validity_period ||
      null,
    serviceDays:
      usage?.serviceDays || plan?.serviceDays || plan?.day || null,
    productName:
      usage?.productName || plan?.productName || plan?.name || null,
    sku: usage?.sku || plan?.planOfficialName || plan?.sku || null,
    createdAt: usage?.createdAt || anchor,
    provisionedAt: usage?.provisionedAt || anchor,
  };
}

/** 帳號流量／主 tab 共用：解析效期顯示 */
export function resolveEsimExpiryForPlan(usage, plan = null, extraOptions = {}) {
  const ctx = buildEsimUsageExpiryContext(usage, plan);
  if (!ctx) {
    return { kind: "none", line: "", shortLine: "", footer: "" };
  }
  const planOpts = {
    validityPeriod: plan?.validityPeriod || plan?.validity_period || null,
    serviceDays: plan?.serviceDays || plan?.day || null,
    ...extraOptions,
  };
  // 尚無用量結果：視為未安裝，才能顯示「購買後／安裝期限」
  if (!usage && planOpts.installed == null) {
    planOpts.installed = false;
  }
  return resolveEsimExpiryDisplay(ctx, planOpts);
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
