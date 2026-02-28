// pages/api/forgot-password.ts （只示範寄信區段的修改點）
import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";

const WP_BASE = "https://fegoesim.com";
const APP_ORIGIN = process.env.APP_ORIGIN || "https://www.wmesim.com"; // 例: https://fegoesim.com 或 https://app.fegoesim.com
const GMAIL_USER = process.env.GMAIL_USER || "wandmesim@gmail.com";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || "hwoywmluqvsuluss";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });

  try {
    const { identifier } = req.body || {};
    if (!identifier || typeof identifier !== "string") {
      return res.status(400).json({ ok: false, message: "缺少 identifier" });
    }

    // 向 WP 取得 reset_url（return_only）
    const wpResp = await fetch(`${WP_BASE}/wp-json/custom/v1/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, return_only: true }),
    });

    const data = await wpResp.json().catch(() => ({} as any));
    if (!wpResp.ok) {
      // 為防帳號枚舉，不回錯
      return res.status(200).json({ ok: true, message: "若該 Email/帳號存在，將寄出重設密碼信。" });
    }

    const to = data?.to;
    const wpResetUrl = data?.reset_url;
    const login = data?.login || "";

    // 從 WP 的 reset_url 取出 key & login（保險起見）
    let key = "";
    try {
      const u = new URL(wpResetUrl);
      key = u.searchParams.get("key") || "";
    } catch (e) {
      // ignore
    }

    // 組成你自己的重設頁連結
    const appResetUrl = `${APP_ORIGIN.replace(/\/$/, "")}/reset-password?key=${encodeURIComponent(
      key
    )}&login=${encodeURIComponent(login)}`;

    if (to && key && login) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      });

      await transporter.sendMail({
        from: `eSIM 團隊 <${GMAIL_USER}>`,
        to,
        subject: `重設您的密碼`,
        html: `
          <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;line-height:1.6">
            <p>您好，您（帳號：${login}）申請了密碼重設。</p>
            <p>請點擊以下按鈕在 30 分鐘內完成重設：</p>
            <p>
              <a href="${appResetUrl}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#1757FF;color:#fff;text-decoration:none;">
                前往重設密碼
              </a>
            </p>
            <p>若非您本人操作，請忽略此信。</p>
          </div>
        `,
      });
    }

    return res.status(200).json({ ok: true, message: "若該 Email/帳號存在，將寄出重設密碼信。" });
  } catch (err: any) {
    console.error("forgot-password api error:", err?.response?.data || err?.message || err);
    return res.status(500).json({ ok: false, message: "系統忙線，請稍後再試" });
  }
}
