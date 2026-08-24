/**
 * POST /api/admin/traffic-alert-preview
 * Boss：用假／真實欄位預覽「會推哪套文案」（固定流量 vs 吃到飽 FUP）
 * Body: { productName?, sku?, remainingMb, totalMb?, ruleDesc?, specialDesc? }
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { enrichUsagePlanRules } from "../../../lib/trafficPlanCatalog";
import { resolveTrafficPlanProfile } from "../../../lib/trafficPlanProfile";
import { shouldSendTrafficAlert } from "../../../lib/trafficMonitor";
import {
  buildLowTrafficWebPayload,
  buildLowTrafficLineText,
} from "../../../lib/trafficAlertCopy";
import { resolveTrafficUpsellOffers } from "../../../lib/trafficUpsellLink";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const body = req.body || {};
  const remainingMb =
    body.remainingMb != null ? Number(body.remainingMb) : 180;
  const totalMb = body.totalMb != null ? Number(body.totalMb) : 1024;

  const enriched = enrichUsagePlanRules({
    productName:
      body.productName ||
      body.sku ||
      "South Korea-Promo-unlimited-5-A0",
    sku: body.sku || null,
    planId: body.planId || null,
    remainingMb,
    totalMb: Number.isFinite(totalMb) ? totalMb : null,
    ruleDesc: body.ruleDesc || null,
    specialDesc: body.specialDesc || null,
    speedDesc: body.speedDesc || null,
  });

  const profile = resolveTrafficPlanProfile(enriched);
  const willSend = shouldSendTrafficAlert({
    remainingMb: enriched.remainingMb,
    totalMb: enriched.totalMb,
  });

  const target = {
    ...enriched,
    product_label: enriched.productName,
  };

  let web = null;
  let line = null;
  try {
    web = JSON.parse(await buildLowTrafficWebPayload(target));
    line = await buildLowTrafficLineText(target);
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "組文案失敗",
      profile,
      enriched,
      willSend,
    });
  }

  const okFup =
    profile.kind === "fup" &&
    profile.highSpeedQuotaLabel === "1 GB" &&
    profile.throttleSpeedLabel === "10 Mbps";

  const upsellOffers = resolveTrafficUpsellOffers(enriched);

  return res.status(200).json({
    ok: true,
    willSend,
    planKind: profile.kind,
    highSpeedQuota: profile.highSpeedQuotaLabel,
    throttleSpeed: profile.throttleSpeedLabel,
    /** 韓國 Promo 吃到飽：應為 fup + 1GB + 10Mbps */
    koreaPromoExpectedOk: okFup,
    upsellOffers,
    upsell: upsellOffers[0] || null,
    enriched: {
      productName: enriched.productName,
      sku: enriched.sku,
      ruleDesc: enriched.ruleDesc,
      specialDesc: enriched.specialDesc,
      remainingMb: enriched.remainingMb,
      totalMb: enriched.totalMb,
    },
    webPush: web,
    lineText: line,
  });
}
