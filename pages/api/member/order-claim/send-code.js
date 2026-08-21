import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendMail, mailErrorMessage } from "@/lib/mailTransporter";
import { resolveMemberFromRequest } from "@/lib/resolveMemberFromRequest";
import { isLineSyntheticEmail } from "@/lib/lineAuth";

const PURPOSE = "order_claim";
const COOLDOWN_SEC = 60; // 兩次寄送最短間隔
const CODE_TTL_MS = 10 * 60 * 1000; // 驗證碼 10 分鐘有效
const MAX_PER_HOUR = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function buildEmailHtml(code) {
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;line-height:1.6;color:#1e293b;max-width:480px">
      <p style="margin:0 0 8px;font-size:13px;color:#1a56db;font-weight:700">Jeko eSIM</p>
      <h2 style="margin:0 0 16px;font-size:20px">認領歷史訂單 · Email 驗證碼</h2>
      <p style="margin:0 0 12px">請在 10 分鐘內於會員中心輸入以下 6 位數驗證碼，以將此 Email 的歷史訂單歸戶：</p>
      <p style="margin:0 0 20px;font-size:32px;font-weight:800;letter-spacing:8px;color:#1a56db">${code}</p>
      <p style="margin:0;font-size:12px;color:#64748b">若您未申請，請忽略此信；請勿將驗證碼提供給他人。</p>
    </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const member = await resolveMemberFromRequest(req, res);
  if (!member.authed) {
    return res.status(401).json({ success: false, message: "請先登入" });
  }

  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: "Email 格式錯誤" });
  }
  if (isLineSyntheticEmail(email)) {
    return res
      .status(400)
      .json({ success: false, message: "無法認領系統產生的 LINE 虛擬信箱" });
  }
  if (member.email && email === String(member.email).toLowerCase()) {
    return res
      .status(400)
      .json({ success: false, message: "這是您目前登入的 Email，無需認領" });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const now = Date.now();

  try {
    const { data: existing } = await supabaseAdmin
      .from("email_otp_codes")
      .select("id, last_sent_at, window_start, sent_count_1h")
      .eq("email", email)
      .eq("purpose", PURPOSE)
      .maybeSingle();

    if (existing) {
      const lastSent = new Date(existing.last_sent_at).getTime();
      if (now - lastSent < COOLDOWN_SEC * 1000) {
        const wait = Math.ceil((COOLDOWN_SEC * 1000 - (now - lastSent)) / 1000);
        return res
          .status(429)
          .json({ success: false, message: `請稍候 ${wait} 秒再試`, cooldown: wait });
      }
      const windowStart = new Date(existing.window_start).getTime();
      const withinWindow = now - windowStart <= 60 * 60 * 1000;
      if (withinWindow && (existing.sent_count_1h || 0) >= MAX_PER_HOUR) {
        return res
          .status(429)
          .json({ success: false, message: "寄送次數過多，請稍後再試" });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = hashCode(code);
    const expiresAt = new Date(now + CODE_TTL_MS).toISOString();

    const windowStartMs = existing
      ? now - new Date(existing.window_start).getTime() <= 60 * 60 * 1000
        ? new Date(existing.window_start).getTime()
        : now
      : now;
    const sentCount = existing
      ? now - new Date(existing.window_start).getTime() <= 60 * 60 * 1000
        ? (existing.sent_count_1h || 0) + 1
        : 1
      : 1;

    // 先寄信，成功後才寫入（避免 SMTP 失敗仍佔用限流）
    await sendMail({
      to: email,
      subject: "Jeko eSIM 認領訂單驗證碼",
      html: buildEmailHtml(code),
      text: `您的 Jeko eSIM 訂單認領驗證碼是：${code}（10 分鐘內有效）`,
    });

    const row = {
      email,
      purpose: PURPOSE,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: new Date(now).toISOString(),
      window_start: new Date(windowStartMs).toISOString(),
      sent_count_1h: sentCount,
    };

    if (existing) {
      await supabaseAdmin
        .from("email_otp_codes")
        .update(row)
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("email_otp_codes").insert(row);
    }

    return res
      .status(200)
      .json({ success: true, message: "驗證碼已寄出", cooldown: COOLDOWN_SEC });
  } catch (err) {
    console.error("[order-claim/send-code]", err?.message || err);
    return res
      .status(500)
      .json({ success: false, message: mailErrorMessage(err) });
  }
}
