/**
 * 從 Supabase orders 抽出可監控的 eSIM（topup_id）
 */
import { resolveInstallUrls } from "./esimInstallLinks";
import { resolveMemberEsimDisplayName } from "./esimPlanDisplayName";

export function parseQrcodeData(raw) {
  if (!raw) return [];
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) {
    data = [data];
  }
  return Array.isArray(data) ? data : [];
}

function iccidFromQrSrc(src) {
  const m = String(src || "").match(/\/(\d{18,22})(?:\?|$)/);
  return m ? m[1] : null;
}

export function extractEsimsFromOrders(orders = []) {
  const seen = new Set();
  const esims = [];

  const pushEsim = ({ topupId, iccid, productName, order, profile }) => {
    const tid = topupId ? String(topupId) : null;
    const iid = iccid ? String(iccid) : null;
    // 至少要有其一才可列進流量監控；無 topup 時用 iccid: 當 key
    if (!tid && !iid) return;
    const key = tid || `iccid:${iid}`;
    if (seen.has(key)) return;
    seen.add(key);
    const install = resolveInstallUrls(profile || {});
    const rawQr = String(profile?.qrcodeUrl || profile?.src || "").trim();
    const qrcodeUrl =
      rawQr &&
      (rawQr.startsWith("http") ||
        rawQr.startsWith("data:") ||
        rawQr.startsWith("/"))
        ? rawQr
        : null;
    const storedName =
      productName || profile?.productName || profile?.name || "eSIM 方案";
    // 僅在履約資料已有供應商 planOfficialName／SKU 時友善化；不依 Medusa 變體推斷改寫
    const official =
      profile?.planOfficialName ||
      profile?.channel_dataplan_name ||
      profile?.sku ||
      "";
    const displayName = official
      ? resolveMemberEsimDisplayName({
          productName: storedName,
          planOfficialName: official,
          dataAllowance: profile?.dataAllowance || profile?.flow,
          serviceDays: profile?.serviceDays || profile?.day,
          specialDesc: profile?.specialDesc,
          sku: official,
        })
      : storedName;
    esims.push({
      topupId: tid || key,
      productName: displayName,
      orderId: order.id,
      orderDate: order.created_at,
      iccid: iid,
      status: order.status,
      missingTopupId: !tid,
      lpa: install.lpa || null,
      qrcodeUrl,
      iosInstallUrl: install.iosInstallUrl || null,
      androidInstallUrl: install.androidInstallUrl || null,
      planOfficialName: profile?.planOfficialName || null,
      dataAllowance: profile?.dataAllowance || null,
      serviceDays: profile?.serviceDays || profile?.day || "",
      validityPeriod:
        profile?.validityPeriod || profile?.validity_period || "",
    });
  };

  for (const order of orders) {
    const qrcodeItems = parseQrcodeData(order.qrcode_data);
    for (const item of qrcodeItems) {
      const src = item.qrcodeUrl || item.src || "";
      pushEsim({
        topupId: item.topupId || item.topup_id || null,
        iccid: item.iccid || item.ICCID || iccidFromQrSrc(src) || null,
        productName: item.productName || item.name,
        order,
        profile: item,
      });
    }

    const lineItems = Array.isArray(order.items) ? order.items : [];
    for (const item of lineItems) {
      pushEsim({
        topupId: item.topupId || item.topup_id || item.fulfilledTopupId || null,
        iccid: item.iccid || null,
        productName: item.name || item.productName,
        order,
        profile: item,
      });
    }
  }

  return esims.sort(
    (a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0),
  );
}

export function userOwnsTopupId(esims, topupId) {
  const tid = String(topupId || "").trim();
  if (!tid) return false;
  return (esims || []).some((e) => {
    if (!e) return false;
    if (String(e.topupId || "") === tid) return true;
    const iccid = String(e.iccid || "").trim();
    if (iccid && (tid === iccid || tid === `iccid:${iccid}`)) return true;
    return false;
  });
}

export function findOwnedEsim(esims, topupId) {
  const tid = String(topupId || "").trim();
  if (!tid) return null;
  return (
    (esims || []).find((e) => {
      if (!e) return false;
      if (String(e.topupId || "") === tid) return true;
      const iccid = String(e.iccid || "").trim();
      return Boolean(iccid && (tid === iccid || tid === `iccid:${iccid}`));
    }) || null
  );
}
