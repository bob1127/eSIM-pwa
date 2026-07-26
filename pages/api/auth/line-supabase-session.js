/**
 * LINE NextAuth session → Supabase session（夥伴／會員共用）
 * POST：驗證 next-auth 後簽發 magiclink token_hash，前端 verifyOtp
 */
import { getServerSession } from "next-auth/next";
import { authOptions } from "./[...nextauth]";
import { getSupabaseAdmin } from "../../../lib/partnerServer";
import { lineUserIdToEmail } from "../../../lib/lineAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({
      success: false,
      code: "NO_LINE_SESSION",
      message: "請先完成 LINE 登入",
    });
  }

  const lineUserId =
    session.user.id ||
    session.user.sub ||
    String(session.user.email || "").replace(/@line-login\.com$/i, "");

  if (!lineUserId) {
    return res.status(400).json({
      success: false,
      message: "無法取得 LINE 使用者 ID",
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({
      success: false,
      message: "伺服器設定不完整",
    });
  }

  const email = lineUserIdToEmail(lineUserId);
  const displayName = session.user.name || "LINE 會員";

  // 確保 Auth 使用者存在
  const { error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      full_name: displayName,
      line_id: lineUserId,
      avatar_url: session.user.image || null,
    },
    password: `${lineUserId.slice(0, 8)}_${Date.now()}A1@x`,
  });

  if (createErr) {
    const msg = String(createErr.message || "").toLowerCase();
    const exists =
      msg.includes("already") ||
      msg.includes("registered") ||
      createErr.status === 422;
    if (!exists) {
      return res.status(400).json({
        success: false,
        message: createErr.message || "建立 LINE 帳號失敗",
      });
    }
  }

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

  if (linkErr || !linkData) {
    return res.status(500).json({
      success: false,
      message: linkErr?.message || "無法產生登入憑證",
    });
  }

  const tokenHash =
    linkData.properties?.hashed_token ||
    linkData.properties?.email_otp ||
    null;

  if (!tokenHash) {
    return res.status(500).json({
      success: false,
      message: "登入憑證格式異常，請改用 Email 登入",
    });
  }

  return res.status(200).json({
    success: true,
    email,
    tokenHash,
    lineUserId,
  });
}
