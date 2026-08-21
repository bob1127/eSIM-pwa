// GET/PUT /api/admin/platform-settings
//
// boss 後台調整「平台全域設定」。目前提供：夥伴底價平台抽成倍率
// （partner_b2b_cost_rate）。需 Medusa 管理員登入。
//
// 讀取優先序：DB（platform_settings）→ 環境變數 PARTNER_B2B_COST_RATE → 預設 1.2。
// 這裡寫入的是「你的利潤倍率」，全站商品的夥伴底價 = API 原始成本 × 此倍率。
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import {
  describeB2BMarkupMultiplier,
  saveB2BMarkupMultiplier,
} from "../../../lib/platformSettings";
import { B2B_MARKUP_LIMITS } from "../../../lib/platformSettingsCache";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const b2bMarkup = await describeB2BMarkupMultiplier();
      return res.status(200).json({
        b2bMarkup,
        limits: B2B_MARKUP_LIMITS,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: err?.message || "讀取平台設定失敗" });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const { b2b_cost_rate } = req.body || {};
    if (b2b_cost_rate === undefined || b2b_cost_rate === null || b2b_cost_rate === "") {
      return res.status(400).json({ error: "缺少 b2b_cost_rate" });
    }

    const result = await saveB2BMarkupMultiplier(b2b_cost_rate);
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }

    const b2bMarkup = await describeB2BMarkupMultiplier();
    return res.status(200).json({
      ok: true,
      value: result.value,
      b2bMarkup,
      limits: B2B_MARKUP_LIMITS,
    });
  }

  res.setHeader("Allow", ["GET", "PUT", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
