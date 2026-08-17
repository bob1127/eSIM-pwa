import { sendMail, mailErrorMessage } from "./mailTransporter";
import { SUPPORT_EMAIL } from "./contactUi";

function wrap(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<body style="margin:0;padding:0;background:#eef2f7;font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a56db 0%,#1a3a6b 100%);padding:24px 28px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:rgba(255,255,255,.75);">JEKO eSIM 任務牆</p>
            <h1 style="margin:0;font-size:22px;color:#fff;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;font-size:14px;line-height:1.75;color:#334155;">${bodyHtml}</td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendMissionApplyReceivedEmail({ to, name, missionTitle }) {
  const safe = name || "申請人";
  await sendMail({
    to,
    subject: `【Jeko 任務牆】已收到「${missionTitle}」申請`,
    html: wrap(
      "我們已收到你的申請",
      `<p>親愛的 <strong>${safe}</strong>，您好：</p>
       <p>任務「<strong>${missionTitle}</strong>」申請已送出。審核結果將以這封 Email 通知，也可留意官方 LINE。</p>
       <p style="color:#64748b;font-size:12px;">此信為系統自動發送，請勿直接回覆。</p>`,
    ),
    text: `已收到「${missionTitle}」申請，審核結果將以 Email 通知。`,
  });
}

export async function sendMissionReviewEmail({
  to,
  name,
  missionTitle,
  approved,
  adminNote,
}) {
  const safe = name || "申請人";
  const title = approved ? "申請已通過" : "申請未通過";
  const note = adminNote
    ? `<p>補充說明：${adminNote}</p>`
    : "";
  await sendMail({
    to,
    subject: `【Jeko 任務牆】「${missionTitle}」${title}`,
    html: wrap(
      title,
      `<p>親愛的 <strong>${safe}</strong>，您好：</p>
       <p>任務「<strong>${missionTitle}</strong>」${
         approved ? "已通過審核。請依官方 LINE 後續指示完成任務。" : "本次未能通過。"
       }</p>
       ${note}
       <p style="color:#64748b;font-size:12px;">如有疑問請透過官方 LINE 洽詢。</p>`,
    ),
    text: `「${missionTitle}」${title}${adminNote ? `：${adminNote}` : ""}`,
  });
}

export async function notifySupportNewMissionApply({
  missionTitle,
  name,
  email,
  phone,
  company,
  identityLabel,
}) {
  await sendMail({
    to: SUPPORT_EMAIL,
    subject: `【任務牆新申請】${missionTitle}｜${name || email}`,
    html: wrap(
      "有一筆新的任務申請",
      `<p>任務：<strong>${missionTitle}</strong></p>
       <p>申請人：${name || "-"}<br/>Email：${email}<br/>電話：${phone || "-"}<br/>公司／頻道：${company || "-"}<br/>身份：${identityLabel || "-"}</p>
       <p>請至總部後台「任務牆」分頁審核。</p>`,
    ),
    text: `新申請 ${missionTitle} / ${name} / ${email}`,
  });
}

export { mailErrorMessage };
