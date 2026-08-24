/**
 * 從方案名稱／供應商 rule_desc／special_desc 推斷流量提醒類型與動態參數
 * Korea Promo（LG U+/SK）目錄實例：
 *   rule_desc: "unlimited 10mbps"
 *   special_desc: "Daily 1 GB high-speed data + unlimited 10 Mbps afterward"
 */

/**
 * @typedef {'quota' | 'fup'} TrafficPlanKind
 */

/**
 * @param {{
 *   productName?: string | null,
 *   totalMb?: number | null,
 *   ruleDesc?: string | null,
 *   specialDesc?: string | null,
 *   speedDesc?: string | null,
 * }} input
 */
export function resolveTrafficPlanProfile(input = {}) {
  const productName = String(input.productName || "");
  const ruleDesc = String(input.ruleDesc || "");
  const specialDesc = String(input.specialDesc || "");
  const speedDesc = String(input.speedDesc || "");
  const blob = [productName, ruleDesc, specialDesc, speedDesc]
    .filter(Boolean)
    .join(" | ");

  const throttle = matchSpeed(blob);
  const highFromText = matchHighSpeedQuota(blob);

  const looksFup =
    /吃到飽|無限|unlimited|FUP|降速|之後.*Mbps|高速.*之後|用完後|afterward|high-?speed/i.test(
      blob,
    ) || Boolean(throttle && /吃到飽|無限|unlimited/i.test(blob));

  const looksQuota =
    !looksFup &&
    (/\d+\s*GB/i.test(productName) ||
      (input.totalMb != null && Number(input.totalMb) > 0));

  let kind = "quota";
  if (looksFup) kind = "fup";
  else if (looksQuota) kind = "quota";
  else if (/吃到飽|無限|unlimited/i.test(blob)) kind = "fup";

  const highSpeedQuotaLabel =
    highFromText ||
    (kind === "fup" && input.totalMb != null && Number(input.totalMb) > 0
      ? formatAmountMb(Number(input.totalMb))
      : null);

  return {
    kind,
    highSpeedQuotaLabel,
    throttleSpeedLabel: throttle,
    /** 供除錯：用了哪些原文 */
    sources: {
      productName: productName || null,
      ruleDesc: ruleDesc || null,
      specialDesc: specialDesc || null,
      speedDesc: speedDesc || null,
      totalMb: input.totalMb ?? null,
    },
  };
}

function matchSpeed(text) {
  const s = String(text || "");
  let m = s.match(/unlimited\s+(\d+(?:\.\d+)?)\s*(Mbps|mbps|Kbps|kbps)/i);
  if (m) {
    return /kbps/i.test(m[2]) ? `${m[1]} Kbps` : `${m[1]} Mbps`;
  }
  m = s.match(/(\d+(?:\.\d+)?)\s*(Mbps|mbps|Kbps|kbps|kb\/s|Kb\/s)/i);
  if (m) {
    const unit = m[2].replace(/kb\/s/i, "Kbps");
    return /kbps/i.test(unit) ? `${m[1]} Kbps` : `${m[1]} Mbps`;
  }
  m = s.match(
    /降速(?:至|到|為)?\s*(?:約)?\s*(\d+(?:\.\d+)?)\s*(Mbps|mbps|Kbps|kbps)?/i,
  );
  if (m) {
    const unit = (m[2] || "Mbps").replace(/kb\/s/i, "Kbps");
    return /kbps/i.test(unit) ? `${m[1]} Kbps` : `${m[1]} Mbps`;
  }
  return null;
}

/** 優先：Daily 1 GB／每日 1GB／高速 1GB */
function matchHighSpeedQuota(text) {
  const s = String(text || "");

  let m = s.match(
    /Daily\s+(\d+(?:\.\d+)?)\s*(GB|MB)\s*(?:high[-\s]?speed)?/i,
  );
  if (m) return formatAmountRaw(m[1], m[2]);

  m = s.match(/每日\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  if (m) return formatAmountRaw(m[1], m[2]);

  m = s.match(/高速\s*(\d+(?:\.\d+)?)\s*(GB|MB)(?![a-z])/i);
  if (m) return formatAmountRaw(m[1], m[2]);

  // 一般 GB／MB，但避开 Mbps
  const re = /(\d+(?:\.\d+)?)\s*(GB|MB)(?![a-z])/gi;
  const hits = [];
  let hit;
  while ((hit = re.exec(s))) {
    hits.push({
      label: formatAmountRaw(hit[1], hit[2]),
      index: hit.index,
    });
  }
  if (!hits.length) return null;

  const near = hits.find((h) => {
    const window = s.slice(Math.max(0, h.index - 12), h.index + 28);
    return /高速|high[-\s]?speed|每日|Daily|FUP/i.test(window);
  });
  return (near || hits[0]).label;
}

function formatAmountRaw(n, unit) {
  const u = String(unit).toUpperCase();
  if (u === "GB") {
    const num = Number(n);
    return Number.isInteger(num) ? `${num} GB` : `${num} GB`;
  }
  return `${Math.round(Number(n))} MB`;
}

function formatAmountMb(mb) {
  const n = Number(mb);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n >= 1024) {
    const gb = n / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${Math.round(n)} MB`;
}
