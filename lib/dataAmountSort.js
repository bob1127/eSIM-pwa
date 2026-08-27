import {
  formatDataAmountMain,
  is5MbpsDataAmount,
} from "@/lib/dataAmountLabel";

/**
 * 解析方案流量屬性（排序／估算共用）
 * - 吃到飽
 * - 每日型（每日500MB / 每日1GB）
 * - 總量型（3GB / 10GB）
 * - 總量 FUP（高速 XGB 後 FUP 吃到飽）
 */
export function parseDataCapacity(amount) {
  const s = String(amount || "").trim();
  if (!s) return null;

  const highSpeedFup = s.match(
    /高速\s*([\d.]+)\s*(GB|MB|TB|ｇｂ|ｍｂ|ｔｂ|吉|兆)?\s*後?\s*FUP/i,
  );
  if (highSpeedFup) {
    let gb = parseFloat(highSpeedFup[1]);
    const unit = String(highSpeedFup[2] || "GB").toUpperCase();
    if (Number.isFinite(gb) && gb > 0) {
      if (/MB|兆/.test(unit)) gb /= 1024;
      else if (/TB|ｔｂ/.test(unit)) gb *= 1024;
      return {
        kind: "total",
        dailyGb: null,
        totalGbFactor: gb,
        label: s,
      };
    }
  }

  if (/吃到飽|無限|unlimited/i.test(s)) {
    return {
      kind: "unlimited",
      dailyGb: Number.POSITIVE_INFINITY,
      totalGbFactor: Number.POSITIVE_INFINITY,
      label: s,
    };
  }

  const isDaily = /每日|每天|per\s*day|\/\s*day|day\s*pass/i.test(s);
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return null;

  let gb = num;
  const hasMb = /MB|ｍｂ|兆/i.test(s);
  const hasGb = /GB|ｇｂ|吉/i.test(s);
  if (hasMb && !hasGb) {
    gb = num / 1024;
  } else if (/TB|ｔｂ/i.test(s)) {
    gb = num * 1024;
  } else if (!hasGb && !hasMb && isDaily && num >= 100) {
    gb = num / 1024;
  }

  if (isDaily) {
    return {
      kind: "daily",
      dailyGb: gb,
      totalGbFactor: gb,
      label: s,
    };
  }

  return {
    kind: "total",
    dailyGb: null,
    totalGbFactor: gb,
    label: s,
  };
}

/** 方案用量遞增排序鍵（吃到飽最後；同額 5Mbps 續航緊跟標準方案） */
export function dataAmountSortKey(amount) {
  const main = formatDataAmountMain(amount);
  const cap = parseDataCapacity(main);
  if (!cap) return Number.MAX_SAFE_INTEGER - 1;
  const fiveBump = is5MbpsDataAmount(amount) ? 0.0001 : 0;
  if (cap.kind === "unlimited") return Number.MAX_SAFE_INTEGER;
  if (cap.kind === "daily") return cap.dailyGb + fiveBump;
  return cap.totalGbFactor + fiveBump;
}

export function compareDataAmountsAsc(a, b) {
  const diff = dataAmountSortKey(a) - dataAmountSortKey(b);
  if (diff !== 0) return diff;
  return String(a).localeCompare(String(b), "zh-Hant");
}

/** 變體上的 data_amount 原文去重後遞增排序（按鈕 value 仍用 Medusa 原文，價格配對不變） */
export function sortUniqueDataAmountLabels(labels) {
  return [...new Set((labels || []).map((x) => String(x).trim()).filter(Boolean))].sort(
    compareDataAmountsAsc,
  );
}
