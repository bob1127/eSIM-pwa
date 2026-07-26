// pages/api/esim/plans.ts
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
      timeout: 15000,
    });

    const plans = response.data?.result || [];
    res.status(200).json(plans);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load plans", detail: err.message });
  }
}
