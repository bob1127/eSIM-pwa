import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";
import PLAN_ID_MAP from "../../lib/esim/planMap";
import {
  ESIM_ACCOUNT,
  ESIM_BASE_URL,
  ESIM_TEST_PLAN_ID,
  resolveChannelDataplanId,
  signMicroesimHeaders,
} from "../../lib/esim/microesimClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Only POST allowed" });

  const rawPlanId = req.body?.planId || req.body?.channel_dataplan_id || ESIM_TEST_PLAN_ID;
  const channel_dataplan_id = resolveChannelDataplanId(rawPlanId, PLAN_ID_MAP);
  const quantity = parseInt(req.body?.quantity || req.body?.number || "1", 10);

  if (!channel_dataplan_id || !quantity) {
    return res.status(400).json({ error: "Missing planId or quantity" });
  }

  const { timestamp, nonce, signature } = signMicroesimHeaders();
  const form = new FormData();
  form.append("number", String(quantity));
  form.append("channel_dataplan_id", channel_dataplan_id);

  try {
    const response = await axios.post(`${ESIM_BASE_URL}/allesim/v1/esimSubscribe`, form, {
      headers: {
        ...form.getHeaders(),
        "MICROESIM-ACCOUNT": ESIM_ACCOUNT,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      },
      timeout: 15000,
    });

    const result = response.data;

    if (result?.code === 1 && result?.result?.topup_id) {
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
        timeout: 15000,
      });
      const detail = detailRes.data;
      return res.status(200).json({
        topup_id,
        qrcode: detail?.result?.qrcode || null,
        channel_dataplan_id,
        baseUrl: ESIM_BASE_URL,
        note: "✅ 已成功呼叫測試環境 MicroeSIM API",
        detail,
      });
    }

    return res.status(400).json({
      error: result?.msg || "訂購失敗",
      channel_dataplan_id,
      baseUrl: ESIM_BASE_URL,
      detail: result,
    });
  } catch (error: any) {
    console.error("❌ eSIM 實際訂單錯誤：", error.message);
    console.error("❌ API Response:", error.response?.data);
    res.status(500).json({
      error: "eSIM 訂單建立失敗",
      detail: error.response?.data || error.message,
    });
  }
}
