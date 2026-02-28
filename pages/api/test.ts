// pages/api/invoice-test.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import qs from "qs";
import axios from "axios";

const INVOICE_API_URL = "https://inv.ezpay.com.tw/Api/invoice_issue";
const INVOICE_MERCHANT_ID = "345049107";
const INVOICE_HASH_KEY = "FnDByoo3m9U4nVi29UciIbAHVQRQogHG";
const INVOICE_HASH_IV = "PtgsjF33nlm8q2kC";

function encryptAES(data: any, key: string, iv: string) {
  const text = qs.stringify(data);
  const cipher = crypto.createCipheriv("aes-256-cbc", key.padEnd(32, " "), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
const timestamp = Math.floor(Date.now() / 1000).toString(); // ✅ 改為秒數

  const invoiceData = {
RespondType: "JSON",
  Version: "1.4",
  TimeStamp: timestamp, // ✅ 正確格式
  MerchantOrderNo: `INV${timestamp}`,
    Status: "1",
    Category: "B2C",
    BuyerEmail: "test@example.com",
    BuyerName: "測試用戶", // ✅ 必填
  PrintFlag: "Y",         // ✅ 要印發票
CarrierType: "",        // 可省略
CarrierNum: "",         // 可省略
    TaxType: "1",
    TaxRate: "5",
    Amt: "100",
    TaxAmt: "5",
    TotalAmt: "105",
    ItemName: "測試商品",
    ItemCount: "1",
    ItemUnit: "組",
    ItemPrice: "100",
    ItemAmt: "100",
    Comment: "測試用發票",
  };

  try {
    const encrypted = encryptAES(invoiceData, INVOICE_HASH_KEY, INVOICE_HASH_IV);

    const response = await axios.post(
      INVOICE_API_URL,
      qs.stringify({
        MerchantID_: INVOICE_MERCHANT_ID,
        PostData_: encrypted,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.status(200).json({
      success: true,
      invoiceResponse: response.data,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message,
      error: err?.response?.data || "未知錯誤",
    });
  }
}
