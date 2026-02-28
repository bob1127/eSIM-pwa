// /api/test-invoice.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import qs from "qs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const invoiceData = {
    RespondType: "JSON",
    Version: "1.5",
    TimeStamp: `${Math.floor(Date.now() / 1000)}`,
    MerchantID: "345049107",
    MerchantOrderNo: "ORDER" + Date.now(),
    Status: "1",
    Category: "B2C",
    BuyerName: "測試用戶",
    BuyerEmail: "test@example.com",
    PrintFlag: "Y",
    TaxType: "1",
    TaxRate: 5,
    Amt: 1,
    TaxAmt: 0,
    TotalAmt: 1,
    ItemName: "測試商品",
    ItemCount: "1",
    ItemUnit: "項",
    ItemPrice: "1",
    ItemAmt: "1",
    Comment: "這是測試發票",
    CheckCode: "1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF", // ✅ 可隨意填測試用
  };

  try {
    const result = await axios.post(
      "https://inv.ezpay.com.tw/Api/invoice_issue?MerchantID_=345049107",
      qs.stringify(invoiceData),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
}
