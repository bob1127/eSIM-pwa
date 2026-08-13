// pages/api/esim/test-list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import {
  ESIM_BASE_URL,
  microesimAuthHeaders,
} from "../../../lib/esim/microesimClient";
import { guardEsimCatalog } from "../../../lib/esimCatalogGuard";

const API_PATH = "/allesim/v1/esimDataplanList";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await guardEsimCatalog(req, res))) return;

  try {
    const response = await fetch(`${ESIM_BASE_URL}${API_PATH}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...microesimAuthHeaders(),
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

    res.status(200).json({ result: slimPlans, baseUrl: ESIM_BASE_URL });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
