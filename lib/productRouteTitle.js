/**
 * 混合「原生 / 漫遊」商品標題：依目前選中的變體（或電信商）解析顯示用標題。
 */
import { isNativeIpPlan } from "./isNativeIpPlan";

/** 標題同時含原生與漫遊，且以斜線分隔（例：原生eSIM / 漫遊） */
export function isHybridNativeRoamingTitle(title) {
  const s = String(title || "");
  return /原生/i.test(s) && /漫遊/i.test(s) && /[/／]/.test(s);
}

function resolveHybridRouteProductTitleSegment(segment, { isNative }) {
  const s = String(segment || "").trim();
  if (!s || !isHybridNativeRoamingTitle(s)) return s;
  if (isNative !== true && isNative !== false) return s;

  const slash = "[/／]";
  const nativePart = "原生(?:e?SIM|線路|ESIM|IP)?";
  const roamPart = "漫遊(?:e?SIM|線路|ESIM|IP)?";

  if (isNative === true) {
    return s
      .replace(new RegExp(`\\s*${slash}\\s*${roamPart}`, "giu"), "")
      .replace(new RegExp(`${roamPart}\\s*${slash}\\s*`, "giu"), "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return s
    .replace(new RegExp(`${nativePart}\\s*${slash}\\s*`, "giu"), "")
    .replace(new RegExp(`\\s*${slash}\\s*${nativePart}`, "giu"), "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 解析含「｜」的 SEO 標題：只處理第一段內的原生／漫遊 slash 文案 */
export function resolveHybridRouteProductTitle(title, { isNative } = {}) {
  const s = String(title || "").trim();
  if (!s) return s;
  if (isNative !== true && isNative !== false) return s;

  const parts = s.split("｜");
  const head = resolveHybridRouteProductTitleSegment(parts[0], { isNative });
  if (parts.length === 1) return head;
  return [head, ...parts.slice(1)].join("｜");
}

function carrierSpecsOf(product) {
  return (
    product?.metadata?.carrier_specs_by_carrier ||
    product?.carrier_specs_by_carrier ||
    {}
  );
}

/**
 * @returns {'native'|'roaming'|null}
 */
export function resolveProductRouteKind({
  variation,
  product,
  telecom,
  carrierName,
} = {}) {
  const carrierSpecs = carrierSpecsOf(product);
  const tel = String(
    telecom || variation?.attributes?.telecom || "",
  ).trim();
  const carrierSpec =
    carrierSpecs[tel] || carrierSpecs[carrierName] || null;

  if (variation) {
    return isNativeIpPlan(
      {
        ...variation,
        attributes: variation.attributes || {},
        carrierSpec,
      },
      { carrier_specs_by_carrier: carrierSpecs },
    )
      ? "native"
      : "roaming";
  }

  if (tel && carrierSpec) {
    const hay = `${carrierSpec.ip_type || ""} ${carrierSpec.route_type || ""}`;
    if (/漫遊/.test(hay) && !/原生/.test(hay)) return "roaming";
    if (/原生/.test(hay)) return "native";
  }

  return null;
}

/** 商品頁 H1／麵包屑／SEO 顯示用標題 */
export function resolveProductDisplayTitle(productName, ctx = {}) {
  const base = String(productName || "").trim();
  if (!base || !isHybridNativeRoamingTitle(base)) return base;

  const kind = resolveProductRouteKind(ctx);
  if (kind === "native") {
    return resolveHybridRouteProductTitle(base, { isNative: true });
  }
  if (kind === "roaming") {
    return resolveHybridRouteProductTitle(base, { isNative: false });
  }
  return base;
}
