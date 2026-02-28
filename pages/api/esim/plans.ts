// pages/api/esim/plans.ts
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
  const { timestamp, nonce, signature } = signHeaders();
  const headers = {
    "Content-Type": "application/json",
    "MICROESIM-ACCOUNT": ACCOUNT,
    "MICROESIM-NONCE": nonce,
    "MICROESIM-TIMESTAMP": timestamp,
    "MICROESIM-SIGN": signature,
  };

  try {
    const response = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
      headers,
      timeout: 15000,
    });

    const plans = response.data?.result || [];
    res.status(200).json(plans);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load plans", detail: err.message });
  }
}
