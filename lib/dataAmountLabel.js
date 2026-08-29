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
