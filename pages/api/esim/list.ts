// pages/api/esim/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import crypto from "crypto";

const ACCOUNT = "huangguanlun1";
const SECRET = "470a04580ec9ddg8181gcg2577c5";
const SALT_HEX = "f0aff0d073486c15a9d2c7c5b20d2961";
const BASE_URL = "https://microesim.top";

function signHeaders() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto.pbkdf2Sync(
    SECRET,
    Buffer.from(SALT_HEX, "hex"),
    1024,
    32,
    "sha256"
  ).toString("hex");
  const dataToSign = ACCOUNT + nonce + timestamp;
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey, "utf8"))
    .update(dataToSign)
    .digest("hex");
  return { timestamp, nonce, signature };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. 簽名邏輯
  const { timestamp, nonce, signature } = signHeaders();
  const headers = {
    "Content-Type": "application/json",
    "MICROESIM-ACCOUNT": ACCOUNT,
    "MICROESIM-NONCE": nonce,
    "MICROESIM-TIMESTAMP": timestamp,
    "MICROESIM-SIGN": signature,
  };

  try {
    // 2. 向供應商請求資料
    const response = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
      headers,
      timeout: 20000, // 延長超時時間，因為資料量大
    });

    const allPlans = response.data?.result || [];

    // --- 功能 A: 強制除錯模式 ---
    // 如果網址帶有 ?debug=true，則只回傳該問題方案的完整原始資料
    if (req.query.debug === 'true') {
      // 找尋您截圖中的韓國方案 (ID 5975 或 Code 符合)
      const targetPlan = allPlans.find((p: any) => p.id === 5975 || p.code === 'Japan Korea-Daily1GB-4-5mbps-A0');
      return res.status(200).json({
        debug_message: "這是該方案在 API 中的原始樣貌，請檢查 price 欄位",
        target_plan: targetPlan || "Not Found"
      });
    }

    // --- 功能 B: 資料瘦身 (解決 4MB 限制) ---
    // 只取前端需要的欄位，大幅減少傳輸量
    const slimPlans = allPlans.map((p: any) => ({
      id: p.id,
      code: p.location, // 或 p.code，視供應商欄位而定
      name: p.name || p.channel_dataplan_name,
      price: p.price,   // 關鍵：這是成本價
      day: p.day,
      data: p.flow || p.data, // 視供應商欄位
      rule_desc: p.rule_desc,
      apn: p.apn,
      tags: p.tags, // 若有需要顯示 GPT/TikTok 支援
    }));

    res.status(200).json({ result: slimPlans });

  } catch (err: any) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ error: "Fetch Failed", detail: err.message });
  }
}