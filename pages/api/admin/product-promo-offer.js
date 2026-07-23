import { requireAdmin } from "../../../lib/adminAuth";
import {
  PROMO_OFFER_METADATA_KEY,
  parsePromoOfferByCarrier,
  serializePromoOffer,
} from "../../../lib/productPromoOffer";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const INTERNAL_SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

/**
 * POST /api/admin/product-promo-offer
 * body: { productId, carrier, enabled, code, discount_type, discount_value, message? }
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

  const {
    productId,
    carrier,
    enabled,
    code,
    discount_type,
    discount_value,
    message,
  } = req.body ?? {};

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "缺少 productId" });
  }
  if (!carrier || typeof carrier !== "string" || !carrier.trim()) {
    return res.status(400).json({ error: "缺少電信商 carrier" });
  }

  const carrierKey = carrier.trim();
  const serialized = serializePromoOffer({
    enabled,
    code,
    discount_type,
    discount_value,
    message,
  });

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
          contentType: "promo",
          enabled: Boolean(serialized?.enabled),
          code: serialized?.code || "",
          discount_type: serialized?.discount_type || "percent",
          discount_value: serialized?.discount_value || 0,
          message: serialized?.message || "",
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

    const promoMap = parsePromoOfferByCarrier(data[PROMO_OFFER_METADATA_KEY]);

    return res.status(200).json({
      success: true,
      carrier: carrierKey,
      promo_offer_by_carrier: promoMap,
      offer: promoMap[carrierKey] || null,
    });
  } catch (e) {
    return res.status(500).json({
      error: "儲存失敗",
      detail: e.message,
    });
  }
}
