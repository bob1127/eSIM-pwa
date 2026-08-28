/**
 * Google Sheets 自動記帳（付款成功 append 一列，order_id 冪等）
 *
 * 依訂單類型寫入三張工作表：
 *   主站收入 / 夥伴商店 / 優惠連結夥伴
 *
 * 環境變數：
 *   GOOGLE_SHEETS_ID              — 試算表 ID（網址 /d/{ID}/edit）
 *   GOOGLE_SHEETS_TAB_MAIN        — 主站（預設「主站收入」）
 *   GOOGLE_SHEETS_TAB_STORE       — 夥伴店（預設「夥伴商店」）
 *   GOOGLE_SHEETS_TAB_REFERRAL    — 優惠連結（預設「優惠連結夥伴」）
 *   GOOGLE_SHEETS_TAB             — 舊版單表名稱；僅作為 MAIN 後備
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — 服務帳號整包 JSON（一行，私鑰 \n 保留）
 *   或 GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
 *   ACCOUNTING_SHEET_ENABLED      — 設 false 可關閉（預設有 ID + 憑證即啟用）
 */
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const HEADERS = [
  "日期",
  "訂單編號",
  "金流",
  "入帳帳戶",
  "銷售額",
  "手續費(估)",
  "商品摘要",
  "成本(估)",
  "毛利(估)",
  "金流單號",
  "客人Email",
  "夥伴店",
  "備註",
];

const FEE_RATE = Number(process.env.ACCOUNTING_FEE_RATE || 0.028) || 0.028;

export function isAccountingSheetConfigured() {
  if (process.env.ACCOUNTING_SHEET_ENABLED === "false") return false;
  const sheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!sheetId) return false;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
    process.env.GOOGLE_PRIVATE_KEY?.trim()
  );
}

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON 不是合法 JSON");
    }
  }
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new Error("缺少 Google 服務帳號憑證");
  }
  return { client_email: clientEmail, private_key: privateKey };
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}

const TAB_DEFAULTS = {
  main: "主站收入",
  store: "夥伴商店",
  referral: "優惠連結夥伴",
};

function getTabNames() {
  const legacy = process.env.GOOGLE_SHEETS_TAB?.trim();
  return {
    main:
      process.env.GOOGLE_SHEETS_TAB_MAIN?.trim() ||
      legacy ||
      TAB_DEFAULTS.main,
    store: process.env.GOOGLE_SHEETS_TAB_STORE?.trim() || TAB_DEFAULTS.store,
    referral:
      process.env.GOOGLE_SHEETS_TAB_REFERRAL?.trim() || TAB_DEFAULTS.referral,
  };
}

/** @returns {"main"|"store"|"referral"} */
export function resolveAccountingChannel(payload = {}) {
  const storeId = String(
    payload.partnerStoreId ?? payload.partner_store_id ?? "",
  ).trim();
  const isPartner =
    payload.isPartnerOrder === true ||
    payload.isPartner === true ||
    String(payload.isPartnerOrder ?? payload.isPartner ?? "") === "true";
  if (isPartner && storeId) return "store";

  const ref = String(
    payload.referralCode ?? payload.jeko_referral_code ?? "",
  ).trim();
  if (ref) return "referral";

  return "main";
}

function getTabNameForChannel(channel) {
  const tabs = getTabNames();
  if (channel === "store") return tabs.store;
  if (channel === "referral") return tabs.referral;
  return tabs.main;
}

function sheetRange(tabName, suffix = "") {
  const tab = String(tabName || "").replace(/'/g, "''");
  return `'${tab}'${suffix}`;
}

function partnerColumnLabel(payload = {}, channel = "main") {
  if (channel === "store") {
    const storeId = String(
      payload.partnerStoreId ?? payload.partner_store_id ?? "",
    ).trim();
    return storeId ? `店#${storeId}` : "夥伴店";
  }
  if (channel === "referral") {
    const ref = String(
      payload.referralCode ?? payload.jeko_referral_code ?? "",
    ).trim();
    return ref || "優惠連結";
  }
  return "否";
}

function fmtDate(iso) {
  if (!iso) return new Date().toISOString().slice(0, 10);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function summarizeItems(items = []) {
  return (items || [])
    .map((it) => {
      const q = Math.max(1, Number(it.quantity) || 1);
      const name = String(it.name || it.title || "eSIM").trim();
      return q > 1 ? `${name}×${q}` : name;
    })
    .filter(Boolean)
    .join("、")
    .slice(0, 200);
}

function estimateCost(items = []) {
  let sum = 0;
  for (const it of items || []) {
    const q = Math.max(1, Number(it.quantity) || 1);
    const unit =
      Number(it.unitCost ?? it.cost_price ?? it.b2b_price ?? it.cost) || 0;
    if (unit > 0) sum += unit * q;
  }
  return sum > 0 ? Math.round(sum) : "";
}

function depositAccount(provider) {
  if (provider === "linepay") return "LINE Pay";
  if (provider === "newebpay") return "新光銀行(藍新)";
  return String(provider || "—");
}

function paymentLabel(provider) {
  if (provider === "linepay") return "LINE Pay";
  if (provider === "newebpay") return "藍新";
  return String(provider || "—");
}

/**
 * @param {object} payload
 * @param {string} payload.orderId
 * @param {number} payload.amount
 * @param {string} [payload.paymentProvider] newebpay | linepay
 * @param {string} [payload.payTime]
 * @param {string} [payload.tradeNo]
 * @param {string} [payload.customerEmail]
 * @param {Array} [payload.items]
 * @param {boolean} [payload.isPartner]
 * @param {boolean} [payload.isPartnerOrder]
 * @param {string} [payload.partnerStoreId]
 * @param {string} [payload.referralCode]
 * @param {string} [payload.note]
 */
export function buildAccountingRow(payload = {}, channel = resolveAccountingChannel(payload)) {
  const orderId = String(payload.orderId || "").trim();
  const amount = Math.round(Number(payload.amount) || 0);
  const fee =
    amount > 0 ? Math.round(amount * FEE_RATE) : "";
  const cost = estimateCost(payload.items);
  const gross =
    typeof cost === "number" && cost > 0 && amount > 0
      ? amount - cost
      : "";

  return [
    fmtDate(payload.payTime),
    orderId,
    paymentLabel(payload.paymentProvider),
    depositAccount(payload.paymentProvider),
    amount || "",
    fee,
    summarizeItems(payload.items),
    cost,
    gross,
    String(payload.tradeNo || "").slice(0, 80),
    String(payload.customerEmail || "").slice(0, 120),
    partnerColumnLabel(payload, channel),
    String(payload.note || "").slice(0, 120),
  ];
}

async function ensureHeaderRow(sheets, spreadsheetId, tabName) {
  const range = sheetRange(tabName, "!A1:M1");
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const first = existing.data.values?.[0]?.[0];
  if (first === HEADERS[0]) return;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "RAW",
    requestBody: { values: [HEADERS] },
  });
}

async function orderIdExists(sheets, spreadsheetId, orderId) {
  const tabs = getTabNames();
  const needle = String(orderId).trim();
  for (const tabName of new Set(Object.values(tabs))) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(tabName, "!B:B"),
    });
    const rows = res.data.values || [];
    for (let i = 1; i < rows.length; i += 1) {
      if (String(rows[i]?.[0] || "").trim() === needle) return true;
    }
  }
  return false;
}

/**
 * Append 一列記帳；已存在相同 order_id 則 skip
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string, row?: number }>}
 */
export async function appendAccountingRow(payload = {}) {
  if (!isAccountingSheetConfigured()) {
    return { ok: true, skipped: true, reason: "not_configured" };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID.trim();
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) {
    return { ok: false, reason: "missing_order_id" };
  }

  const channel = resolveAccountingChannel(payload);
  const tabName = getTabNameForChannel(channel);
  const sheets = await getSheetsClient();
  await ensureHeaderRow(sheets, spreadsheetId, tabName);

  if (await orderIdExists(sheets, spreadsheetId, orderId)) {
    return { ok: true, skipped: true, reason: "duplicate_order_id" };
  }

  const row = buildAccountingRow(payload, channel);
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange(tabName, "!A:M"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  const updated = appendRes.data.updates?.updatedRows;
  return { ok: true, skipped: false, row: updated, channel, tab: tabName };
}
