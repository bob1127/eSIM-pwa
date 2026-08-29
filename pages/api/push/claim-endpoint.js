/**
 * POST /api/push/claim-endpoint
 * body: { endpoint }
 *
 * 登入後認領本機推播 endpoint：
 * - 綁定屬於本人 → 保留，寫入 user_id
 * - 綁定屬於他人 → 清 eSIM 綁定，保留訂閱與 general_push
 */
import {
  resolveMemberEmail,
  getSupabasePushAdmin,
  claimEndpointForMember,
} from "../../../lib/pushAccountSync";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const endpoint = String(req.body?.endpoint || "").trim();
  if (!endpoint) {
    return res.status(400).json({ error: "缺少 endpoint" });
  }

  const member = await resolveMemberEmail(req, res);
  if (!member?.email) {
    return res.status(401).json({ error: "請先登入" });
  }

  const admin = getSupabasePushAdmin();
  const result = await claimEndpointForMember(admin, endpoint, member);
  if (!result.ok) {
    return res.status(500).json({ error: result.error || "認領失敗" });
  }

  return res.status(200).json({
    ok: true,
    claimed: result.claimed,
    subscribed: result.subscribed,
    bound: result.bound,
    clearedBind: result.clearedBind,
  });
}
