// 商店「財務設定」的唯一寫入入口：markup_mode／markup_rate／markup_fixed。
// 刻意獨立於一般商店欄位更新之外，理由：
// - 這些值直接決定分潤與售價，必須經伺服器邊界驗證
// - 每次變更都留下稽核紀錄（partner_pricing_audit）
import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import {
  MARKUP_MODE_FIXED,
  MARKUP_MODE_PERCENT,
  normalizeMarkupMode,
  validateMarkupFixedInput,
  validateMarkupRateInput,
} from "../../../lib/partnerPricing";
import { logPricingAudit } from "../../../lib/partnerPricingAudit";

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", ["PATCH"]);
    return res.status(405).end("Method Not Allowed");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ error: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  const storeId = access.store.id;
  const body = req.body || {};
  const hasMode = body.markup_mode !== undefined && body.markup_mode !== null;
  const hasRate =
    body.markup_rate !== undefined &&
    body.markup_rate !== null &&
    body.markup_rate !== "";
  const hasFixed =
    body.markup_fixed !== undefined &&
    body.markup_fixed !== null &&
    body.markup_fixed !== "";

  if (!hasMode && !hasRate && !hasFixed) {
    return res.status(400).json({
      error: "請提供 markup_mode、markup_rate 或 markup_fixed",
    });
  }

  const patch = {};
  const audits = [];

  if (hasMode) {
    const mode = normalizeMarkupMode(body.markup_mode);
    const oldMode = normalizeMarkupMode(access.store.markup_mode);
    if (mode !== oldMode) {
      patch.markup_mode = mode;
      audits.push({
        action: "update_markup_mode",
        field: "markup_mode",
        oldValue: oldMode,
        newValue: mode,
      });
    }
  }

  if (hasRate) {
    const check = validateMarkupRateInput(body.markup_rate);
    if (!check.ok) return res.status(400).json({ error: check.error });
    const oldRate = Number(access.store.markup_rate) || 0;
    if (check.value !== oldRate) {
      patch.markup_rate = check.value;
      audits.push({
        action: "update_markup_rate",
        field: "markup_rate",
        oldValue: oldRate,
        newValue: check.value,
      });
    }
  }

  if (hasFixed) {
    const check = validateMarkupFixedInput(body.markup_fixed);
    if (!check.ok) return res.status(400).json({ error: check.error });
    const oldFixed = Number(access.store.markup_fixed) || 0;
    if (check.value !== oldFixed) {
      patch.markup_fixed = check.value;
      audits.push({
        action: "update_markup_fixed",
        field: "markup_fixed",
        oldValue: oldFixed,
        newValue: check.value,
      });
    }
  }

  if (Object.keys(patch).length === 0) {
    return res.status(200).json({ ok: true, store: access.store, unchanged: true });
  }

  let { data, error } = await supabase
    .from("stores")
    .update(patch)
    .eq("id", storeId)
    .select()
    .single();

  // 舊 DB 尚未跑 migration 時：只更新既有的 markup_rate
  if (
    error &&
    /markup_mode|markup_fixed|schema cache|does not exist/i.test(
      error.message || "",
    )
  ) {
    if (patch.markup_rate == null) {
      return res.status(500).json({
        error:
          "資料庫尚未支援加價模式，請執行 migration「20260728_partner_markup_mode.sql」",
      });
    }
    ({ data, error } = await supabase
      .from("stores")
      .update({ markup_rate: patch.markup_rate })
      .eq("id", storeId)
      .select()
      .single());
    if (!error && data) {
      data = {
        ...data,
        markup_mode: MARKUP_MODE_PERCENT,
        markup_fixed: Number(access.store.markup_fixed) || 50,
      };
    }
  }

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  for (const a of audits) {
    await logPricingAudit(supabase, {
      storeId,
      actorUserId: user.id,
      actorEmail: user.email,
      action: a.action,
      field: a.field,
      oldValue: a.oldValue,
      newValue: a.newValue,
      req,
    });
  }

  // 確保回應帶有模式欄位（舊列可能沒有）
  const store = {
    ...data,
    markup_mode: normalizeMarkupMode(data.markup_mode || MARKUP_MODE_PERCENT),
    markup_fixed:
      data.markup_fixed != null ? Number(data.markup_fixed) : 50,
  };

  return res.status(200).json({ ok: true, store });
}
