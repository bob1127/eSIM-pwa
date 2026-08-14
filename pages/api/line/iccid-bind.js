import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { verifyLineIdToken } from "../../../lib/lineIdToken";
import { queryEsimUsage, formatUsageForLine } from "../../../lib/esimUsageService";
import { upsertLineTrafficAlert } from "../../../lib/lineTrafficAlert";
import { isValidIccid, normalizeIccid } from "../../../lib/pushBind";

/**
 * POST /api/line/iccid-bind
 * 官方 LINE 內表單：查詢用量並開啟偏低提醒（不必是官網會員）
 * body: { iccid, idToken }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const iccid = normalizeIccid(req.body?.iccid);
  if (!isValidIccid(iccid)) {
    return res.status(400).json({
      ok: false,
      error: "請輸入 19～20 碼數字的 ICCID",
    });
  }

  const verified = await verifyLineIdToken(req.body?.idToken);
  if (!verified.ok) {
    return res.status(401).json({
      ok: false,
      error: "請從官方 LINE 的按鈕開啟此頁，才能開啟提醒",
      code: verified.error,
    });
  }

  const usage = await queryEsimUsage({ iccid });
  if (!usage.ok) {
    return res.status(400).json({
      ok: false,
      error: usage.error || "查詢失敗",
    });
  }

  let alertEnabled = false;
  let alertError = null;
  try {
    const admin = getSupabaseAdminServer();
    const bind = await upsertLineTrafficAlert(admin, {
      line_user_id: verified.lineUserId,
      topup_id: usage.data?.topupId || null,
      iccid,
      product_label: usage.data?.productName || null,
      guest_email: null,
    });
    alertEnabled = !!bind.ok;
    if (!bind.ok) alertError = bind.error;
  } catch (e) {
    alertError = e.message;
  }

  return res.status(200).json({
    ok: true,
    iccid,
    usage: usage.data,
    usageText: formatUsageForLine(usage.data),
    alertEnabled,
    alertError,
  });
}
