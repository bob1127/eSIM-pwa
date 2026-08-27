/**
 * 判斷方案是否為原生 IP／原生線路（非漫遊）
 * 供流量試算建議卡、HOT SALE 顯示等共用。
 */

export function isNativeIpPlan(plan = {}, productMeta = {}) {
  const attrs = plan?.attributes || {};
  const telecom = String(
    attrs.telecom || plan.telecom || plan?.variant?.attributes?.telecom || "",
  ).trim();
  const specs =
    plan.carrierSpec ||
    productMeta?.carrier_specs_by_carrier?.[telecom] ||
    productMeta?.carrierSpecs?.[telecom] ||
    {};

  const hay = [
    attrs.ip_type,
    attrs.route_type,
    attrs.line,
    attrs.network,
    specs.ip_type,
    specs.route_type,
    plan.productName,
    plan.productLabel,
    productMeta?.title,
    productMeta?.name,
  ]
    .filter(Boolean)
    .join(" ");

  if (/漫遊/.test(hay) && !/原生/.test(hay)) return false;
  if (/原生\s*IP|本地\s*IP|本地IP|當地\s*IP|Native\s*IP/i.test(hay)) {
    return true;
  }
  if (/原生/.test(hay) && !/漫遊/.test(hay)) return true;
  if (/原生/.test(String(specs.route_type || attrs.route_type || "")) && !/漫遊/.test(hay)) {
    return true;
  }
  if (
    productMeta?.is_native === true ||
    productMeta?.native_esim === true ||
    productMeta?.native === true ||
    productMeta?.metadata?.is_native === true ||
    productMeta?.metadata?.native_esim === true ||
    plan.isNativeIp === true
  ) {
    return true;
  }
  // 雙網（含／）多為漫遊，除非文案已標原生
  if (telecom.includes("/") && !/原生/.test(hay)) return false;
  return false;
}
