/**
 * 從 Supabase orders 抽出可監控的 eSIM（topup_id）
 */
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

  const pushEsim = ({ topupId, iccid, productName, order }) => {
    const tid = topupId ? String(topupId) : null;
    const iid = iccid ? String(iccid) : null;
    // 至少要有其一才可列進流量監控；無 topup 時用 iccid: 當 key
    if (!tid && !iid) return;
    const key = tid || `iccid:${iid}`;
    if (seen.has(key)) return;
    seen.add(key);
    esims.push({
      topupId: tid || key,
      productName: productName || "eSIM 方案",
      orderId: order.id,
      orderDate: order.created_at,
      iccid: iid,
      status: order.status,
      missingTopupId: !tid,
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
      });
    }

    const lineItems = Array.isArray(order.items) ? order.items : [];
    for (const item of lineItems) {
      pushEsim({
        topupId: item.topupId || item.topup_id || item.fulfilledTopupId || null,
        iccid: item.iccid || null,
        productName: item.name || item.productName,
        order,
      });
    }
  }

  return esims.sort(
    (a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0),
  );
}

export function userOwnsTopupId(esims, topupId) {
  return esims.some((e) => e.topupId === String(topupId));
}
