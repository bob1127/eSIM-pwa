import type { NextApiRequest, NextApiResponse } from "next";

const PLAN_ID_MAP: Record<string, string> = {
  "KR-3DAY": "2691d925-2faa-4fd4-863c-601d37252549",
  "KR-5DAY": "3f30e801-37b8-4ae4-a7d6-bb99ffbd1af7",
  "KR-10DAY": "005740c7-5388-40f6-b2a3-8c2e36e4aecd",
  "KR-20DAY": "9755f575-6a95-4337-9352-a2d664bf1bbd",
  "KR-30DAY": "adca09ab-55ae-49c6-9f97-a09ee868c067",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const rawPlanId = req.body.channel_dataplan_id || req.body.planId;
  const number = req.body.number || req.body.quantity;
  const channel_dataplan_id = PLAN_ID_MAP[rawPlanId] || rawPlanId;

  if (!channel_dataplan_id || !number) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  res.status(200).json({
    topup_id: `TEST-${Date.now()}`,
    qrcode: "https://via.placeholder.com/300x300.png?text=Fake+eSIM+QRCode",
    note: "此為模擬測試，未連線正式 API，也未建立訂單",
  });
}
