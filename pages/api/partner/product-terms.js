import {
  getAuthUserFromBearer,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { fetchAllVisibleStoreProducts } from "../../../lib/medusaStoreApi";
import {
  parsePercentMap,
  PARTNER_RATE_METADATA_KEY,
  REFERRAL_DISCOUNT_METADATA_KEY,
  resolveTelecomFromVariant,
} from "../../../lib/productPartnerTerms";
import { getPartnerReferralRate } from "../../../lib/partnerReferral";
import {
  clampReferralDiscountPercent,
  DEFAULT_REFERRAL_DISCOUNT_PERCENT,
} from "../../../lib/partnerReferralDiscount";

function findCarrierEntry(map, carrierName) {
  if (!map || !carrierName) return null;
  const carrier = String(carrierName).trim();
  if (map[carrier] != null) return map[carrier];
  const key = Object.keys(map).find(
    (k) => k.trim().toLowerCase() === carrier.toLowerCase(),
  );
  return key != null ? map[key] : null;
}

/** 與 referralOrderSync / resolveCartPartnerTerms 一致：電信商趴數 → 單一趴數 → 夥伴預設 */
function resolveEffectivePartnerRate(rateMap, carrier, defaultRate) {
  let rate = findCarrierEntry(rateMap, carrier);
  if (rate == null) {
    const vals = Object.values(rateMap).filter((n) => n > 0);
    if (vals.length === 1) rate = vals[0];
  }
  if (rate != null && rate > 0 && rate <= 100) {
    return { percent: rate, isDefault: false };
  }
  return { percent: defaultRate, isDefault: true };
}

function resolveEffectiveDiscount(
  discountMap,
  carrier,
  defaultDiscount,
  discountEnabled,
) {
  if (!discountEnabled) {
    return { percent: null, isDefault: false };
  }
  let pct = findCarrierEntry(discountMap, carrier);
  if (pct == null) {
    const vals = Object.values(discountMap).filter((n) => n > 0);
    if (vals.length === 1) pct = vals[0];
  }
  if (pct != null && pct > 0) {
    return { percent: pct, isDefault: false };
  }
  return { percent: defaultDiscount, isDefault: true };
}

function collectCarriersFromProduct(product, rateMap, discountMap) {
  const set = new Set([
    ...Object.keys(rateMap),
    ...Object.keys(discountMap),
  ]);
  for (const variant of product.variants || []) {
    const tel = resolveTelecomFromVariant(variant);
    if (tel) set.add(tel);
  }
  if (!set.size) set.add("全方案");
  return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-TW"));
}

/**
 * GET /api/partner/product-terms
 * 專屬連結夥伴：主站全部可售商品 × 電信商的分潤％／旅客折扣％
 * （未個別設定者帶夥伴預設趴數）
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) return res.status(401).json({ error: "請先登入" });

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.partner) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  if (access.partner.cooperation_model !== "referral") {
    return res.status(403).json({
      error: "此頁面僅供專屬連結夥伴使用",
    });
  }

  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");

  try {
    const products = await fetchAllVisibleStoreProducts();
    const partner = access.partner;
    const defaultPartnerRate = getPartnerReferralRate(partner);
    const discountEnabled = partner.referral_discount_enabled !== false;
    const defaultDiscount = discountEnabled
      ? clampReferralDiscountPercent(
          partner.referral_discount_percent ?? DEFAULT_REFERRAL_DISCOUNT_PERCENT,
        ) || DEFAULT_REFERRAL_DISCOUNT_PERCENT
      : null;

    const rows = [];

    for (const p of products) {
      const meta = p.metadata || {};
      const rateMap = parsePercentMap(meta[PARTNER_RATE_METADATA_KEY]);
      const discountMap = parsePercentMap(meta[REFERRAL_DISCOUNT_METADATA_KEY]);
      const carriers = collectCarriersFromProduct(p, rateMap, discountMap);

      rows.push({
        id: p.id,
        title: p.title || "",
        handle: p.handle || "",
        thumbnail: p.thumbnail || null,
        category_handle: p.categories?.[0]?.handle || null,
        carriers: carriers.map((carrier) => {
          const rate = resolveEffectivePartnerRate(
            rateMap,
            carrier,
            defaultPartnerRate,
          );
          const discount = resolveEffectiveDiscount(
            discountMap,
            carrier,
            defaultDiscount,
            discountEnabled,
          );
          return {
            carrier,
            partner_rate_percent: rate.percent,
            partner_rate_is_default: rate.isDefault,
            referral_discount_percent: discount.percent,
            referral_discount_is_default: discount.isDefault,
          };
        }),
      });
    }

    rows.sort((a, b) => a.title.localeCompare(b.title, "zh-TW"));

    const lineCount = rows.reduce((n, r) => n + r.carriers.length, 0);

    console.info(
      "[partner/product-terms]",
      `partner=${access.partner.id}`,
      `products=${rows.length}`,
      `lines=${lineCount}`,
    );

    return res.status(200).json({
      ok: true,
      catalog_version: 2,
      products: rows,
      product_count: rows.length,
      line_count: lineCount,
      discount_enabled: discountEnabled,
      default_partner_rate: defaultPartnerRate,
      default_referral_discount_percent: defaultDiscount,
    });
  } catch (err) {
    console.error("[partner/product-terms]", err.message);
    return res.status(500).json({
      error: err.message || "無法讀取方案分潤",
    });
  }
}
