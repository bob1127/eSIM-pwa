import { sendMail, mailErrorMessage } from "./mailTransporter";

export function buildMemberResetPasswordEmailHtml({ resetLink }) {
  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>重設密碼</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(26,86,219,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db 0%,#1a3a6b 100%);padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;">JEKO eSIM</p>
              <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:900;color:#ffffff;">重設您的密碼</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
                您好，我們收到您重設 JEKO eSIM 帳號密碼的請求。
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#334155;">
                請點擊下方按鈕設定新密碼。連結有效時間有限，若已過期請重新申請。
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:999px;background:#1C82E0;">
                    <a href="${resetLink}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:900;color:#ffffff;text-decoration:none;">
                      設定新密碼 →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                若按鈕無法開啟，請複製以下網址至瀏覽器：<br />
                <span style="color:#64748b;word-break:break-all;">${resetLink}</span>
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.7;color:#94a3b8;">
                若您未申請重設密碼，請忽略此信，您的帳號仍受保護。
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;background:#fafafa;">
              <p style="margin:0;font-size:11px;color:#cbd5e1;">© JEKO eSIM · 此信件由系統自動發送，請勿直接回覆。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildMemberResetPasswordEmailText({ resetLink }) {
  return [
    "您好，",
    "",
    "我們收到您重設 JEKO eSIM 帳號密碼的請求。",
    "請開啟以下連結設定新密碼（有效時間有限）：",
    "",
    resetLink,
    "",
    "若您未申請重設密碼，請忽略此信。",
    "",
    "JEKO eSIM",
  ].join("\n");
}

export async function sendMemberResetPasswordEmail({ email, resetLink }) {
  await sendMail({
    to: email,
    subject: "重設您的 JEKO eSIM 帳號密碼",
    html: buildMemberResetPasswordEmailHtml({ resetLink }),
    text: buildMemberResetPasswordEmailText({ resetLink }),
  });
}

export { mailErrorMessage };
