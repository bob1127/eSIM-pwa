import { sendMail, mailErrorMessage } from "./mailTransporter";
import { buildReferralShareUrl } from "./partnerReferral";

export function buildPartnerApprovalEmailHtml({
  partnerName,
  storeUrl,
  referralUrl,
  loginUrl,
  slug,
  cooperationModel,
}) {
  const safeName = partnerName || "合作夥伴";
  const isReferral = cooperationModel === "referral";

  const linkBlock = isReferral
    ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">您的專屬推薦連結</p>
                    <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1a56db;word-break:break-all;">
                      <a href="${referralUrl}" style="color:#1a56db;text-decoration:none;">${referralUrl}</a>
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">推薦代碼：<span style="font-family:ui-monospace,monospace;color:#475569;">${slug}</span> · 貼到社群會顯示專屬行銷預覽圖 · 訪客 30 天內在官網下單仍計入您的分潤</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;">接下來您可以：</p>
              <ol style="margin:0 0 28px;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                <li>使用申請時的 Email 與密碼登入夥伴後台</li>
                <li>複製「專屬推薦連結」分享至 LINE／IG／官網</li>
                <li>旅客經連結進入 Jeko 官網，30 天內購買即可累計分潤</li>
              </ol>`
    : `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;">您的專屬賣場網址</p>
                    <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1a56db;word-break:break-all;">
                      <a href="${storeUrl}" style="color:#1a56db;text-decoration:none;">${storeUrl}</a>
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">賣場代碼：<span style="font-family:ui-monospace,monospace;color:#475569;">${slug}</span></p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;">接下來您可以：</p>
              <ol style="margin:0 0 28px;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                <li>使用申請時設定的 Email 與密碼登入夥伴後台</li>
                <li>至「選品管理」挑選 eSIM 方案並設定售價</li>
                <li>將專屬賣場連結分享至 LINE 群組、IG 或官網</li>
              </ol>`;

  const intro = isReferral
    ? "我們已完成審核，您的 JEKO eSIM 專屬推薦連結已正式啟用。將連結分享給旅客，他們在官網下單即可為您累積分潤。"
    : "我們已完成審核，您的 JEKO eSIM 合作夥伴後台與專屬賣場已正式啟用。現在可以登入後台選品、定價，並開始推廣賺取分潤。";

  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>合作夥伴帳號已開通</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(26,86,219,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db 0%,#1a3a6b 100%);padding:28px 32px;">
              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.12em;text-transform:uppercase;">JEKO eSIM Partner</p>
              <h1 style="margin:0;font-size:24px;line-height:1.35;font-weight:900;color:#ffffff;">恭喜，您的合作夥伴帳號已開通！</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">
                親愛的 <strong style="color:#0f172a;">${safeName}</strong>，您好：
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">
                ${intro}
              </p>
              ${linkBlock}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="border-radius:999px;background:#4ade80;">
                    <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:900;color:#0f172a;text-decoration:none;">
                      登入夥伴後台 →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">
                若按鈕無法開啟，請複製以下網址至瀏覽器：<br />
                <span style="color:#64748b;word-break:break-all;">${loginUrl}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;background:#fafafa;">
              <p style="margin:0 0 6px;font-size:12px;color:#64748b;">如有任何問題，歡迎回信或聯繫 JEKO eSIM 客服。</p>
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

export function buildPartnerApprovalEmailText({
  partnerName,
  storeUrl,
  referralUrl,
  loginUrl,
  slug,
  cooperationModel,
}) {
  const safeName = partnerName || "合作夥伴";
  const isReferral = cooperationModel === "referral";
  return [
    `親愛的 ${safeName}，您好：`,
    "",
    "恭喜！您的 JEKO eSIM 合作夥伴帳號已審核通過並正式開通。",
    "",
    isReferral
      ? `專屬推薦連結：${referralUrl}\n推薦代碼：${slug}\n（訪客 30 天內在官網下單仍計入分潤）`
      : `專屬賣場：${storeUrl}\n賣場代碼：${slug}`,
    "",
    "請使用申請時設定的 Email 與密碼登入夥伴後台：",
    loginUrl,
    "",
    "JEKO eSIM",
  ].join("\n");
}

export async function sendPartnerApprovalEmail({ partner, siteUrl }) {
  if (!partner?.email) {
    throw new Error("缺少夥伴 Email");
  }

  const base = siteUrl.replace(/\/$/, "");
  const storeUrl = `${base}/p/${partner.slug}`;
  const referralUrl = buildReferralShareUrl(
    base,
    partner.referral_code || partner.slug,
  );
  const loginUrl = `${base}/partner/login`;
  const cooperationModel = partner.cooperation_model || "store";

  const payload = {
    partnerName: partner.name,
    storeUrl,
    referralUrl,
    loginUrl,
    slug: partner.referral_code || partner.slug,
    cooperationModel,
  };

  await sendMail({
    to: partner.email,
    subject: "🎉 恭喜！您的 JEKO eSIM 合作夥伴帳號已開通",
    html: buildPartnerApprovalEmailHtml(payload),
    text: buildPartnerApprovalEmailText(payload),
  });
}

export { mailErrorMessage };
