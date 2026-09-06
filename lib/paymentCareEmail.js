/**
 * 藍新／LINE Pay 未付款・付款失敗關懷信
 * 版面依 public/email-payment-timeout-preview.html
 */

import { sendMail, getMailConfig } from "./mailTransporter";
import { getPublicSiteUrl } from "./siteUrl";

const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@593gvyzn";
const LINE_OA_DISPLAY =
  process.env.NEXT_PUBLIC_LINE_OA_ID || "@593gvyzn";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtAmount(n) {
  const v = Math.round(Number(n) || 0);
  return `NT$${v.toLocaleString("zh-TW")}`;
}

/** 依金流回傳訊息選狀態文案 */
export function paymentCareStatusLabel({ reason, message, payloadStatus } = {}) {
  const blob = `${reason || ""} ${message || ""} ${payloadStatus || ""}`.toUpperCase();
  if (/TIMEOUT|02004|EXPIRED|逾時/.test(blob)) {
    return "付款頁逾時・未完成付款（未扣款）";
  }
  if (/CANCEL|取消/.test(blob)) {
    return "已取消付款・未完成付款（未扣款）";
  }
  if (/ERROR|異常/.test(blob)) {
    return "付款異常・未完成付款（未扣款）";
  }
  return "付款失敗・未完成付款（未扣款）";
}

export function buildPaymentCareEmailHtml({
  orderNo,
  amount,
  statusLabel,
  siteUrl,
  lineUrl,
  lineDisplay,
} = {}) {
  const site = String(siteUrl || getPublicSiteUrl()).replace(/\/$/, "");
  const lineHref = String(lineUrl || LINE_OA_URL).trim();
  const lineLabel = String(lineDisplay || LINE_OA_DISPLAY).trim();
  const logoUrl = `${site}/images/Logo/logo-no-bg.png`;
  const cartUrl = `${site}/Cart/`;
  const no = esc(orderNo || "—");
  const amt = esc(fmtAmount(amount));
  const status = esc(statusLabel || "未完成付款（未扣款）");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>付款未完成｜Jeko eSIM</title>
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .outer-pad { padding: 16px 2.5% !important; }
      .card, .footer { width: 100% !important; max-width: 100% !important; }
      .card-pad { padding: 24px 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr>
      <td class="outer-pad" align="center" style="padding:28px 3%;">
        <table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:8px;">
          <tr>
            <td class="card-pad" style="padding:36px 36px;">
              <div style="margin:0 0 22px;text-align:left;">
                <img src="${esc(logoUrl)}" alt="Jeko eSIM" width="44" height="44" style="display:block;width:44px;height:auto;border:0;" />
              </div>

              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;color:#0A6CD0;text-transform:uppercase;">
                付款協助
              </p>
              <h1 style="margin:0 0 14px;font-size:24px;line-height:1.3;color:#111111;font-weight:700;">
                您好，注意到您的訂單付款尚未完成
              </h1>
              <p style="margin:0 0 22px;font-size:15px;color:#4b5563;line-height:1.7;">
                我們收到金流系統通知：這筆交易未能完成付款，因此<strong style="color:#111;">尚未扣款成功</strong>。想跟您確認是否遇到操作問題？Jeko 客服很樂意協助您完成結帳。
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="background:#f8fafc;padding:14px 18px;border-bottom:1px solid #e5e7eb;">
                    <div style="font-size:12px;font-weight:700;color:#64748b;letter-spacing:0.04em;">訂單資訊</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#334155;line-height:1.6;">
                      <tr>
                        <td style="padding:4px 0;color:#64748b;width:96px;vertical-align:top;">訂單編號</td>
                        <td style="padding:4px 0;font-weight:600;color:#111;word-break:break-all;">${no}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;vertical-align:top;">訂單金額</td>
                        <td style="padding:4px 0;font-weight:700;color:#111;">${amt}</td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;color:#64748b;vertical-align:top;">狀態說明</td>
                        <td style="padding:4px 0;color:#111111;font-weight:600;">${status}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:15px;color:#111;font-weight:700;line-height:1.5;">
                常見原因
              </p>
              <ul style="margin:0 0 24px;padding:0 0 0 18px;font-size:14px;color:#4b5563;line-height:1.75;">
                <li style="margin-bottom:6px;">付款頁面停留太久後才送出</li>
                <li style="margin-bottom:6px;">使用瀏覽器「上一頁」或重新整理舊付款頁</li>
                <li>切換 App 過久，回來時交易已失效</li>
              </ul>

              <p style="margin:0 0 18px;font-size:15px;color:#4b5563;line-height:1.7;">
                若您仍需要購買，建議重新結帳一次即可。若過程中有任何疑問（無法付款、頁面錯誤、不知道怎麼操作），歡迎直接透過官方 LINE 聯繫我們。
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
                <tr>
                  <td align="center" style="padding:0 0 10px;">
                    <a href="${esc(lineHref)}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;background:#06C755;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 28px;border-radius:999px;line-height:1.2;">
                      加入官方 LINE 詢問客服
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${esc(cartUrl)}" target="_blank" rel="noopener noreferrer"
                      style="display:inline-block;background:#0A6CD0;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:999px;line-height:1.2;">
                      重新前往結帳
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
                LINE 官方帳號：${esc(lineLabel)}<br />
                或回覆本信，我們會盡快協助您。
              </p>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 18px;" />

              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.65;">
                此為系統自動通知。若您並未嘗試結帳，可忽略本信。
              </p>
            </td>
          </tr>
        </table>

        <table role="presentation" class="footer" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;margin-top:16px;">
          <tr>
            <td align="center" style="padding:8px 12px;font-size:11px;color:#9ca3af;line-height:1.6;">
              © ${new Date().getFullYear()} Jeko eSIM · 藍鍵數位企業社<br />
              客服信箱請以官網公告為準
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @param {{
 *   to: string,
 *   orderNo?: string,
 *   amount?: number|string,
 *   statusLabel?: string,
 *   reason?: string,
 *   message?: string,
 *   payloadStatus?: string,
 *   method?: string,
 * }} opts
 */
export async function sendPaymentCareEmail(opts = {}) {
  const to = String(opts.to || "").trim().toLowerCase();
  if (!to || !to.includes("@")) {
    return { ok: false, skipped: true, reason: "no_email" };
  }
  if (!getMailConfig().configured) {
    return { ok: false, skipped: true, reason: "mail_not_configured" };
  }

  const orderNo = String(opts.orderNo || "").trim() || "—";
  const amount = opts.amount;
  const statusLabel =
    opts.statusLabel ||
    paymentCareStatusLabel({
      reason: opts.reason,
      message: opts.message,
      payloadStatus: opts.payloadStatus,
    });
  const siteUrl = getPublicSiteUrl();
  const shortNo =
    orderNo.length > 12 ? `${orderNo.slice(0, 8)}…` : orderNo;
  const subject = `【Jeko eSIM】付款尚未完成 — ${fmtAmount(amount)}（${shortNo}）`;
  const html = buildPaymentCareEmailHtml({
    orderNo,
    amount,
    statusLabel,
    siteUrl,
    lineUrl: LINE_OA_URL,
    lineDisplay: LINE_OA_DISPLAY,
  });
  const text = [
    "您好，注意到您的訂單付款尚未完成。",
    "",
    `訂單編號：${orderNo}`,
    `訂單金額：${fmtAmount(amount)}`,
    `狀態說明：${statusLabel}`,
    "",
    "尚未扣款成功。若仍需購買，請重新結帳；有疑問請加官方 LINE。",
    `重新結帳：${siteUrl}/Cart/`,
    `官方 LINE：${LINE_OA_URL}`,
  ].join("\n");

  await sendMail({ to, subject, html, text });
  return {
    ok: true,
    to,
    orderNo,
    statusLabel,
    method: opts.method || null,
  };
}
