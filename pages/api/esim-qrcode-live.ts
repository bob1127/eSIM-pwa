import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import crypto from "crypto";

const ACCOUNT = process.env.ESIM_ACCOUNT!;
const SECRET = process.env.ESIM_SECRET!;
const SALT_HEX = process.env.ESIM_SALT!;
const BASE_URL = process.env.ESIM_BASE_URL!;

function signHeaders() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto
    .pbkdf2Sync(Buffer.from(SECRET), Buffer.from(SALT_HEX, "hex"), 1024, 32, "sha256")
    .toString("hex");
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey))
    .update(ACCOUNT + nonce + timestamp)
    .digest("hex");
  return { timestamp, nonce, signature };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  console.log("👉 Incoming Body:", req.body);

  const planId = req.body?.planId || "20230813A45282eeE1CCee85998876195";
  const quantity = parseInt(req.body?.quantity || "1");

  if (!planId || !quantity) {
    return res.status(400).json({ error: "Missing planId or quantity" });
  }

  const { timestamp, nonce, signature } = signHeaders();

  try {
    const response = await axios.post(
      `${BASE_URL}/allesim/v1/esimSubscribe`,
      {
        channel_dataplan_id: planId,
        number: quantity,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "MICROESIM-ACCOUNT": ACCOUNT,
          "MICROESIM-NONCE": nonce,
          "MICROESIM-TIMESTAMP": timestamp,
          "MICROESIM-SIGN": signature,
        },
        timeout: 15000,
      }
    );

    const result = response.data;

    if (!result?.result?.qrcode) {
      return res.status(500).json({ error: "eSIM API 回傳缺少 QRCode", detail: result });
    }

    res.status(200).json({
      topup_id: result.result.topup_id,
      qrcode: result.result.qrcode,
      note: "✅ 已成功呼叫微程式 API 並產生 QRCode",
    });
  } catch (error: any) {
   console.error("❌ eSIM 實際訂單錯誤：", error.message);
  console.error("❌ API Response:", error.response?.data);
  res.status(500).json({
    error: "eSIM 訂單建立失敗",
    detail: error.response?.data || error.message,
  });
  }
}
