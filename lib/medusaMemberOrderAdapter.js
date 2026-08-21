/**
 * 適配層：把 Medusa 訂單（/store/member-orders 回傳）轉成會員中心 /
 * 手機底部 eSIM 元件既有的「Supabase orders」欄位格式，讓下游 UI 不必改。
 *
 * 目標欄位（沿用 AccountOrdersView / EsimBottomSheet 既有 contract）：
 *   id, status, created_at, total_amount, customer_email,
 *   item_details[], qrcode_data[], refund_requests[], store_id, payment_info,
 *   以及 __source: "medusa" 供除錯／合併去重使用。
 */

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch {
      return [];
    }
  }
  return [];
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Medusa 付款／出貨狀態 → 會員頁狀態詞彙 */
function mapStatus(order) {
  const meta = order?.metadata || {};
  const orderStatus = String(order?.status || "").toLowerCase();
  const payStatus = String(order?.payment_status || "").toLowerCase();

  if (orderStatus === "canceled" || orderStatus === "cancelled") {
    return "cancelled";
  }
  if (payStatus.includes("refund")) return "refunded";

  const isPaid =
    payStatus === "captured" ||
    payStatus === "partially_captured" ||
    Boolean(meta.newebpay_pay_time) ||
    Boolean(meta.linepay_pay_time);

  return isPaid ? "completed" : "pending";
}

/** 金額：以蓋章時記錄的實收整數為準，否則用 order.total */
function resolveAmount(order) {
  const meta = order?.metadata || {};
  const candidates = [
    meta.newebpay_amount,
    meta.linepay_amount,
    order?.total,
    order?.item_total,
    order?.subtotal,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  // 最後備援：明細加總
  const items = Array.isArray(order?.items) ? order.items : [];
  const sum = items.reduce(
    (acc, it) => acc + num(it?.total || num(it?.unit_price) * num(it?.quantity || 1)),
    0,
  );
  return Math.round(sum);
}

function normalizeSrc(raw) {
  const str = String(raw || "").split(",")[0].trim();
  if (!str) return "";
  return str.startsWith("http") || str.startsWith("data:image/")
    ? str
    : `data:image/png;base64,${str}`;
}

/** 舊單偶發只存 QR URL；從 microesim 檔名還原 ICCID（18–22 位數字） */
function iccidFromQrSrc(src) {
  const m = String(src || "").match(/\/(\d{18,22})(?:\?|$)/);
  return m ? m[1] : null;
}

/** metadata.esim_qrcodes → 會員頁 qrcode_data 陣列 */
function buildQrcodeData(order) {
  const raw = order?.metadata?.esim_qrcodes;
  const list = toArray(raw);
  return list
    .map((it, idx) => {
      if (!it) return null;
      const name =
        (it.productName && String(it.productName).trim()) ||
        (it.name && String(it.name).trim()) ||
        `eSIM #${idx + 1}`;
      const src = normalizeSrc(it.src ?? it.qrcodeUrl ?? (typeof it === "string" ? it : ""));
      const topupId = it.topupId || it.topup_id || null;
      const iccid = it.iccid || it.ICCID || iccidFromQrSrc(src) || null;
      if (!src && !topupId && !iccid && !it.lpa) return null;
      return {
        productName: name,
        name,
        src,
        qrcodeUrl: src,
        topupId,
        topup_id: topupId,
        iccid,
        smdp: it.smdp || "",
        activationCode: it.activationCode || "",
        lpa: it.lpa || "",
        apn: it.apn || null,
        serviceDays: it.serviceDays || "",
        networks: it.networks || "",
      };
    })
    .filter(Boolean);
}

/** Medusa line items → 會員頁 item_details 陣列 */
function buildItemDetails(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.map((it) => {
    const meta = it?.metadata || {};
    const name =
      it?.title || it?.product_title || meta.name || meta.productName || "eSIM 方案";
    return {
      name,
      productName: name,
      title: name,
      quantity: Math.max(1, num(it?.quantity) || 1),
      price: num(it?.unit_price),
      unit_price: num(it?.unit_price),
      variant_id: it?.variant_id || null,
      product_id: it?.product_id || null,
      planId: meta.planId || meta.plan_id || null,
      slug: meta.slug || meta.handle || null,
      categorySlug: meta.categorySlug || meta.category || meta.category_slug || null,
      image: it?.thumbnail || meta.image || null,
      thumbnail: it?.thumbnail || meta.image || null,
      specLabel: meta.specLabel || it?.variant_title || "",
      options: meta.options || it?.variant_title || "",
      telecom: meta.telecom || null,
      days: meta.days || null,
      data_amount: meta.data_amount || null,
      type: meta.type || "esim",
      store_id: null,
    };
  });
}

function resolvePaymentInfo(order) {
  const meta = order?.metadata || {};
  let info = meta.newebpay_offsite_info;
  if (typeof info === "string") {
    try {
      info = JSON.parse(info);
    } catch {
      info = null;
    }
  }
  return info && typeof info === "object" ? info : null;
}

/** 單筆 Medusa 訂單 → 會員頁訂單物件 */
export function adaptMedusaOrder(order) {
  if (!order?.id) return null;
  return {
    id: order.id,
    display_id: order.display_id || null,
    status: mapStatus(order),
    created_at: order.created_at || null,
    total_amount: resolveAmount(order),
    customer_email:
      order.email || order?.metadata?.checkout_email || null,
    item_details: buildItemDetails(order),
    qrcode_data: buildQrcodeData(order),
    payment_info: resolvePaymentInfo(order),
    refund_requests: [],
    store_id: null,
    __source: "medusa",
  };
}

export function adaptMedusaOrders(orders = []) {
  return (Array.isArray(orders) ? orders : [])
    .map(adaptMedusaOrder)
    .filter(Boolean);
}
