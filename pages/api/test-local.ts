import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import axios from "axios";
import qs from "qs";

const INVOICE_API_URL = "https://inv.ezpay.com.tw/Api/invoice_issue";
const INVOICE_MERCHANT_ID = "345049107";
const INVOICE_HASH_KEY = "FnDByoo3m9U4nVi29UciIbAHVQRQogHG";
const INVOICE_HASH_IV = "PtgsjF33nlm8q2kC";

function genCheckCode(params: Record<string, string>): string {
  const raw = `HashKey=${INVOICE_HASH_KEY}&Amt=${params.Amt}&MerchantID=${params.MerchantID}&MerchantOrderNo=${params.MerchantOrderNo}&TimeStamp=${params.TimeStamp}&HashIV=${INVOICE_HASH_IV}`;
  return crypto.createHash("sha256").update(raw).digest("hex").toUpperCase();
}

function encryptPostData(data: Record<string, any>): string {
  const payload = qs.stringify(data);
  const cipher = crypto.createCipheriv("aes-256-cbc", INVOICE_HASH_KEY, INVOICE_HASH_IV);
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const merchantOrderNo = `TEST${Date.now()}`;

  const invoiceData: Record<string, any> = {
    RespondType: "JSON",
    Version: "1.5",
    TimeStamp: timeStamp,
    MerchantID: INVOICE_MERCHANT_ID,
    MerchantOrderNo: merchantOrderNo,
    Status: "1",
    Category: "B2C",
    BuyerName: "測試顧客",
    BuyerEmail: "test@example.com",
    PrintFlag: "Y",
    CarrierType: "",
    CarrierNum: "",
    Donation: "0",
    LoveCode: "",
    TaxType: "1",
    TaxRate: 5,
    Amt: 1, // 實收金額（折扣後）
    TaxAmt: 0,
    TotalAmt: 1,
    ItemName: ["馬來西亞 eSIM - 1天 500MB/日", "折價 SAVE"].join("|"),
    ItemCount: ["2", "1"].join("|"),
    ItemUnit: ["項", "次"].join("|"),
    ItemPrice: ["1", "-1"].join("|"),
    ItemAmt: ["2", "-1"].join("|"),
    Comment: "測試多商品含折價券",
  };

  invoiceData.CheckCode = genCheckCode({
    MerchantID: invoiceData.MerchantID,
    MerchantOrderNo: invoiceData.MerchantOrderNo,
    Amt: String(invoiceData.Amt),
    TimeStamp: invoiceData.TimeStamp,
  });

  try {
    const encryptedPostData = encryptPostData(invoiceData);
    const response = await axios.post(INVOICE_API_URL, qs.stringify({
      MerchantID_: INVOICE_MERCHANT_ID,
      PostData_: encryptedPostData,
    }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("🔍 發票 API 回應：", response.data); // ✅ 加上 debug log
    res.status(200).json({ message: "測試成功", response: response.data });
  } catch (err: any) {
    console.error("❌ 測試發票開立失敗：", err.response?.data || err.message);
    res.status(500).json({ error: "發票開立測試失敗", detail: err.response?.data || err.message });
  }
}
