import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import qs from "qs";

const HASH_KEY = "OVB4Xd2HgieiLJJcj5RMx9W94sMKgHQx";
const HASH_IV = "PKetlaZYZcZvlMmC";

function aesEncrypt(data: Record<string, any>, key: string, iv: string): string {
  const payload = qs.stringify(data); // ✅ 改為 x-www-form-urlencoded 格式
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), Buffer.from(iv));
  cipher.setAutoPadding(true);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return encrypted.toString("hex");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const sampleData = {
    Status: "SUCCESS",
    Message: "授權成功",
    RespondType: "JSON",
    Result: JSON.stringify({
      MerchantID: "MS3788816305",
      Amt: 1,
      TradeNo: "25080810153942902",
      MerchantOrderNo: "ORDER1754619323557",
      RespondType: "JSON",
      IP: "210.208.97.126",
      EscrowBank: "HNCB",
      ItemDesc: "虛擬商品訂單",
      PaymentType: "CREDIT",
      PayTime: "2025-08-08 10:16:01",
      RespondCode: "00",
      Auth: "686553",
      Card6No: "467450",
      Card4No: "8304",
      Exp: "2711",
      TokenUseStatus: 0,
      InstFirst: 0,
      InstEach: 0,
      Inst: 0,
      ECI: "5",
      PaymentMethod: "CREDIT",
      AuthBank: "LINEBank",
    }),
  };

  const encrypted = aesEncrypt(sampleData, HASH_KEY, HASH_IV);
  res.status(200).json({ TradeInfo: encrypted });
}
