// pages/api/esim/test-list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const BASE_URL = "https://microesim.top"; 
const API_PATH = "/allesim/v1/esimDataplanList"; 
const ACCOUNT = "huangguanlun1";
const SECRET = "470a04580ec9ddg8181gcg2577c5";
const SALT_HEX = "f0aff0d073486c15a9d2c7c5b20d2961";

function pbkdf2ToHex(secret: string, saltHex: string, iterations: number, keyLen: number) {
  const salt = Buffer.from(saltHex, "hex");
  const derivedKey = crypto.pbkdf2Sync(secret, salt, iterations, keyLen, "sha256");
  return derivedKey.toString("hex");
}

function hmacWithHexKey(data: string, hexKey: string) {
  return crypto.createHmac("sha256", Buffer.from(hexKey, "utf-8")).update(data).digest("hex");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now().toString();
  const hexKey = pbkdf2ToHex(SECRET, SALT_HEX, 1024, 32);
  const dataToSign = ACCOUNT + nonce + timestamp;
  const signature = hmacWithHexKey(dataToSign, hexKey);

  try {
    const response = await fetch(`${BASE_URL}${API_PATH}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "MICROESIM-ACCOUNT": ACCOUNT,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      },
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const apiResponse = await response.json();
    const allPlans = apiResponse.result || [];

    // ★★★ 關鍵修正：使用 ...p 透傳所有欄位 ★★★
    // 這樣前端就能收到 operator_list, gateway, routing 等所有隱藏欄位
    const slimPlans = allPlans.map((p: any) => ({
      ...p, // 🔥 這行最重要！把所有原始資料都傳過去
      
      // 保持原有的正規化欄位以防前端報錯
      id: p.channel_dataplan_id || p.id || `temp-${Math.random()}`,
      name: p.channel_dataplan_name || p.name || "未命名方案",
      location: p.location || p.countryCode || "Global",
      price: p.price || 0,
      day: p.day || p.duration || 1,
      data: p.data || p.flow || p.volume || "N/A",
      rule_desc: p.rule_desc || "",
      apn: p.apn || "internet",
    }));

    res.status(200).json({ result: slimPlans });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}