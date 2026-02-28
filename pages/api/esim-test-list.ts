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
  const hexKey = crypto.pbkdf2Sync(Buffer.from(SECRET), Buffer.from(SALT_HEX, "hex"), 1024, 32, "sha256").toString("hex");
  const signature = crypto.createHmac("sha256", Buffer.from(hexKey)).update(ACCOUNT + nonce + timestamp).digest("hex");
  return { timestamp, nonce, signature };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { timestamp, nonce, signature } = signHeaders();

  try {
    const response = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
      headers: {
        "Content-Type": "application/json",
        "MICROESIM-ACCOUNT": ACCOUNT,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      },
    });

    const simplified = response.data?.result?.map((plan: any) => ({
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
