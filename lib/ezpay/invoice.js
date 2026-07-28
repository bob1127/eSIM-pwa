/**
 * ezPay 電子發票（EZP_INVI_1.2.2）
 * 正式：https://inv.ezpay.com.tw/Api/invoice_issue
 * 測試：https://cinv.ezpay.com.tw/Api/invoice_issue
 */
import crypto from "crypto";
import axios from "axios";

function env(name, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

export function getEzpayConfig() {
  const envMode = env("EZPAY_ENV", "production"); // production | sandbox
  const base =
    env("EZPAY_API_BASE") ||
    (envMode === "sandbox"
      ? "https://cinv.ezpay.com.tw"
      : "https://inv.ezpay.com.tw");

  return {
    merchantId: env("EZPAY_MERCHANT_ID"),
    hashKey: env("EZPAY_HASH_KEY"),
    hashIv: env("EZPAY_HASH_IV"),
    enabled: env("EZPAY_INVOICE_ENABLED", "false") === "true",
    envMode,
    issueUrl: `${base.replace(/\/$/, "")}/Api/invoice_issue`,
  };
}

export function isEzpayConfigured() {
  const c = getEzpayConfig();
  return !!(c.merchantId && c.hashKey && c.hashIv);
}

function padPKCS7(str) {
  const blockSize = 32;
  const pad = blockSize - (Buffer.byteLength(str, "utf8") % blockSize);
  return str + String.fromCharCode(pad).repeat(pad);
}

function encryptPostData(queryStr, hashKey, hashIv) {
  const padded = padPKCS7(queryStr);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(hashKey, "utf8"),
    Buffer.from(hashIv, "utf8"),
  );
  cipher.setAutoPadding(false);
  return cipher.update(padded, "utf8", "hex") + cipher.final("hex");
}

function stringifyParams(obj) {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
}

/** 含稅總額 → 未稅銷售額 + 稅額（確保 Amt + TaxAmt === TotalAmt） */
export function splitTaxIncludedTotal(totalAmt) {
  const TotalAmt = Math.max(0, Math.round(Number(totalAmt) || 0));
  const Amt = Math.round(TotalAmt / 1.05);
  const TaxAmt = TotalAmt - Amt;
  return { Amt, TaxAmt, TotalAmt };
}

function sanitizeItemName(name) {
  return String(name || "商品")
    .replace(/[|&]/g, "/")
    .slice(0, 30);
}

/**
 * 即時開立 B2C 電子發票
 * @returns {{ ok: boolean, status: string, message?: string, invoiceNumber?: string, randomNum?: string, raw?: any }}
 */
export async function issueEzpayInvoice({
  orderNo,
  amount,
  email,
  buyerName,
  buyerUBN,
  items,
  comment,
  loveCode,
  carrierType,
  carrierNum,
}) {
  const cfg = getEzpayConfig();
  if (!cfg.enabled) {
    return { ok: false, status: "DISABLED", message: "EZPAY_INVOICE_ENABLED 未開啟" };
  }
  if (!isEzpayConfigured()) {
    return {
      ok: false,
      status: "NOT_CONFIGURED",
      message: "缺少 EZPAY_MERCHANT_ID / HASH_KEY / HASH_IV",
    };
  }

  const list = Array.isArray(items) && items.length
    ? items
    : [{ name: "eSIM", qty: 1, price: Math.round(Number(amount) || 0) }];

  const normalized = list.map((it) => {
    const qty = Math.max(1, Math.round(Number(it.qty) || 1));
    const price = Math.max(0, Math.round(Number(it.price) || 0));
    return {
      name: sanitizeItemName(it.name),
      qty,
      price,
      amt: qty * price,
    };
  });

  const sumItems = normalized.reduce((s, it) => s + it.amt, 0);
  const { Amt, TaxAmt, TotalAmt } = splitTaxIncludedTotal(
    amount != null ? amount : sumItems,
  );

  // 若品項合計與總額不一致，改為單一品項避免 ezPay 拒單
  let finalItems = normalized;
  if (sumItems !== TotalAmt) {
    finalItems = [
      {
        name: sanitizeItemName(normalized[0]?.name || "eSIM 服務"),
        qty: 1,
        price: TotalAmt,
        amt: TotalAmt,
      },
    ];
  }

  const category = buyerUBN ? "B2B" : "B2C";
  const printFlag =
    category === "B2B" || (!carrierType && !loveCode) ? "Y" : env("EZPAY_PRINT_FLAG", "N") || "N";

  const rawData = {
    RespondType: "JSON",
    Version: "1.5",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    // ezPay 規格：Varchar(20)，限英數字與底線
    MerchantOrderNo: String(orderNo)
      .replace(/[^a-zA-Z0-9_]/g, "")
      .slice(0, 20),
    Status: "1", // 即時開立
    Category: category,
    BuyerName: String(buyerName || buyerUBN || "顧客").slice(0, 60),
    BuyerUBN: buyerUBN ? String(buyerUBN).replace(/\D/g, "").slice(0, 8) : undefined,
    BuyerEmail: email || undefined,
    CarrierType: carrierType || undefined,
    CarrierNum: carrierNum || undefined,
    LoveCode: loveCode || undefined,
    PrintFlag: printFlag,
    TaxType: "1",
    TaxRate: "5",
    Amt: String(Amt),
    TaxAmt: String(TaxAmt),
    TotalAmt: String(TotalAmt),
    ItemName: finalItems.map((i) => i.name).join("|"),
    ItemCount: finalItems.map((i) => i.qty).join("|"),
    ItemUnit: finalItems.map(() => "式").join("|"),
    ItemPrice: finalItems.map((i) => i.price).join("|"),
    ItemAmt: finalItems.map((i) => i.amt).join("|"),
    Comment: String(comment || "Jeko eSIM").slice(0, 70),
  };

  const encrypted = encryptPostData(
    stringifyParams(rawData),
    cfg.hashKey,
    cfg.hashIv,
  );

  const res = await axios.post(
    cfg.issueUrl,
    new URLSearchParams({
      MerchantID_: cfg.merchantId,
      PostData_: encrypted,
    }).toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
      validateStatus: () => true,
    },
  );

  const data = res.data;
  if (data?.Status === "SUCCESS") {
    let result = data.Result;
    if (typeof result === "string") {
      try {
        result = JSON.parse(result);
      } catch {
        /* keep string */
      }
    }
    return {
      ok: true,
      status: "SUCCESS",
      invoiceNumber: result?.InvoiceNumber || result?.InvoiceNum,
      randomNum: result?.RandomNum,
      createTime: result?.CreateTime,
      raw: data,
    };
  }

  return {
    ok: false,
    status: data?.Status || `HTTP_${res.status}`,
    message: data?.Message || "開立發票失敗",
    raw: data,
  };
}
