/**
 * GET /api/admin/main-site-analytics
 *
 * 主站銷售分析（真實 Medusa 訂單，不含夥伴店）。
 * Auth：Boss Medusa Admin Bearer token（與 /admin-boss 相同）。
 *
 * Query：days（預設 9999）、status（all|completed|pending|refunded）
 */
import {
  getMedusaBackendUrl,
  requireMedusaAdminFromRequest,
} from "../../../lib/medusaAdminAuth";
import {
  buildMainSiteSalesReport,
  isPartnerMedusaOrder,
} from "../../../lib/mainSiteAnalytics";

const ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "payment_status",
  "email",
  "total",
  "subtotal",
  "item_total",
  "created_at",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.variant_id",
  "items.variant_sku",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.subtotal",
  "items.metadata",
  "items.variant.id",
  "items.variant.sku",
  "items.variant.metadata",
].join(",");

const PAGE_SIZE = 100;
const MAX_PAGES = 40; // 最多約 4000 筆

async function fetchAdminOrdersPage(token, { limit, offset }) {
  const base = getMedusaBackendUrl();
  const qs = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    order: "-created_at",
    fields: ORDER_FIELDS,
  });
  const res = await fetch(`${base}/admin/orders?${qs}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message || data.error || `Medusa 訂單查詢失敗 (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return {
    orders: Array.isArray(data.orders) ? data.orders : [],
    count: Number(data.count) || 0,
  };
}

async function fetchAllAdminOrders(token) {
  const all = [];
  let offset = 0;
  let total = Infinity;
  let pages = 0;

  while (offset < total && pages < MAX_PAGES) {
    const { orders, count } = await fetchAdminOrdersPage(token, {
      limit: PAGE_SIZE,
      offset,
    });
    total = count > 0 ? count : orders.length;
    all.push(...orders);
    pages += 1;
    offset += PAGE_SIZE;
    if (orders.length < PAGE_SIZE) break;
  }

  return { orders: all, fetched: all.length, totalCount: total };
}

/** 對缺少 variant.metadata.cost_price 的變體，批次向 Admin API 補成本 */
async function fillMissingVariantCosts(token, orders) {
  const need = new Set();
  for (const o of orders) {
    if (isPartnerMedusaOrder(o)) continue;
    for (const it of o.items || []) {
      const vMeta = it?.variant?.metadata || {};
      const iMeta = it?.metadata || {};
      const has =
        Number(vMeta.cost_price ?? vMeta.b2b_price ?? iMeta.cost_price ?? 0) > 0;
      const vid = it?.variant_id || it?.variant?.id;
      if (!has && vid) need.add(String(vid));
    }
  }

  const costByVariantId = {};
  if (need.size === 0) return costByVariantId;

  const base = getMedusaBackendUrl();
  const ids = Array.from(need);
  const chunk = 50;
  for (let i = 0; i < ids.length; i += chunk) {
    const slice = ids.slice(i, i + chunk);
    const qs = new URLSearchParams({
      limit: String(slice.length),
      fields: "id,sku,metadata",
    });
    for (const id of slice) qs.append("id[]", id);

    try {
      const res = await fetch(`${base}/admin/product-variants?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) continue;
      const list = data.variants || data.product_variants || [];
      for (const v of list) {
        const cost = Number(
          v?.metadata?.cost_price ?? v?.metadata?.b2b_price ?? 0,
        );
        if (v?.id && Number.isFinite(cost) && cost > 0) {
          costByVariantId[v.id] = Math.round(cost);
        }
      }
    } catch {
      /* 單批失敗不擋整份報表 */
    }
  }

  return costByVariantId;
}

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  res.setHeader("Cache-Control", "no-store");

  const days = Number(req.query.days) || 9999;
  const status = String(req.query.status || "all").toLowerCase();

  try {
    const { orders, fetched, totalCount } = await fetchAllAdminOrders(
      admin.token,
    );
    const mainSiteRaw = orders.filter((o) => !isPartnerMedusaOrder(o));
    const costByVariantId = await fillMissingVariantCosts(
      admin.token,
      mainSiteRaw,
    );
    const report = buildMainSiteSalesReport(mainSiteRaw, {
      days,
      status,
      costByVariantId,
    });

    return res.status(200).json({
      source: "medusa",
      filters: { days, status },
      meta: {
        medusaFetched: fetched,
        medusaTotalCount: totalCount,
        mainSiteCandidates: mainSiteRaw.length,
        partnerSkipped: orders.length - mainSiteRaw.length,
      },
      report,
    });
  } catch (err) {
    const statusCode = err.status === 401 ? 401 : 500;
    console.error("[main-site-analytics]", err?.message || err);
    return res.status(statusCode).json({
      error: err.message || "主站銷售分析載入失敗",
    });
  }
}
