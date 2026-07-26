// pages/api/esim/list.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import {
  ESIM_BASE_URL,
  microesimAuthHeaders,
} from "../../../lib/esim/microesimClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const headers = {
    "Content-Type": "application/json",
    ...microesimAuthHeaders(),
  };

  try {
    const response = await axios.get(`${ESIM_BASE_URL}/allesim/v1/esimDataplanList`, {
      headers,
      timeout: 20000,
    });

    const allPlans = response.data?.result || [];

    if (req.query.debug === "true") {
      const targetPlan = allPlans.find(
        (p: any) => p.id === 5975 || p.code === "Japan Korea-Daily1GB-4-5mbps-A0",
      );
      return res.status(200).json({
        debug_message: "這是該方案在 API 中的原始樣貌，請檢查 price 欄位",
        baseUrl: ESIM_BASE_URL,
        target_plan: targetPlan || "Not Found",
      });
    }

    const slimPlans = allPlans.map((p: any) => ({
      id: p.id,
      code: p.location,
      name: p.name || p.channel_dataplan_name,
      channel_dataplan_id: p.channel_dataplan_id,
      price: p.price,
      day: p.day,
      data: p.flow || p.data,
      rule_desc: p.rule_desc,
      apn: p.apn,
      tags: p.tags,
    }));

    res.status(200).json({ result: slimPlans, baseUrl: ESIM_BASE_URL });
  } catch (err: any) {
    console.error("Fetch Error:", err.message);
    res.status(500).json({ error: "Fetch Failed", detail: err.message });
  }
}
