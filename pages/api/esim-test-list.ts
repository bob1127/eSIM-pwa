import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import {
  ESIM_BASE_URL,
  microesimAuthHeaders,
} from "../../lib/esim/microesimClient";
import { guardEsimCatalog } from "../../lib/esimCatalogGuard";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await guardEsimCatalog(req, res))) return;

  try {
    const response = await axios.get(`${ESIM_BASE_URL}/allesim/v1/esimDataplanList`, {
      headers: {
        "Content-Type": "application/json",
        ...microesimAuthHeaders(),
      },
    });

    const simplified =
      response.data?.result?.map((plan: any) => ({
        id: plan.channel_dataplan_id,
        name: plan.channel_dataplan_name,
        days: plan.day,
        data: plan.data,
        apn: plan.apn,
        price: plan.price,
        currency: plan.currency,
      })) || [];

    res.status(200).json(simplified);
  } catch (error: any) {
    res.status(500).json({ error: "Simplified Fetch Failed", detail: error.message });
  }
}
