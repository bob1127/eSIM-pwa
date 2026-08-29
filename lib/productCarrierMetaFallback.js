/**
 * 商品頁 carrier metadata 共用後備：
 * URL 只帶部分規格時可能落到 carrier="default"，
 * 單電信商商品仍應顯示唯一一份內容（各國通用）。
 */

export function nonDefaultCarrierKeys(map) {
  if (!map || typeof map !== "object") return [];
  return Object.keys(map).filter((k) => k !== "default" && k !== "_default");
}

/** 避免 API 回傳 {} 覆蓋 ISR 已解析的 carrier metadata */
export function hasCarrierContentMap(map) {
  return (
    !!map &&
    typeof map === "object" &&
    !Array.isArray(map) &&
    Object.keys(map).length > 0
  );
}

/**
 * @param {Record<string, any>|null|undefined} map
 * @param {string|null|undefined} carrierName
 * @returns {any|null}
 */
export function soleCarrierFallback(map, carrierName) {
  if (!map || typeof map !== "object") return null;
  if (carrierName && carrierName !== "default") return null;
  const keys = nonDefaultCarrierKeys(map);
  if (keys.length !== 1) return null;
  return map[keys[0]] ?? null;
}
