import { createClient } from "@supabase/supabase-js";
import {
  extractLineUserIdFromAuthUser,
  findAuthUserIdByEmail,
} from "../../../lib/partnerBind";
import { getAuthUserFromBearer, getSupabaseAdmin } from "../../../lib/partnerServer";
import { normalizePartnerEmail } from "../../../lib/partnerUtils";
import { validatePassword } from "../../../lib/passwordPolicy";
import { isEmailVerifiedForRegistration } from "../../../lib/emailVerification";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { email: rawEmail, password } = req.body || {};
  const email = normalizePartnerEmail(rawEmail);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "缺少參數" });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }
  if (!isEmailVerifiedForRegistration(email)) {
    return res
      .status(400)
      .json({ success: false, message: "請先完成 Email 驗證，或驗證已過期請重新驗證" });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      message: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  // 優先綁定「目前已登入」的社群帳號（LINE／Google／FB）
  const sessionUser = await getAuthUserFromBearer(req);
  let bindAuthUserId = sessionUser?.id || null;
  let bindLineUserId = extractLineUserIdFromAuthUser(sessionUser);

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "partner_application" },
  });

  if (error) {
    const msg = error.message || "";
    const alreadyExists =
      msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered") ||
      error.status === 422;

    if (alreadyExists) {
      const existingId =
        bindAuthUserId || (await findAuthUserIdByEmail(supabaseAdmin, email));
      return res.status(200).json({
        success: true,
        existing: true,
        authUserId: existingId,
        lineUserId: bindLineUserId,
        message:
          "此 Email 已有會員帳號。若您正用社群登入，審核通過後可用同一按鈕進後台；否則請用原密碼登入。",
      });
    }

    return res.status(400).json({ success: false, message: msg || "建立帳號失敗" });
  }

  const emailUserId = created?.user?.id || null;
  // 有社群 session 時優先綁社群；否則綁新建的 Email 帳號
  if (!bindAuthUserId) bindAuthUserId = emailUserId;

  return res.status(200).json({
    success: true,
    existing: false,
    authUserId: bindAuthUserId,
    emailUserId,
    lineUserId: bindLineUserId,
    message: "登入帳號已建立",
  });
}
