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
  "訂單時間",
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

function normTabTitle(title) {
  return String(title || "").trim().normalize("NFKC");
}

function findSheetByTitle(allSheets, tabName, tabKey) {
  const want = normTabTitle(tabName);
  let sheet = allSheets.find(
    (s) => normTabTitle(s.properties?.title) === want,
  );
  if (!sheet && tabKey === "main") {
    sheet = allSheets.find((s) =>
      normTabTitle(s.properties?.title).includes("主站"),
    );
  }
  return sheet;
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

function parsePayTime(iso) {
  if (!iso) return new Date();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  return d;
}

function fmtDate(iso) {
  return parsePayTime(iso).toLocaleDateString("sv-SE", {
    timeZone: "Asia/Taipei",
  });
}

function fmtTime(iso) {
  return parsePayTime(iso).toLocaleTimeString("sv-SE", {
    timeZone: "Asia/Taipei",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function isTestOrderId(orderId) {
  const id = String(orderId || "").trim().toLowerCase();
  if (!id) return false;
  return (
    id.startsWith("test-") ||
    id.startsWith("test-jeko-") ||
    id.includes("test-local-notify") ||
    id.includes("test-combined")
  );
}

/** 商品名含「測試購買」→ 不記帳、不通知 Boss */
export function isTestPurchasePayload(payload = {}) {
  for (const it of payload.items || []) {
    const name = String(it.name || it.title || it.product_title || "");
    if (name.includes("測試購買")) return true;
  }
  return false;
}

function shouldRemoveAccountingRow(row = []) {
  const joined = row.join("\t");
  const lower = joined.toLowerCase();
  if (
    /test-jeko|test-combined|test-local-notify|test@example|cursor 自動測試|【測試購買】|tx_mock/i.test(
      joined,
    )
  ) {
    return true;
  }
  if (/\btest-[a-z0-9]/i.test(joined) && !/order_01/i.test(joined)) {
    return true;
  }
  for (const cell of row) {
    if (isTestOrderId(cell)) return true;
  }
  return false;
}

async function clearTabDataRows(sheets, spreadsheetId, tabName, sheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetRange(tabName, "!A:N"),
  });
  const rowCount = res.data.values?.length || 0;
  if (rowCount <= 1 || sheetId == null) return 0;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: 1,
              endIndex: rowCount,
            },
          },
        },
      ],
    },
  });
  await ensureHeaderRow(sheets, spreadsheetId, tabName);
  return rowCount - 1;
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
    fmtTime(payload.payTime),
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
  const range = sheetRange(tabName, "!A1:N1");
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  const row = existing.data.values?.[0] || [];
  const match =
    row.length >= HEADERS.length &&
    HEADERS.every((h, i) => String(row[i] || "") === h);
  if (match) return;
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
      range: sheetRange(tabName, "!C:C"),
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
export async function appendAccountingRow(payload = {}, opts = {}) {
  if (!isAccountingSheetConfigured()) {
    return { ok: true, skipped: true, reason: "not_configured" };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID.trim();
  const orderId = String(payload.orderId || "").trim();
  if (!orderId) {
    return { ok: false, reason: "missing_order_id" };
  }

  if (isTestPurchasePayload(payload)) {
    return { ok: true, skipped: true, reason: "test_purchase" };
  }

  const channel = resolveAccountingChannel(payload);
  const tabName = getTabNameForChannel(channel);
  const sheets = await getSheetsClient();
  await ensureHeaderRow(sheets, spreadsheetId, tabName);

  if (!opts.force && (await orderIdExists(sheets, spreadsheetId, orderId))) {
    return { ok: true, skipped: true, reason: "duplicate_order_id" };
  }

  const row = buildAccountingRow(payload, channel);
  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange(tabName, "!A:N"),
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  const updated = appendRes.data.updates?.updatedRows;
  return { ok: true, skipped: false, row: updated, channel, tab: tabName };
}

const DASHBOARD_TAB = "總覽";

function qTab(tabName) {
  return `'${String(tabName).replace(/'/g, "''")}'`;
}

/** 建立／更新 KPI 總覽分頁（公式自動加總三張流水帳） */
export async function setupAccountingDashboard() {
  if (!isAccountingSheetConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID.trim();
  const tabs = getTabNames();
  const sheets = await getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets || [];
  let dashSheet = existing.find(
    (s) => s.properties?.title === DASHBOARD_TAB,
  );

  if (!dashSheet) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: DASHBOARD_TAB,
                index: 0,
              },
            },
          },
        ],
      },
    });
    dashSheet = addRes.data.replies?.[0]?.addSheet?.properties;
  }

  const m = qTab(tabs.main);
  const s = qTab(tabs.store);
  const r = qTab(tabs.referral);

  const metric = (fnMain, fnStore, fnRef) => [
    fnMain,
    fnStore,
    fnRef,
    `=${fnMain.slice(1)}+${fnStore.slice(1)}+${fnRef.slice(1)}`,
  ];

  const countF = (t) => `=COUNTA(${t}!C2:C)`;
  const sumF = (t, col) => `=SUM(${t}!${col}2:${col})`;
  const sumIfMonthF = (t, col) =>
    `=SUMIFS(${t}!${col}2:${col},${t}!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),${t}!A2:A,"<="&EOMONTH(TODAY(),0))`;

  const rows = [
    ["JEKO eSIM 記帳總覽", "", "", "", ""],
    ["自動加總三張流水帳 · 成本／毛利為系統估算", "", "", "", ""],
    ["", "", "", "", ""],
    ["指標", tabs.main, tabs.store, tabs.referral, "合計"],
    ["訂單筆數", ...metric(countF(m), countF(s), countF(r))],
    ["銷售額", ...metric(sumF(m, "F"), sumF(s, "F"), sumF(r, "F"))],
    ["成本(估)", ...metric(sumF(m, "I"), sumF(s, "I"), sumF(r, "I"))],
    ["毛利(估)", ...metric(sumF(m, "J"), sumF(s, "J"), sumF(r, "J"))],
    ["手續費(估)", ...metric(sumF(m, "G"), sumF(s, "G"), sumF(r, "G"))],
    ["淨利(估)", "=B8-B9", "=C8-C9", "=D8-D9", "=E8-E9"],
    ["毛利率", '=IF(B6=0,"",B8/B6)', '=IF(C6=0,"",C8/C6)', '=IF(D6=0,"",D8/D6)', '=IF(E6=0,"",E8/E6)'],
    ["", "", "", "", ""],
    ["── 本月 ──", "", "", "", ""],
    ["本月銷售額", ...metric(sumIfMonthF(m, "F"), sumIfMonthF(s, "F"), sumIfMonthF(r, "F"))],
    ["本月毛利(估)", ...metric(sumIfMonthF(m, "J"), sumIfMonthF(s, "J"), sumIfMonthF(r, "J"))],
    [
      "本月訂單筆數",
      ...metric(
        `=COUNTIFS(${m}!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),${m}!A2:A,"<="&EOMONTH(TODAY(),0),${m}!C2:C,"<>")`,
        `=COUNTIFS(${s}!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),${s}!A2:A,"<="&EOMONTH(TODAY(),0),${s}!C2:C,"<>")`,
        `=COUNTIFS(${r}!A2:A,">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1),${r}!A2:A,"<="&EOMONTH(TODAY(),0),${r}!C2:C,"<>")`,
      ),
    ],
    ["", "", "", "", ""],
    ["說明", "", "", "", ""],
    ["銷售額", "客人實付（含折扣後）", "", "", ""],
    ["成本(估)", "變體 cost_price × 數量", "", "", ""],
    ["毛利(估)", "銷售額 − 成本", "", "", ""],
    ["手續費(估)", "銷售額 × 2.8%（藍新/LINE Pay 概估）", "", "", ""],
    ["淨利(估)", "毛利 − 手續費（未扣退款／夥伴分潤）", "", "", ""],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${qTab(DASHBOARD_TAB)}!A1:E25`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });

  // 欄寬（可選）
  const sheetId = dashSheet?.sheetId ?? existing.find(
    (x) => x.properties?.title === DASHBOARD_TAB,
  )?.properties?.sheetId;

  if (sheetId != null) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateDimensionProperties: {
              range: {
                sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 5,
              },
              properties: { pixelSize: 140 },
              fields: "pixelSize",
            },
          },
        ],
      },
    });
  }

  return { ok: true, tab: DASHBOARD_TAB };
}

/** 刪除 test-* 假訂單列，並更新表頭 */
export async function purgeTestAccountingRows() {
  if (!isAccountingSheetConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID.trim();
  const tabs = getTabNames();
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetByTitle = new Map(
    (meta.data.sheets || []).map((s) => [s.properties?.title, s.properties]),
  );

  const removed = [];
  const tabList = new Set([
    ...Object.values(tabs),
    process.env.GOOGLE_SHEETS_TAB?.trim(),
    "收入",
  ].filter(Boolean));

  for (const tabName of tabList) {
    if (!sheetByTitle.has(tabName)) continue;
    await ensureHeaderRow(sheets, spreadsheetId, tabName);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(tabName, "!A:N"),
    });
    const rows = res.data.values || [];
    const toDelete = [];

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      if (shouldRemoveAccountingRow(row)) {
        const orderHint =
          row.find((c) => String(c).startsWith("order_")) ||
          row.find((c) => isTestOrderId(c)) ||
          row[1] ||
          row[2] ||
          `row-${i + 1}`;
        toDelete.push(i + 1);
        removed.push({ tab: tabName, orderId: String(orderHint), row: i + 1 });
      }
    }

    const sheetId = sheetByTitle.get(tabName)?.sheetId;
    if (sheetId == null || !toDelete.length) continue;

    const requests = toDelete
      .sort((a, b) => b - a)
      .map((rowNum) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNum - 1,
            endIndex: rowNum,
          },
        },
      }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  // 舊列（無「訂單時間」欄）補上新表頭格式
  for (const tabName of tabList) {
    if (!sheetByTitle.has(tabName)) continue;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: sheetRange(tabName, "!A:N"),
    });
    const rows = res.data.values || [];
    if (rows.length <= 1) continue;

    let changed = false;
    const next = [HEADERS];
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i] || [];
      const colB = String(row[1] || "").trim();
      const colC = String(row[2] || "").trim();
      if (colC.startsWith("order_")) {
        next.push(row.slice(0, HEADERS.length));
        continue;
      }
      if (colB.startsWith("order_")) {
        changed = true;
        next.push([
          row[0] || "",
          "",
          row[1] || "",
          row[2] || "",
          row[3] || "",
          row[4] || "",
          row[5] || "",
          row[6] || "",
          row[7] || "",
          row[8] || "",
          row[9] || "",
          row[10] || "",
          row[11] || "",
          row[12] || "",
        ]);
        continue;
      }
      next.push(row.slice(0, HEADERS.length));
    }

    if (changed) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: sheetRange(tabName, "!A1:N"),
        valueInputOption: "USER_ENTERED",
        requestBody: { values: next },
      });
    } else {
      await ensureHeaderRow(sheets, spreadsheetId, tabName);
    }
  }

  await setupAccountingDashboard();
  return { ok: true, removedCount: removed.length, removed };
}

/** 清空指定分頁資料列（保留表頭），供重建記帳 */
export async function clearAccountingTabData(tabKey = "main") {
  if (!isAccountingSheetConfigured()) {
    return { ok: false, reason: "not_configured" };
  }
  const tabs = getTabNames();
  const tabName =
    tabKey === "store"
      ? tabs.store
      : tabKey === "referral"
        ? tabs.referral
        : tabs.main;
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID.trim();
  const sheets = await getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = meta.data.sheets || [];
  const sheet = findSheetByTitle(allSheets, tabName, tabKey);
  const resolvedTab = sheet?.properties?.title;
  if (sheet?.properties?.sheetId == null || !resolvedTab) {
    return {
      ok: false,
      reason: "tab_not_found",
      tab: tabName,
      available: allSheets.map((s) => s.properties?.title).filter(Boolean),
    };
  }
  const cleared = await clearTabDataRows(
    sheets,
    spreadsheetId,
    resolvedTab,
    sheet.properties.sheetId,
  );
  return { ok: true, tab: resolvedTab, cleared };
}
