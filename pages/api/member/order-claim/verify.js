import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { resolveMemberFromRequest } from "@/lib/resolveMemberFromRequest";
import { isLineSyntheticEmail } from "@/lib/lineAuth";

const PURPOSE = "order_claim";
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const member = await resolveMemberFromRequest(req, res);
  if (!member.authed) {
    return res.status(401).json({ success: false, message: "請先登入" });
  }
  if (!member.supabaseUserId && !member.lineUserId) {
    return res
      .status(400)
      .json({ success: false, message: "無法辨識會員身分，請重新登入" });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Email 格式錯誤" });
  }
  if (isLineSyntheticEmail(email)) {
    return res.status(400).json({ success: false, message: "無法認領此信箱" });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, message: "驗證碼格式錯誤" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { data: rec } = await supabaseAdmin
      .from("email_otp_codes")
      .select("id, code_hash, expires_at, attempts")
      .eq("email", email)
      .eq("purpose", PURPOSE)
      .maybeSingle();

    if (!rec) {
      return res
        .status(400)
        .json({ success: false, message: "請先取得驗證碼" });
    }
    if (new Date(rec.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("email_otp_codes").delete().eq("id", rec.id);
      return res
        .status(400)
        .json({ success: false, message: "驗證碼已過期，請重新取得" });
    }
    if ((rec.attempts || 0) >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("email_otp_codes").delete().eq("id", rec.id);
      return res
        .status(429)
        .json({ success: false, message: "嘗試次數過多，請重新取得驗證碼" });
    }
    if (hashCode(code) !== rec.code_hash) {
      await supabaseAdmin
        .from("email_otp_codes")
        .update({ attempts: (rec.attempts || 0) + 1 })
        .eq("id", rec.id);
      return res.status(400).json({ success: false, message: "驗證碼錯誤" });
    }

    // ✅ 驗證成功：寫入本人所有身分的已驗證認領綁定
    const rows = [];
    if (member.supabaseUserId) {
      rows.push({
        subject_type: "supabase",
        subject_id: member.supabaseUserId,
        email,
      });
    }
    if (member.lineUserId) {
      rows.push({
        subject_type: "line",
        subject_id: member.lineUserId,
        email,
      });
    }
    for (const r of rows) {
      const { data: ex } = await supabaseAdmin
        .from("member_claimed_emails")
        .select("id")
        .eq("subject_type", r.subject_type)
        .eq("subject_id", r.subject_id)
        .eq("email", r.email)
        .maybeSingle();
      if (!ex) {
        const { error: insErr } = await supabaseAdmin
          .from("member_claimed_emails")
          .insert(r);
        // 併發重複（唯一索引）可忽略
        if (insErr && insErr.code !== "23505") throw insErr;
      }
    }

    // 相容既有機制：Supabase 會員同步寫入 user_metadata.linked_order_emails
    if (member.supabaseUserId) {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(
          member.supabaseUserId,
        );
        const prev = u?.user?.user_metadata || {};
        const list = Array.isArray(prev.linked_order_emails)
          ? prev.linked_order_emails.map((e) => String(e).toLowerCase())
          : [];
        if (!list.includes(email)) {
          await supabaseAdmin.auth.admin.updateUserById(member.supabaseUserId, {
            user_metadata: { ...prev, linked_order_emails: [...list, email] },
          });
        }
      } catch (e) {
        console.warn(
          "[order-claim/verify] 同步 linked_order_emails 失敗（不影響認領結果）:",
          e?.message,
        );
      }
    }

    // 消耗驗證碼
    await supabaseAdmin.from("email_otp_codes").delete().eq("id", rec.id);

    return res
      .status(200)
      .json({ success: true, message: "已成功認領此 Email 的歷史訂單", email });
  } catch (err) {
    console.error("[order-claim/verify]", err?.message || err);
    return res.status(500).json({ success: false, message: "驗證失敗，請稍後再試" });
  }
}
