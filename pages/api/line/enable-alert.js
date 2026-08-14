import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { verifyLineIdToken } from "../../../lib/lineIdToken";
import { enableLineTrafficAlertForLineUser } from "../../../lib/lineTrafficAlert";

/**
 * POST /api/line/enable-alert
 * 以 LIFF ID Token 一鍵開啟偏低提醒（本站訂單或已綁定會員）
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const verified = await verifyLineIdToken(req.body?.idToken);
  if (!verified.ok) {
    return res.status(401).json({
      ok: false,
      error: "請從官方 LINE 的「開啟流量提醒」按鈕開啟此頁",
      code: verified.error,
    });
  }

  try {
    const admin = getSupabaseAdminServer();
    const result = await enableLineTrafficAlertForLineUser(
      admin,
      verified.lineUserId,
    );
    if (!result.ok) {
      return res.status(200).json({
        ok: false,
        code: result.code || "no_order",
        error: "尚無本站訂單，請輸入 ICCID 或一鍵綁定會員",
      });
    }
    return res.status(200).json({
      ok: true,
      productName: result.productName || null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "設定失敗" });
  }
}
