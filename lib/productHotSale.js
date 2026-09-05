/** Medusa metadata.hot_sale_telecoms — 推薦熱銷電信商 */

/** daily-jp：熱銷只標 IIJ Docomo、SoftBank（Android 手動 APN） */
export const DAILY_JP_HOT_SALE_TELECOMS = [
  "IIJ Docomo（注意：需手動設定 APN）",
  "SoftBank（注意：Android 通常需手動 APN）",
];

/** japan-unlimited-esim：熱銷 AU(KDDI) 10Mbps */
export const JAPAN_UNLIMITED_HOT_SALE_TELECOMS = ["AU(KDDI) 10Mbps"];

export function parseHotSaleTelecoms(raw) {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.map(String).filter(Boolean);
}

export function isHotSaleTelecom(hotSaleList, carrierName) {
  if (!carrierName || !hotSaleList?.length) return false;
  const carrier = String(carrierName).trim();
  const lower = carrier.toLowerCase();
  const paren = carrier.match(/\(([^)]+)\)\s*$/);
  const nested = paren ? String(paren[1]).trim().toLowerCase() : "";

  return hotSaleList.some((item) => {
    const h = String(item || "").trim();
    if (!h) return false;
    const hl = h.toLowerCase();
    if (hl === lower) return true;
    // 「吃到飽 不限流量 (IIJ Docomo)」↔「IIJ Docomo」
    const hParen = h.match(/\(([^)]+)\)\s*$/);
    const hNested = hParen ? String(hParen[1]).trim().toLowerCase() : "";
    if (nested && (hl === nested || hNested === nested || hNested === lower)) {
      return true;
    }
    if (hNested && hNested === lower) return true;
    return false;
  });
}

/** 依商品 handle 解析熱銷電信（daily-jp 有固定覆寫） */
export function resolveHotSaleTelecomsForProduct(product) {
  const handle = String(product?.handle || product?.slug || "").trim();
  if (handle === "daily-jp") return [...DAILY_JP_HOT_SALE_TELECOMS];
  if (handle === "japan-unlimited-esim") {
    return [...JAPAN_UNLIMITED_HOT_SALE_TELECOMS];
  }
  return parseHotSaleTelecoms(
    product?.hot_sale_telecoms ?? product?.metadata?.hot_sale_telecoms,
  );
}
