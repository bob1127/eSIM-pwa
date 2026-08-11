import { requireAdmin } from "../../../lib/adminAuth";
import {
  OVERVIEW_NOTICES_METADATA_KEY,
  parseOverviewNoticesByCarrier,
} from "../../../lib/productOverviewNotices";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const INTERNAL_SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

/**
 * POST /api/admin/product-overview-notices
 * body: { productId, carrier, fup_notice?, activation_notice?, special_notice? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 16) {
    return res.status(503).json({
      error: "伺服器未設定 PRODUCT_CONTENT_ADMIN_SECRET",
    });
  }
  if (!PUBLISHABLE_KEY) {
    return res.status(503).json({
      error: "伺服器未設定 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    });
  }

  const { productId, carrier, fup_notice, activation_notice, special_notice } =
    req.body ?? {};

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "缺少 productId" });
  }
  if (!carrier || typeof carrier !== "string" || !carrier.trim()) {
    return res.status(400).json({ error: "缺少電信商 carrier" });
  }

  const carrierKey = carrier.trim();

  try {
    const upstream = await fetch(
      `${MEDUSA_URL}/store/internal/product-content`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Product-Admin-Secret": INTERNAL_SECRET,
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          productId,
          carrier: carrierKey,
          contentType: "overview",
          fup_notice: String(fup_notice ?? "").trim(),
          activation_notice: String(activation_notice ?? "").trim(),
          special_notice: String(special_notice ?? "").trim(),
          updatedBy: admin.email,
        }),
      },
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data.error || "儲存至 Medusa 失敗",
        detail: data.detail,
      });
    }

    const overviewMap = parseOverviewNoticesByCarrier(
      data[OVERVIEW_NOTICES_METADATA_KEY],
    );

    return res.status(200).json({
      success: true,
      carrier: carrierKey,
      overview_notices_by_carrier: overviewMap,
    });
  } catch (e) {
    return res.status(500).json({
      error: "儲存失敗",
      detail: e.message,
    });
  }
}
