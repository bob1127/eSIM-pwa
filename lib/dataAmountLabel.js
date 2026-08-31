/** 是否為「5Mbps續航」數據量選項 */
export function is5MbpsDataAmount(amount) {
  return /5\s*Mbps\s*續航|5Mbps續航/i.test(String(amount || ""));
}

/** 顯示用：去掉括號內 5Mbps 標記（改由 UI badge 呈現） */
export function formatDataAmountMain(amount) {
  return String(amount || "")
    .replace(/（\s*5\s*Mbps\s*續航\s*）/gi, "")
    .replace(/\(\s*5\s*Mbps\s*續航\s*\)/gi, "")
    .trim();
}

/**
 * 從變體取數據量／天數／電信（優先 attributes，其次 title「電信 · N天 · 數據」）
 */
export function getVariationOptionAttrs(v) {
  const attrs = v?.attributes || {};
  const parts = String(v?.title || "")
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  let telecom = attrs.telecom || attrs.carrier || null;
  let days = attrs.days;
  let data_amount =
    attrs.data_amount || attrs.data || null;

  if (parts.length >= 3) {
    if (!telecom) telecom = parts[0];
    if (days == null || days === "") {
      const d = parseInt(parts[1], 10);
      if (Number.isFinite(d)) days = d;
    }
    if (!data_amount) data_amount = parts[2];
  } else if (parts.length === 2 && !data_amount) {
    data_amount = parts[1];
  }

  return {
    telecom: telecom ? String(telecom) : null,
    days: days != null && days !== "" ? String(parseInt(days, 10) || days) : null,
    data_amount: data_amount ? String(data_amount) : null,
  };
}

/** 顯示用：總量型高速額度（例 12GB →「高速 12GB」） */
export function formatHighSpeedQuotaLabel(dataAmount) {
  const main = formatDataAmountMain(dataAmount);
  if (!main || is5MbpsDataAmount(main)) return "";
  if (/^高速\s*/u.test(main)) return main.trim();
  return `高速 ${main}`;
}

/** 重點特色中「3～50GB」「12／21／30GB」等多規格摘要列 */
export function isDataAmountSummaryBullet(text) {
  const s = String(text || "").trim();
  if (!s || /^高速\s*\d/i.test(s)) return false;
  if (/(\d+\s*[～~\-–—]\s*\d+|\d+\s*[／/]\s*\d+).*?(GB|MB)/i.test(s)) {
    return true;
  }
  return /^\d+(?:\.\d+)?\s*(GB|MB)\s*[～~\-–—]\s*\d+/i.test(s);
}

/** 依已選 data_amount 把多規格 GB 摘要改為「高速 12GB」等 */
export function personalizeIntroBulletsForDataAmount(bullets, dataAmount) {
  const label = formatHighSpeedQuotaLabel(dataAmount);
  if (!label || !Array.isArray(bullets) || !bullets.length) {
    return bullets || [];
  }
  return bullets.map((line) =>
    isDataAmountSummaryBullet(line) ? label : line,
  );
}

/** speed_rule：方案總量高速用完後… → 方案總量高速 12GB，用完後… */
export function injectHighSpeedQuotaIntoSpeedRule(speedRule, dataAmount) {
  const main = formatDataAmountMain(dataAmount);
  if (!main || is5MbpsDataAmount(main) || !speedRule) return speedRule;
  const s = String(speedRule).trim();
  const escaped = main.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(escaped, "i").test(s)) return s;
  if (/方案總量高速\s*用完/u.test(s)) {
    return s.replace(/方案總量高速\s*用完/u, `方案總量高速 ${main}，用完`);
  }
  if (/總量高速\s*用完/u.test(s)) {
    return s.replace(/總量高速\s*用完/u, `總量高速 ${main}，用完`);
  }
  if (/^高速\s*用完/u.test(s)) {
    return s.replace(/^高速\s*用完/u, `高速 ${main}，用完`);
  }
  return s;
}

/** FUP 概覽：總量高速流量（12GB／21GB…）→ 總量高速流量（12GB） */
export function injectHighSpeedQuotaIntoFupNotice(fupNotice, dataAmount) {
  const main = formatDataAmountMain(dataAmount);
  if (!main || is5MbpsDataAmount(main) || !fupNotice) return fupNotice;
  let s = String(fupNotice);
  s = s.replace(
    /(總量高速流量)\s*[（(][^）)]*[～／\/\-–—][^）)]*[）)]/u,
    `$1（${main}）`,
  );
  const escaped = main.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(escaped, "i").test(s)) {
    s = s.replace(
      /(總量高速流量)\s*[（(][^）)]*[）)]/u,
      `$1（${main}）`,
    );
  }
  return s;
}

/** SSG 首屏 router.query 尚空時，用變體推第一個電信商（避免 tab 內容顯示 default 空白） */
export function inferDefaultTelecomFromVariations(variations = []) {
  const carriers = [
    ...new Set(
      variations
        .map((v) => getVariationOptionAttrs(v).telecom)
        .filter(Boolean),
    ),
  ];
  return carriers[0] || null;
}
