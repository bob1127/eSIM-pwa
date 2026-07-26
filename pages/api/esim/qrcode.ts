// pages/api/esim/qrcode.ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";
import PLAN_ID_MAP from "../../../lib/esim/planMap";
import {
  ESIM_ACCOUNT,
  ESIM_BASE_URL,
  resolveChannelDataplanId,
  signMicroesimHeaders,
  shouldForceTestPlan,
} from "../../../lib/esim/microesimClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const rawPlanId = req.body.channel_dataplan_id || req.body.planId;
  const number = req.body.number || req.body.quantity;
  const channel_dataplan_id = resolveChannelDataplanId(rawPlanId, PLAN_ID_MAP);

  if (!channel_dataplan_id || !number) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (shouldForceTestPlan()) {
    console.log(`🧪 [esim/qrcode] 強制測試方案: ${channel_dataplan_id}`);
  }

  let active_type = "ACTIVEDBYDEVICE";
  try {
    const listSig = signMicroesimHeaders();
    const listRes = await axios.get(`${ESIM_BASE_URL}/allesim/v1/esimDataplanList`, {
      headers: {
        "Content-Type": "application/json",
        "MICROESIM-ACCOUNT": ESIM_ACCOUNT,
        "MICROESIM-NONCE": listSig.nonce,
        "MICROESIM-TIMESTAMP": listSig.timestamp,
        "MICROESIM-SIGN": listSig.signature,
      },
      timeout: 15000,
    });

    const found = listRes.data.result?.find(
      (item: any) => item.channel_dataplan_id === channel_dataplan_id,
    );
    active_type = found?.active_type || "ACTIVEDBYDEVICE";
  } catch (e) {
    console.warn("⚠️ 無法取得方案清單，預設為 ACTIVEDBYDEVICE");
  }

  const { timestamp, nonce, signature } = signMicroesimHeaders();

  const form = new FormData();
  form.append("number", number);
  form.append("channel_dataplan_id", channel_dataplan_id);

  if (active_type === "ACTIVEDBYORDER") {
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const activationDate = now.toISOString().replace("T", " ").substring(0, 16);
    form.append("activation_date", activationDate);
  }

  const headers = {
    ...form.getHeaders(),
    "MICROESIM-ACCOUNT": ESIM_ACCOUNT,
    "MICROESIM-NONCE": nonce,
    "MICROESIM-TIMESTAMP": timestamp,
    "MICROESIM-SIGN": signature,
  };

  try {
    const subscribeRes = await axios.post(`${ESIM_BASE_URL}/allesim/v1/esimSubscribe`, form, {
      headers,
      timeout: 10000,
    });

    const result = subscribeRes.data;
    if (result.code === 1 && result.result?.topup_id) {
      const topup_id = result.result.topup_id;
      const detailSig = signMicroesimHeaders();

      const detailForm = new FormData();
      detailForm.append("topup_id", topup_id);

      const detailRes = await axios.post(`${ESIM_BASE_URL}/allesim/v1/topupDetail`, detailForm, {
        headers: {
          ...detailForm.getHeaders(),
          "MICROESIM-ACCOUNT": ESIM_ACCOUNT,
          "MICROESIM-NONCE": detailSig.nonce,
          "MICROESIM-TIMESTAMP": detailSig.timestamp,
          "MICROESIM-SIGN": detailSig.signature,
        },
        timeout: 10000,
      });

      const detail = detailRes.data;
      if (detail.code === 1 && detail.result?.qrcode) {
        return res.status(200).json({ topup_id, qrcode: detail.result.qrcode });
      }
      return res.status(200).json({ topup_id, warning: "訂單成功但無 QRCode", detail });
    }
    return res.status(400).json({ error: result.msg, raw: result });
  } catch (err: any) {
    console.error("❌ 訂單建立錯誤:", err.message);
    return res.status(500).json({ error: "訂單建立失敗", detail: err.message });
  }
}
