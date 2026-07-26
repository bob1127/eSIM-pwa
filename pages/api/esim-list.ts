import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import {
  ESIM_BASE_URL,
  microesimAuthHeaders,
} from "../../lib/esim/microesimClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await axios.get(`${ESIM_BASE_URL}/allesim/v1/esimDataplanList`, {
      headers: {
        "Content-Type": "application/json",
        ...microesimAuthHeaders(),
      },
    });
    res.status(200).json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: "List Fetch Failed", detail: error.message });
  }
}
