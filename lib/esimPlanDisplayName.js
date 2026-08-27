/**
 * 純顯示名稱（無 Node fs）— 可安全進 client bundle。
 * 供應商 SKU → 中文方案名；含 Taiwan-Daily2GB-1-D1 誤標友善化。
 */

/**
 * 供應商 SKU（如 South Korea-Promo-unlimited-5-A0）→ 推播／列表用商品名
 */
export function buildFriendlyPlanDisplayName({
  sku,
  productName,
  day,
  specialDesc,
  ruleDesc,
} = {}) {
  const raw = String(productName || "").trim();
  const skuN = String(sku || "").trim();
  const hasCjk = /[\u4e00-\u9fff]/.test(raw);
  const looksLikeSku =
    !hasCjk &&
    (/^(South\s*Korea|Japan|China|Taiwan|Thailand|USA|Hong\s*Kong|Malaysia|Indonesia|Vietnam)-/i.test(
      raw,
    ) ||
      (skuN &&
        raw.replace(/\s+/g, "").toLowerCase() ===
          skuN.replace(/\s+/g, "").toLowerCase()) ||
      (!raw && Boolean(skuN)));

  if (raw && !looksLikeSku) return raw;

  const key = skuN || raw;
  const korea = key.match(
    /South\s*Korea-(Promo|Local)-unlimited-(\d+)/i,
  );
  if (korea) {
    const days = day != null ? String(day) : korea[2];
    const blob = [specialDesc, ruleDesc, key].filter(Boolean).join(" ");
    const quotaM = blob.match(
      /Daily\s+(\d+(?:\.\d+)?)\s*(GB|MB)|每日\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i,
    );
    const speedM = blob.match(
      /unlimited\s+(\d+(?:\.\d+)?)\s*(Mbps|mbps)|(\d+(?:\.\d+)?)\s*(Mbps|mbps)/i,
    );
    const quota = quotaM
      ? `${quotaM[1] || quotaM[3]}${(quotaM[2] || quotaM[4] || "GB").toUpperCase()}`
      : "1GB";
    const speed = speedM
      ? `${speedM[1] || speedM[3]}Mbps`
      : "10Mbps";
    return `韓國 eSIM ${days}日 · 每日${quota}高速之後約${speed}吃到飽`;
  }

  // Taiwan-Daily2GB-1-D1：1 天吃到飽下架後，舊 plan ID 實際落到此 SKU
  const twDaily = key.match(
    /Taiwan-Daily\s*(\d+(?:\.\d+)?)\s*(GB|MB)-(\d+)/i,
  );
  if (twDaily) {
    const days = day != null ? String(day) : twDaily[3];
    const unit = String(twDaily[2] || "GB").toUpperCase();
    return `台灣 eSIM · 每日${twDaily[1]}${unit} · ${days}天`;
  }

  // 其餘 Taiwan-unlimited-* 變體維持吃到飽命名
  const twUnl = key.match(
    /Taiwan-unlimited-(\d+)-(\d+(?:\.\d+)?)\s*mbps/i,
  );
  if (twUnl) {
    const days = day != null ? String(day) : twUnl[1];
    return `台灣 eSIM · ${days}天 · ${twUnl[2]}Mbps 吃到飽`;
  }

  const twUnlPlain = key.match(/Taiwan-unlimited-(\d+)(?:-|$)/i);
  if (twUnlPlain && !/mbps/i.test(key)) {
    const days = day != null ? String(day) : twUnlPlain[1];
    return `台灣 eSIM · ${days}天 吃到飽`;
  }

  return raw || skuN || "eSIM";
}

/**
 * 僅在履約／用量已帶回供應商 SKU（如 Taiwan-Daily2GB-1-D1）時友善化。
 * 不依 Medusa 變體標題推斷。
 */
export function resolveMemberEsimDisplayName({
  productName,
  planOfficialName,
  dataAllowance,
  serviceDays,
  sku,
  specialDesc,
} = {}) {
  const official = String(planOfficialName || sku || "").trim();
  const base = String(productName || "").trim() || "eSIM 方案";
  if (!official) return base;

  const friendly = buildFriendlyPlanDisplayName({
    sku: official,
    productName: official,
    day: serviceDays,
    specialDesc: specialDesc || dataAllowance,
  });
  return friendly && friendly !== official ? friendly : base;
}
