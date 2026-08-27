/**
 * eSIM 發貨 Email — 直式登機證（對齊感謝頁／結帳 CheckoutTicketReceipt）
 * 信件用 table 佈局（相容 Gmail）；資訊精簡於票面，完整欄位在票券下方。
 */

import path from "path";
import {
  formatDataAllowanceZh,
  formatExitIpZh,
  formatNetworksZh,
  formatSetupNotesZh,
} from "./esimDisplayZh.js";

const C = {
  bg: "#f4f4f4",
  card: "#ffffff",
  blue: "#1e4ad1",
  ticket: "#1e8fff",
  text: "#111111",
  muted: "#6b7280",
  soft: "#9ca3af",
  line: "#eaeaea",
  fieldBg: "#f7f7f8",
  white: "#ffffff",
  scoop: "#ffffff",
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function btn(href, label) {
  if (!href) return "";
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="display:block;background:${C.blue};color:#ffffff;text-decoration:none;text-align:center;font-weight:600;font-size:15px;line-height:1.2;padding:14px 20px;border-radius:6px;margin:0 0 10px;">${esc(label)}</a>`;
}

function link(href, label) {
  if (!href) return "";
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="color:${C.blue};text-decoration:underline;font-size:14px;">${esc(label)}</a>`;
}

/** 從 LPA／SM-DP+ 組出 Apple／Android 官方一鍵安裝深連結 */
function resolveInstallUrls(profile = {}) {
  const existingIos = String(profile.iosInstallUrl || "").trim();
  const existingAndroid = String(profile.androidInstallUrl || "").trim();
  const looksOfficial = (u) =>
    /esimsetup\.(apple|android)\.com/i.test(u) && /carddata=/i.test(u);

  let lpa = String(profile.lpa || "").trim();
  if (!lpa) {
    const smdp = String(profile.smdp || "").trim();
    const code = String(
      profile.activationCode || profile.androidCode || "",
    ).trim();
    if (smdp && code) lpa = `LPA:1$${smdp}$${code}`;
  }

  if (lpa && !/^LPA:1\$/i.test(lpa)) {
    /* keep as-is if already full */
  }

  const card = lpa ? encodeURIComponent(lpa) : "";
  const fromLpa = card
    ? {
        iosInstallUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${card}`,
        androidInstallUrl: `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${card}`,
      }
    : { iosInstallUrl: "", androidInstallUrl: "" };

  return {
    iosInstallUrl: looksOfficial(existingIos)
      ? existingIos
      : fromLpa.iosInstallUrl,
    androidInstallUrl: looksOfficial(existingAndroid)
      ? existingAndroid
      : fromLpa.androidInstallUrl,
  };
}

function displayValue(value) {
  const s = String(value ?? "").trim();
  return s || "—";
}

function guessDestCode(name) {
  const n = String(name || "");
  if (/日本|japan|\bjp\b/i.test(n)) return "JP";
  if (/韓國|korea|\bkr\b/i.test(n)) return "KR";
  if (/歐洲|europe|\beu\b/i.test(n)) return "EU";
  if (/美國|usa|america|\bus\b/i.test(n)) return "US";
  if (/泰國|thailand/i.test(n)) return "TH";
  if (/越南|vietnam/i.test(n)) return "VN";
  if (/新加坡|singapore/i.test(n)) return "SG";
  if (/馬來|malaysia/i.test(n)) return "MY";
  if (/印尼|indonesia/i.test(n)) return "ID";
  if (/菲律賓|philippines/i.test(n)) return "PH";
  if (/澳|australia/i.test(n)) return "AU";
  if (/紐西|new.?zealand/i.test(n)) return "NZ";
  if (/加拿大|canada/i.test(n)) return "CA";
  if (/英國|uk|britain/i.test(n)) return "GB";
  if (/香港|hong.?kong/i.test(n)) return "HK";
  if (/澳門|macao|macau/i.test(n)) return "MO";
  if (/中國|china/i.test(n)) return "CN";
  if (/全球|worldwide|global/i.test(n)) return "WW";
  if (/亞洲|asia/i.test(n)) return "AS";
  if (/台灣|taiwan/i.test(n)) return "TW";
  return "XX";
}

function guessDestLabel(code) {
  const map = {
    JP: "日本",
    KR: "韓國",
    EU: "歐洲",
    US: "美國",
    TH: "泰國",
    VN: "越南",
    SG: "新加坡",
    MY: "馬來西亞",
    ID: "印尼",
    PH: "菲律賓",
    AU: "澳洲",
    NZ: "紐西蘭",
    CA: "加拿大",
    GB: "英國",
    HK: "香港",
    MO: "澳門",
    CN: "中國",
    WW: "全球",
    AS: "亞洲",
    TW: "台灣",
    XX: "目的地",
  };
  return map[code] || "目的地";
}

function shortTail(id, n = 8) {
  const s = String(id || "").trim();
  if (!s) return "—";
  return s.length <= n ? s : s.slice(-n);
}

/**
 * @param {"copy"|"iccid"} action
 * copy = 只開複製中繼頁（自動複製後可關閉）；iccid = 複製語意＋導向流量查詢頁
 */
function copyRow(label, value, { origin = "", action = "copy" } = {}) {
  const raw = String(value ?? "").trim();
  const shown = displayValue(raw);
  let copyHref = "";
  if (raw && origin) {
    if (action === "iccid") {
      copyHref = `${origin}/data-query?iccid=${encodeURIComponent(raw)}`;
    } else {
      // autoclose=1：複製成功後自動關閉／返回，避免郵件裡「另開一頁停住」
      copyHref = `${origin}/copy?autoclose=1&t=${encodeURIComponent(raw)}`;
    }
  }
  const btnLabel = action === "iccid" ? "複製＋查詢" : "複製";
  const copyBtn = copyHref
    ? `<a href="${esc(copyHref)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-left:8px;padding:4px 10px;border:1px solid ${C.blue};border-radius:6px;background:#f0f7ff;color:${C.blue};font-size:11px;font-weight:700;text-decoration:none;line-height:1.2;white-space:nowrap;vertical-align:middle;">${btnLabel}</a>`
    : "";
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${C.line};vertical-align:top;width:28%;">
        <div style="font-size:12px;color:${C.muted};font-weight:600;">${esc(label)}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid ${C.line};vertical-align:top;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;color:${raw ? C.text : C.soft};word-break:break-all;line-height:1.5;vertical-align:middle;">
              ${esc(shown)}
            </td>
            <td style="width:1%;padding-left:8px;vertical-align:middle;white-space:nowrap;">
              ${copyBtn}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function ticketMini(label, value, align = "left") {
  return `
    <td style="padding:0 6px 8px 0;vertical-align:top;text-align:${align};">
      <div style="font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.82);margin:0 0 3px;">${esc(label)}</div>
      <div style="font-size:14px;font-weight:700;color:#ffffff;line-height:1.3;word-break:break-word;">${esc(displayValue(value))}</div>
    </td>`;
}

/** 票券撕裂圓缺 CID（寄信時 inline attachment，Gmail 不吃 border-radius） */
export const ESIM_TICKET_SCOOP_CID = {
  left: "esim-ticket-scoop-left",
  right: "esim-ticket-scoop-right",
};

/** nodemailer inline 圖：圓缺 PNG */
export function getEsimFulfillmentInlineAttachments() {
  const root = process.cwd();
  return [
    {
      filename: "ticket-scoop-left.png",
      path: path.join(root, "public/images/email/ticket-scoop-left.png"),
      cid: ESIM_TICKET_SCOOP_CID.left,
      contentDisposition: "inline",
    },
    {
      filename: "ticket-scoop-right.png",
      path: path.join(root, "public/images/email/ticket-scoop-right.png"),
      cid: ESIM_TICKET_SCOOP_CID.right,
      contentDisposition: "inline",
    },
  ];
}

function scoopSrcPair(origin, useCid) {
  if (useCid) {
    return {
      left: `cid:${ESIM_TICKET_SCOOP_CID.left}`,
      right: `cid:${ESIM_TICKET_SCOOP_CID.right}`,
    };
  }
  const base = String(origin || "https://www.jeko-esim.com.tw").replace(
    /\/$/,
    "",
  );
  return {
    left: `${base}/images/email/ticket-scoop-left.png`,
    right: `${base}/images/email/ticket-scoop-right.png`,
  };
}

/**
 * 直式登機證 — 對齊感謝頁 CheckoutTicketReceipt 視覺
 * Gmail 會吃掉 td border-radius／absolute，圓缺改用 PNG（寄信 CID）
 */
function verticalTicket(
  profile,
  { orderNumber = "", orderMeta = {}, scoopLeft = "", scoopRight = "" } = {},
) {
  const title = profile.name || "eSIM";
  const toCode = guessDestCode(title);
  const toLabel = guessDestLabel(toCode);
  const days = profile.serviceDays
    ? `${profile.serviceDays} 天`
    : formatDataAllowanceZh(profile.dataAllowance) || "—";
  const status = orderMeta.status || "SUCCESS";
  const payment = orderMeta.paymentType || orderMeta.PaymentType || "—";
  const orderId =
    orderMeta.merchantOrderNo || orderMeta.orderId || orderNumber || "—";
  const tradeNo = orderMeta.tradeNo || orderMeta.TradeNo || "";
  const payTime = orderMeta.payTime || orderMeta.PayTime || "";

  const qr = profile.src
    ? `<img src="${esc(profile.src)}" alt="eSIM QR Code" width="112" height="112" style="display:block;margin:0 auto;border:0;border-radius:8px;background:#ffffff;padding:6px;" />`
    : `<div style="width:112px;height:112px;margin:0 auto;background:rgba(255,255,255,0.2);border-radius:8px;color:#fff;font-size:13px;font-weight:700;line-height:112px;text-align:center;">QR</div>`;

  const barcodeLabel = tradeNo
    ? `${shortTail(orderId)} · ${shortTail(tradeNo, 10)}`
    : shortTail(orderId);

  const scoopR = 16;
  const line = "rgba(255,255,255,0.4)";
  const dash = "rgba(255,255,255,0.65)";
  const leftSrc = scoopLeft || scoopSrcPair("", false).left;
  const rightSrc = scoopRight || scoopSrcPair("", false).right;

  // 單列：左右 @2x PNG 半圓 + 虛線略低於圓心（不靠 rowspan / border-radius）
  const perforation = `
    <tr>
      <td style="padding:0;background:${C.ticket};font-size:0;line-height:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
          <tr>
            <td width="${scoopR}" valign="top" style="width:${scoopR}px;padding:0;background:${C.ticket};font-size:0;line-height:0;">
              <img src="${esc(leftSrc)}" width="${scoopR}" height="${scoopR * 2}" alt="" style="display:block;width:${scoopR}px;height:${scoopR * 2}px;border:0;outline:none;" />
            </td>
            <td valign="top" style="padding:0;height:${scoopR * 2}px;background:${C.ticket};font-size:0;line-height:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                <tr><td height="20" style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>
                <tr><td style="border-top:1px dashed ${dash};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
                <tr><td height="11" style="height:11px;line-height:11px;font-size:0;">&nbsp;</td></tr>
              </table>
            </td>
            <td width="${scoopR}" valign="top" style="width:${scoopR}px;padding:0;background:${C.ticket};font-size:0;line-height:0;">
              <img src="${esc(rightSrc)}" width="${scoopR}" height="${scoopR * 2}" alt="" style="display:block;width:${scoopR}px;height:${scoopR * 2}px;border:0;outline:none;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

  const payMetaRow =
    payTime || tradeNo
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
          <tr>
            ${ticketMini("付款時間", payTime || "—", "left")}
            ${ticketMini("交易序號", tradeNo || "—", "right")}
          </tr>
        </table>`
      : "";

  return `
  <table role="presentation" class="esim-ticket" width="100%" cellpadding="0" cellspacing="0" align="center" border="0" style="width:100%;max-width:400px;margin:0 auto 22px;border-collapse:separate;border-spacing:0;">
    <tr>
      <td style="background:${C.ticket};border-radius:${scoopR}px ${scoopR}px 0 0;padding:19px 22px 12px;color:#ffffff;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${ticketMini("付款狀態", status, "left")}
            ${ticketMini("付款方式", payment, "right")}
          </tr>
        </table>
        <div style="margin:0 0 10px;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:rgba(255,255,255,0.85);margin:0 0 3px;">訂單編號</div>
          <div style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;font-weight:700;color:#fff;line-height:1.35;word-break:break-all;">${esc(orderId)}</div>
        </div>
        ${payMetaRow}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${line};border-bottom:1px solid ${line};margin:0 0 12px;">
          <tr>
            <td style="font-size:28px;font-weight:500;letter-spacing:0.04em;color:#fff;padding:12px 0 2px;">TW</td>
            <td style="text-align:center;font-size:18px;color:#fff;padding:12px 0 2px;">✈</td>
            <td style="text-align:right;font-size:28px;font-weight:500;letter-spacing:0.04em;color:#fff;padding:12px 0 2px;">${esc(toCode)}</td>
          </tr>
          <tr>
            <td style="font-size:11px;color:rgba(255,255,255,0.9);padding:0 0 12px;">台灣</td>
            <td style="padding:0 0 12px;"></td>
            <td style="text-align:right;font-size:11px;color:rgba(255,255,255,0.9);padding:0 0 12px;">${esc(toLabel)}</td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            ${ticketMini("方案", title, "left")}
            ${ticketMini("天數", days, "right")}
          </tr>
        </table>
        <p style="margin:4px 0 0;font-size:11px;line-height:1.45;color:rgba(255,255,255,0.9);text-align:center;">
          請掃描下方 QR Code 安裝；抵達目的地後再啟用。
        </p>
      </td>
    </tr>
    ${perforation}
    <tr>
      <td style="background:${C.ticket};border-radius:0 0 ${scoopR}px ${scoopR}px;padding:8px 20px 20px;text-align:center;">
        ${qr}
        <div style="margin-top:10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10px;font-weight:500;letter-spacing:0.04em;color:rgba(255,255,255,0.92);word-break:break-all;line-height:1.35;">
          ${esc(barcodeLabel)}
        </div>
      </td>
    </tr>
  </table>`;
}

/** APN／設定：區塊一律顯示；供應商方案代碼／英文用量規則不對外顯示 */
function setupBlock(profile) {
  const apn = profile.apn;
  const hasApn = Boolean(apn?.apn);
  const notes = String(profile.setupNotes || "").trim();
  const specialDesc = String(profile.specialDesc || "").trim();
  const networksZh = formatNetworksZh(profile.networks);
  const days = String(profile.serviceDays || "").trim();
  const dataZh = formatDataAllowanceZh(profile.dataAllowance);
  const validityPeriod = String(profile.validityPeriod || "").trim();
  const exitIpZh = formatExitIpZh(profile.exitIp);

  const extraNotes = formatSetupNotesZh(
    [specialDesc, notes]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join("｜"),
  );

  const facts = [
    `服務天數：${days ? `${esc(days)} 天（自啟動日起算）` : "—"}`,
    `流量：${dataZh ? esc(dataZh) : "—"}`,
    `未啟用有效期：${validityPeriod ? `${esc(validityPeriod)} 天` : "—"}`,
    `出網 IP：${exitIpZh ? esc(exitIpZh) : "—"}`,
  ];

  const apnRows = hasApn
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fieldBg};border-radius:6px;margin:0 0 14px;">
        <tr><td style="padding:14px 16px;font-size:13px;color:${C.text};line-height:1.75;font-family:ui-monospace,Menlo,Consolas,monospace;">
          <div>APN：<strong style="font-family:inherit;">${esc(apn.apn)}</strong></div>
          <div>用戶名：${apn.username ? esc(apn.username) : "—"}</div>
          <div>密碼：${apn.password ? esc(apn.password) : "—"}</div>
          <div>身份驗證：${apn.auth ? esc(apn.auth) : "—"}</div>
        </td></tr>
      </table>`
    : `
      <p style="margin:0 0 14px;font-size:14px;color:${C.muted};line-height:1.6;">
        供應商未提供 APN（多數情況會自動設定）。若無法上網，請至訂單頁或官網教學查看。
      </p>`;

  return `
    <div style="margin-top:28px;padding-top:24px;border-top:1px solid ${C.line};">
      <!--[if !mso]><!-->
      <details open style="margin:0;">
        <summary style="cursor:pointer;list-style:none;outline:none;margin:0 0 10px;font-size:18px;line-height:1.3;color:${C.text};font-weight:700;">
          此 eSIM 相關設定 <span style="font-size:13px;font-weight:500;color:${C.soft};">（點此收合／展開）</span>
        </summary>
        <div style="margin-top:4px;">
      <!--<![endif]-->
      <!--[if mso]>
        <h2 style="margin:0 0 10px;font-size:18px;line-height:1.3;color:${C.text};font-weight:700;">此 eSIM 相關設定</h2>
      <![endif]-->
      <p style="margin:0 0 16px;font-size:14px;color:${C.muted};line-height:1.65;">
        一旦刪除，此 eSIM 無法重新安裝。以下資訊來自供應商方案資料。
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;">
        ${facts
          .map(
            (f) =>
              `<tr><td style="padding:6px 0;font-size:14px;color:${C.muted};line-height:1.55;">${f}</td></tr>`,
          )
          .join("")}
      </table>
      <h3 style="margin:0 0 8px;font-size:14px;color:${C.text};font-weight:700;">APN 設定</h3>
      ${apnRows}
      <h3 style="margin:0 0 8px;font-size:14px;color:${C.text};font-weight:700;">其他設置／注意事項</h3>
      <p style="margin:0 0 14px;font-size:14px;color:${C.muted};line-height:1.65;white-space:pre-wrap;">${esc(extraNotes || "—")}</p>
      <p style="margin:0;font-size:13px;color:${C.muted};line-height:1.55;word-break:break-word;">可用網路：${esc(networksZh || "—")}</p>
      <!--[if !mso]><!-->
        </div>
      </details>
      <!--<![endif]-->
    </div>`;
}

function profileCard(profile, idx, total, origin = "", orderCtx = {}) {
  const androidCode =
    profile.androidCode || profile.lpa || profile.activationCode || "";
  const opts = { origin };
  const { iosInstallUrl, androidInstallUrl } = resolveInstallUrls(profile);
  const hasInstall = Boolean(iosInstallUrl || androidInstallUrl);

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${idx < total - 1 ? "36" : "0"}px;">
    <tr><td>
      ${total > 1 ? `<p style="margin:0 0 10px;font-size:13px;color:${C.soft};">方案 ${idx + 1}／${total}</p>` : ""}

      ${verticalTicket(profile, orderCtx)}

      ${
        hasInstall
          ? `<div class="esim-install-btns" style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
          ${btn(iosInstallUrl, "一鍵安裝（iOS 17.4+）")}
          ${btn(androidInstallUrl, "一鍵安裝（Android 10.0+）")}
          <p style="margin:0 0 12px;font-size:13px;color:${C.soft};line-height:1.55;">請用手機 Safari／Chrome 開啟（僅行動裝置適用）。建議先連上穩定 Wi‑Fi。</p>
      </div>
      <p class="esim-install-desktop-hint" style="margin:8px 0 14px;font-size:13px;color:${C.soft};line-height:1.55;">電腦請掃描票券 QR Code，或以手機開啟本信使用一鍵安裝。</p>`
          : `<p style="margin:0 0 12px;font-size:13px;color:${C.soft};line-height:1.55;">請掃描票券 QR，或手動輸入 SM-DP+／激活碼安裝。</p>`
      }

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${copyRow("ICCID", profile.iccid, { ...opts, action: "iccid" })}
        ${copyRow("SM-DP+ 位址", profile.smdp, opts)}
        ${copyRow("激活碼", profile.activationCode, opts)}
        ${copyRow("Android 激活碼", androidCode, opts)}
        ${copyRow("完整 LPA", profile.lpa, opts)}
      </table>

      ${setupBlock(profile)}
    </td></tr>
  </table>`;
}

function tipsSection() {
  return `
  <div style="margin-top:32px;padding-top:24px;border-top:1px solid ${C.line};">
    <h2 style="margin:0 0 12px;font-size:18px;color:${C.text};font-weight:700;">如何安裝使用 eSIM</h2>
    <ol style="margin:0;padding-left:18px;color:${C.muted};font-size:14px;line-height:1.7;">
      <li>設定 → 行動服務／行動網路 → 加入 eSIM（或加入行動方案）。</li>
      <li>掃描信件中的 QR Code，或手動輸入 SM-DP+ 位址與激活碼。</li>
      <li>若尚未抵達目的地：安裝後請先關閉該 eSIM；抵達後再啟用並設為行動數據。</li>
    </ol>
    <h2 style="margin:22px 0 10px;font-size:18px;color:${C.text};font-weight:700;">貼心提示</h2>
    <ol style="margin:0;padding-left:18px;color:${C.muted};font-size:13px;line-height:1.7;">
      <li>請在穩定 Wi‑Fi 環境下新增 eSIM。</li>
      <li>安裝前請先確認方案的啟用／效期規則。</li>
      <li>啟用後若無網路，請檢查上方 APN 與電信商設定。</li>
      <li>一張 eSIM 綁定一台裝置，無法轉移至其他手機。</li>
      <li>可安裝多組 eSIM，但通常同時只能啟用一組數據。</li>
      <li>iPhone 若顯示「啟用中」且未到目的地，屬常見現象，抵達後再開啟即可。</li>
      <li>即使未啟用，部分裝置仍可能產生微量背景流量，建議抵達後再開啟數據漫遊。</li>
    </ol>
  </div>`;
}

/** 官方 LINE：置中 logo + 標題 + 說明（參考 LINE 公式アカウント樣式） */
function lineOfficialSection({ lineUrl, lineLogoUrl }) {
  if (!lineUrl) return "";
  const logo = lineLogoUrl || "";
  if (!logo) return "";
  return `
  <div style="margin-top:36px;padding-top:28px;border-top:1px solid ${C.line};text-align:center;">
    <a href="${esc(lineUrl)}" style="text-decoration:none;color:inherit;display:inline-block;">
      <img src="${esc(logo)}" alt="LINE" width="56" height="56" style="display:block;margin:0 auto 14px;width:56px;height:56px;border:0;border-radius:12px;" />
      <div style="font-size:18px;font-weight:700;color:${C.text};line-height:1.4;margin:0 0 8px;">LINE 官方帳號</div>
      <div style="font-size:13px;font-weight:400;color:${C.muted};line-height:1.6;margin:0 0 4px;">
        請至 LINE「加入好友」以 QR 碼或點此連結註冊。
      </div>
      <div style="font-size:13px;color:${C.blue};text-decoration:underline;margin-top:10px;">加入 Jeko eSIM 官方 LINE</div>
    </a>
  </div>`;
}

function resolveSiteOrigin(webOrderUrl = "") {
  try {
    if (webOrderUrl) return new URL(webOrderUrl).origin;
  } catch {
    /* ignore */
  }
  const fromEnv = String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.STORE_URL ||
      "https://www.jeko-esim.com.tw",
  ).replace(/\/$/, "");
  return fromEnv;
}

function resolveLineOaUrl() {
  return String(
    process.env.NEXT_PUBLIC_LINE_OA_URL ||
      process.env.LINE_OA_URL ||
      "https://line.me/R/ti/p/@593gvyzn",
  ).trim();
}

/**
 * @param {{
 *   orderNumber: string,
 *   profiles: Array<Record<string, any>>,
 *   webOrderUrl?: string,
 *   siteName?: string,
 *   logoUrl?: string,
 *   lineUrl?: string,
 *   orderMeta?: {
 *     status?: string,
 *     paymentType?: string,
 *     PaymentType?: string,
 *     payTime?: string,
 *     PayTime?: string,
 *     tradeNo?: string,
 *     TradeNo?: string,
 *     merchantOrderNo?: string,
 *     orderId?: string,
 *   },
 * }} opts
 */
export function buildEsimFulfillmentEmailHtml({
  orderNumber,
  profiles = [],
  webOrderUrl = "",
  siteName = "Jeko eSIM",
  logoUrl = "",
  lineUrl = "",
  orderMeta = {},
  useInlineCid = false,
}) {
  const list = Array.isArray(profiles) ? profiles : [];
  const origin = resolveSiteOrigin(webOrderUrl);
  const scoops = scoopSrcPair(origin, useInlineCid);
  const orderCtx = {
    orderNumber,
    orderMeta: orderMeta || {},
    scoopLeft: scoops.left,
    scoopRight: scoops.right,
  };
  const cards = list
    .map((p, i) => profileCard(p, i, list.length, origin, orderCtx))
    .join("");
  const logo =
    logoUrl ||
    `${origin}/images/Logo/logo-no-bg.png`;
  const oaUrl = lineUrl || resolveLineOaUrl();
  const lineLogo = `${origin}/images/line.png`;

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>您的 eSIM 已準備就緒</title>
  <style type="text/css">
    /* 一鍵安裝：僅手機顯示（電腦無法完成 eSIM 系統安裝） */
    .esim-install-btns {
      display: none !important;
      max-height: 0 !important;
      overflow: hidden !important;
      mso-hide: all;
    }
    .esim-install-desktop-hint {
      display: block !important;
    }
    /* 手機：內容約 95% 寬；票券拉滿白卡；顯示一鍵安裝 */
    @media only screen and (max-width: 620px) {
      .esim-outer-pad {
        padding: 16px 2.5% !important;
      }
      .esim-card,
      .esim-footer {
        width: 100% !important;
        max-width: 100% !important;
      }
      .esim-card-pad {
        padding: 22px 14px !important;
      }
      .esim-ticket {
        width: 100% !important;
        max-width: 100% !important;
      }
      .esim-install-btns {
        display: block !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .esim-install-desktop-hint {
        display: none !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
    <tr>
      <td class="esim-outer-pad" align="center" style="padding:28px 3%;">
      <table role="presentation" class="esim-card" width="720" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;background:${C.card};border-radius:4px;">
        <tr><td class="esim-card-pad" style="padding:36px 36px;">
          <div style="margin:0 0 22px;text-align:left;">
            <img src="${esc(logo)}" alt="${esc(siteName)}" width="44" height="44" style="display:block;width:44px;height:auto;border:0;outline:none;" />
          </div>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:${C.text};font-weight:700;">您的 eSIM 已準備就緒</h1>
          <p style="margin:0 0 28px;font-size:15px;color:${C.muted};line-height:1.65;">
            訂單 <span style="color:${C.text};font-weight:600;">${esc(orderNumber)}</span> 的 QR Code 與手動安裝資訊如下。建議先存下本信，並在抵達目的地後再啟用。
          </p>

          ${cards || `<p style="color:${C.soft};">尚未取得 eSIM 資料，請聯繫客服。</p>`}

          ${
            webOrderUrl
              ? `<div style="margin:28px 0 0;text-align:center;">
                   ${link(webOrderUrl, "在網頁開啟訂單（可一鍵複製完整資訊）")}
                 </div>`
              : ""
          }

          ${tipsSection()}

          <p style="margin:32px 0 0;font-size:15px;color:${C.muted};line-height:1.6;">
            祝旅途順利，<br/>
            <span style="color:${C.text};">${esc(siteName)}</span>
          </p>

          ${lineOfficialSection({ lineUrl: oaUrl, lineLogoUrl: lineLogo })}
        </td></tr>
      </table>
      <table role="presentation" class="esim-footer" width="720" cellpadding="0" cellspacing="0" style="width:100%;max-width:720px;">
        <tr><td style="padding:24px 16px 0;text-align:center;font-size:12px;color:${C.soft};line-height:1.7;">
          此郵件由系統自動發送。若非本人操作請忽略。<br/>
          © ${new Date().getFullYear()} ${esc(siteName)}
        </td></tr>
      </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildEsimFulfillmentEmailText({ orderNumber, profiles = [] }) {
  const lines = [`您的 eSIM 訂單 ${orderNumber} 已準備就緒。`, ""];
  for (const p of profiles) {
    const { iosInstallUrl, androidInstallUrl } = resolveInstallUrls(p);
    lines.push(`【${p.name || "eSIM"}】`);
    if (p.iccid) lines.push(`ICCID: ${p.iccid}`);
    if (p.smdp) lines.push(`SM-DP+: ${p.smdp}`);
    if (p.activationCode) lines.push(`激活碼: ${p.activationCode}`);
    if (p.lpa) lines.push(`LPA: ${p.lpa}`);
    if (p.serviceDays) lines.push(`天數: ${p.serviceDays}`);
    const dataZh = formatDataAllowanceZh(p.dataAllowance);
    if (dataZh) lines.push(`流量: ${dataZh}`);
    if (p.apn?.apn) {
      lines.push(`APN: ${p.apn.apn}`);
      if (p.apn.username) lines.push(`APN 用戶名: ${p.apn.username}`);
      if (p.apn.password) lines.push(`APN 密碼: ${p.apn.password}`);
      if (p.apn.auth && (p.apn.username || p.apn.password)) {
        lines.push(`APN 驗證: ${p.apn.auth}`);
      }
    }
    const notes = formatSetupNotesZh(
      [p.specialDesc, p.setupNotes].filter(Boolean).join("｜"),
    );
    if (notes) lines.push(`注意: ${notes}`);
    const nets = formatNetworksZh(p.networks);
    if (nets) lines.push(`網路: ${nets}`);
    if (iosInstallUrl) lines.push(`iOS 一鍵安裝（僅手機）: ${iosInstallUrl}`);
    if (androidInstallUrl)
      lines.push(`Android 一鍵安裝（僅手機）: ${androidInstallUrl}`);
    lines.push("電腦請掃描 QR Code 或以手機開啟本信。");
    lines.push("");
  }
  lines.push("請使用支援 HTML 的信箱查看 QR Code，或至官網訂單頁開啟。");
  const line =
    process.env.NEXT_PUBLIC_LINE_OA_URL ||
    process.env.LINE_OA_URL ||
    "https://line.me/R/ti/p/@593gvyzn";
  if (line) {
    lines.push("");
    lines.push("LINE 官方帳號：" + line);
  }
  return lines.join("\n");
}
