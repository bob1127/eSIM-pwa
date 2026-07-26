import nodemailer from "nodemailer";

/**
 * 寄信設定（優先 GoDaddy / 自訂 SMTP；未完整設定時退回 Gmail）
 *
 * GoDaddy（jeko-esim.com.tw）建議：
 *   SMTP_HOST=smtpout.secureserver.net
 *   SMTP_PORT=465
 *   SMTP_SECURE=true
 *   SMTP_USER=你的信箱@jeko-esim.com.tw
 *   SMTP_PASS=信箱密碼
 *   MAIL_FROM_EMAIL=你的信箱@jeko-esim.com.tw
 *   MAIL_FROM_NAME=Jeko eSIM
 */

const SMTP_HOST = process.env.SMTP_HOST?.trim() || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "").toLowerCase() === "true" ||
  SMTP_PORT === 465;

const SMTP_USER = process.env.SMTP_USER?.trim() || "";
const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";

const GMAIL_USER = process.env.GMAIL_USER?.trim() || "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.trim() || "";

const useCustomSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const authUser = useCustomSmtp ? SMTP_USER : GMAIL_USER;
const authPass = useCustomSmtp ? SMTP_PASS : GMAIL_APP_PASSWORD;

const MAIL_FROM_EMAIL =
  process.env.MAIL_FROM_EMAIL?.trim() || authUser;
const MAIL_FROM_NAME =
  process.env.MAIL_FROM_NAME?.trim() || "Jeko eSIM";

export function getMailConfig() {
  return {
    host: useCustomSmtp ? SMTP_HOST : authUser ? "gmail" : "",
    user: authUser,
    fromEmail: MAIL_FROM_EMAIL,
    fromName: MAIL_FROM_NAME,
    configured: Boolean(authUser && authPass),
    viaGodaddy: useCustomSmtp,
  };
}

export function createMailTransporter() {
  if (!authUser || !authPass) {
    const err = new Error("MAIL_NOT_CONFIGURED");
    err.code = "MAIL_NOT_CONFIGURED";
    throw err;
  }

  if (useCustomSmtp) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: authUser,
        pass: authPass,
      },
      tls: { rejectUnauthorized: false },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: authUser,
      pass: authPass,
    },
  });
}

/**
 * @param {{
 *   to: string,
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   fromName?: string,
 *   fromEmail?: string,
 * }} opts
 */
export async function sendMail({
  to,
  subject,
  html,
  text = "",
  fromName,
  fromEmail,
}) {
  const transporter = createMailTransporter();
  const name = (fromName || MAIL_FROM_NAME).trim();
  const email = (fromEmail || MAIL_FROM_EMAIL).trim();

  return transporter.sendMail({
    from: `"${name}" <${email}>`,
    to,
    subject,
    html,
    text,
  });
}

export function mailErrorMessage(error) {
  if (error?.code === "MAIL_NOT_CONFIGURED") {
    return "郵件服務尚未設定，請設定 SMTP_USER / SMTP_PASS（GoDaddy）或 GMAIL_USER / GMAIL_APP_PASSWORD";
  }
  if (String(error?.message || "").includes("535")) {
    return "郵件帳號驗證失敗，請確認信箱帳號與密碼是否正確";
  }
  return `寄送失敗：${error?.message || "未知錯誤"}`;
}
