import {
  resolveMemberEmail,
  expandMemberLookupEmails,
  fetchMemberEsimsForIdentity,
} from "./_memberAuth";

/**
 * GET /api/push/member-esims
 * 已登入會員：列出可監控的 eSIM（topup_id / ICCID）
 * — Medusa 主站已出貨（esim_qrcodes）+ Supabase 夥伴／舊單，合併去重
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  const member = await resolveMemberEmail(req, res);
  if (!member?.email) {
    return res.status(401).json({ error: "請先登入會員" });
  }

  try {
    const emails = await expandMemberLookupEmails(member);
    const esims = await fetchMemberEsimsForIdentity({
      emails,
      lineUserId: member.lineUserId || null,
      supabaseUserId: member.userId || null,
    });
    return res.status(200).json({
      success: true,
      email: member.email,
      emails,
      esims,
      count: esims.length,
    });
  } catch (e) {
    console.error("[member-esims]", e?.message || e);
    return res.status(500).json({ error: "讀取訂單失敗", detail: e.message });
  }
}
