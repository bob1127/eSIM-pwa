/**
 * eSIM 發貨 Email — Paste／SendGrid 極簡風格
 * 色票僅三色：淺灰底 #f4f4f4、白卡 #fff、強調藍 #007bff（內文為黑／灰）
 *
 * Email 無法跑 JS「一鍵複製」，改為：
 * - 欄位用等寬字方便長按複製
 * - 提供網頁訂單連結
 * - iOS／Android 一鍵安裝為真實深連結
 */

import {
  formatDataAllowanceZh,
  formatExitIpZh,
  formatNetworksZh,
  formatSetupNotesZh,
} from "./esimDisplayZh.js";

const C = {
  bg: "#f4f4f4",
  card: "#ffffff",
  blue: "#007bff",
  text: "#111111",
  muted: "#6b7280",
  soft: "#9ca3af",
  line: "#eaeaea",
  fieldBg: "#f7f7f8",
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
  return `<a href="${esc(href)}" style="display:block;background:${C.blue};color:#ffffff;text-decoration:none;text-align:center;font-weight:600;font-size:15px;line-height:1.2;padding:14px 20px;border-radius:6px;margin:0 0 10px;">${esc(label)}</a>`;
}

function link(href, label) {
  if (!href) return "";
  return `<a href="${esc(href)}" style="color:${C.blue};text-decoration:underline;font-size:14px;">${esc(label)}</a>`;
}

function displayValue(value) {
  const s = String(value ?? "").trim();
  return s || "—";
}

/**
 * @param {"copy"|"iccid"} action
 * copy = 只開複製中繼頁；iccid = 複製語意＋導向流量查詢頁
 */
function copyRow(label, value, { origin = "", action = "copy" } = {}) {
  const raw = String(value ?? "").trim();
  const shown = displayValue(raw);
  let copyHref = "";
  if (raw && origin) {
    if (action === "iccid") {
      copyHref = `${origin}/data-query?iccid=${encodeURIComponent(raw)}`;
    } else {
      copyHref = `${origin}/copy?t=${encodeURIComponent(raw)}`;
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

function profileCard(profile, idx, total, origin = "") {
  const title = profile.name || `eSIM #${idx + 1}`;
  const qr = profile.src
    ? `<img src="${esc(profile.src)}" alt="eSIM QR Code" width="200" height="200" style="display:block;margin:0 auto;border:0;" />`
    : `<p style="color:${C.soft};text-align:center;margin:0;">（QR Code 請至網頁訂單頁查看）</p>`;

  const androidCode =
    profile.androidCode || profile.lpa || profile.activationCode || "";
  const opts = { origin };

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 ${idx < total - 1 ? "32" : "0"}px;">
    <tr><td>
      <h2 style="margin:0 0 6px;font-size:18px;line-height:1.35;color:${C.text};font-weight:700;">${esc(title)}</h2>
      ${total > 1 ? `<p style="margin:0 0 16px;font-size:13px;color:${C.soft};">方案 ${idx + 1}／${total}</p>` : `<div style="height:12px;"></div>`}

      <div style="text-align:center;padding:8px 0 20px;">${qr}</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${copyRow("ICCID", profile.iccid, { ...opts, action: "iccid" })}
        ${copyRow("SM-DP+ 位址", profile.smdp, opts)}
        ${copyRow("激活碼", profile.activationCode, opts)}
        ${copyRow("Android 激活碼", androidCode, opts)}
        ${copyRow("完整 LPA", profile.lpa, opts)}
      </table>

      <div style="margin:22px 0 8px;">
        ${btn(profile.iosInstallUrl, "一鍵安裝（iOS 17.4+）")}
        ${btn(profile.androidInstallUrl, "一鍵安裝（Android 10.0+）")}
      </div>
      ${
        !profile.iosInstallUrl && !profile.androidInstallUrl
          ? `<p style="margin:0;font-size:13px;color:${C.soft};line-height:1.55;">若一鍵安裝未出現，請掃描上方 QR，或手動輸入 SM-DP+／激活碼。</p>`
          : `<p style="margin:4px 0 0;font-size:13px;color:${C.soft};line-height:1.55;">建議先連上穩定 Wi‑Fi。抵達目的地後再啟用該 eSIM 作為行動數據。一鍵安裝會開啟系統 eSIM 設定；僅複製 SM-DP+ 無法自動跳轉設定頁。</p>`
      }

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
 * }} opts
 */
export function buildEsimFulfillmentEmailHtml({
  orderNumber,
  profiles = [],
  webOrderUrl = "",
  siteName = "Jeko eSIM",
  logoUrl = "",
  lineUrl = "",
}) {
  const list = Array.isArray(profiles) ? profiles : [];
  const origin = resolveSiteOrigin(webOrderUrl);
  const cards = list
    .map((p, i) => profileCard(p, i, list.length, origin))
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
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;">
        <tr><td style="background:${C.card};border-radius:4px;padding:40px 44px;">
          <div style="margin:0 0 22px;text-align:left;">
            <img src="${esc(logo)}" alt="${esc(siteName)}" width="44" height="44" style="display:block;width:44px;height:auto;border:0;outline:none;" />
          </div>
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25;color:${C.text};font-weight:700;">您的 eSIM 已準備就緒</h1>
          <p style="margin:0 0 24px;font-size:15px;color:${C.muted};line-height:1.65;">
            訂單 <span style="color:${C.text};font-weight:600;">${esc(orderNumber)}</span> 的 QR Code 與手動安裝資訊如下。建議先存下本信，並在抵達目的地後再啟用。
          </p>

          ${
            webOrderUrl
              ? `<div style="margin:0 0 28px;">
                   ${btn(webOrderUrl, "在網頁開啟訂單")}
                   <div style="text-align:center;margin-top:6px;">${link(webOrderUrl, "或點此開啟（可一鍵複製完整資訊）")}</div>
                 </div>`
              : ""
          }

          ${cards || `<p style="color:${C.soft};">尚未取得 eSIM 資料，請聯繫客服。</p>`}

          ${tipsSection()}

          <p style="margin:32px 0 0;font-size:15px;color:${C.muted};line-height:1.6;">
            祝旅途順利，<br/>
            <span style="color:${C.text};">${esc(siteName)}</span>
          </p>

          ${lineOfficialSection({ lineUrl: oaUrl, lineLogoUrl: lineLogo })}
        </td></tr>
        <tr><td style="padding:24px 8px 0;text-align:center;font-size:12px;color:${C.soft};line-height:1.7;">
          此郵件由系統自動發送。若非本人操作請忽略。<br/>
          © ${new Date().getFullYear()} ${esc(siteName)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildEsimFulfillmentEmailText({ orderNumber, profiles = [] }) {
  const lines = [`您的 eSIM 訂單 ${orderNumber} 已準備就緒。`, ""];
  for (const p of profiles) {
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
    if (p.iosInstallUrl) lines.push(`iOS 一鍵安裝: ${p.iosInstallUrl}`);
    if (p.androidInstallUrl) lines.push(`Android 一鍵安裝: ${p.androidInstallUrl}`);
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
