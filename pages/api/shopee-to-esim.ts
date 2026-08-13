import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import nodemailer from "nodemailer";
import PLAN_ID_MAP from "../../lib/esim/planMap";
import { guardEsimCatalog } from "../../lib/esimCatalogGuard";

/**
 * 舊「汪喵通SIM」Shopee 訂單兌換流程。
 * 這支會發 eSIM、改訂單狀態並寄信，因此只接受內部 token 或管理者身分。
 * 所有金鑰改讀環境變數（原本寫死在原始碼，已進 git 歷史，務必到各後台重新簽發）。
 */
const WC_API_URL = String(process.env.SHOPEE_WC_ORDERS_API_URL || "").trim();
const CONSUMER_KEY = String(process.env.SHOPEE_WC_CONSUMER_KEY || "").trim();
const CONSUMER_SECRET = String(
  process.env.SHOPEE_WC_CONSUMER_SECRET || "",
).trim();
const ESIM_PROXY_URL = String(process.env.SHOPEE_ESIM_PROXY_URL || "").trim();
const MAIL_USER = String(process.env.SHOPEE_MAIL_USER || "").trim();
const MAIL_PASSWORD = String(process.env.SHOPEE_MAIL_PASSWORD || "").trim();
const MAIL_FROM_NAME = String(
  process.env.SHOPEE_MAIL_FROM_NAME || "汪喵通SIM",
).trim();

function missingConfig() {
  return [
    ["SHOPEE_WC_ORDERS_API_URL", WC_API_URL],
    ["SHOPEE_WC_CONSUMER_KEY", CONSUMER_KEY],
    ["SHOPEE_WC_CONSUMER_SECRET", CONSUMER_SECRET],
    ["SHOPEE_ESIM_PROXY_URL", ESIM_PROXY_URL],
    ["SHOPEE_MAIL_USER", MAIL_USER],
    ["SHOPEE_MAIL_PASSWORD", MAIL_PASSWORD],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

async function sendEsimEmail(to: string, orderNo: string, html: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"${MAIL_FROM_NAME}" <${MAIL_USER}>`,
    to,
    subject: `訂單 ${orderNo} 的 eSIM QRCode`,
    html,
  };

  await transporter.sendMail(mailOptions);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  if (!(await guardEsimCatalog(req, res))) return;

  const missing = missingConfig();
  if (missing.length) {
    console.error("❌ shopee-to-esim 未設定環境變數:", missing.join(", "));
    return res.status(503).json({ error: "此流程尚未設定" });
  }

  const { shopee_order_no, email } = req.body;
  if (!shopee_order_no) return res.status(400).json({ error: "缺少 shopee_order_no" });

  try {
    const { data: orders } = await axios.get(WC_API_URL, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
      params: { per_page: 50, orderby: "date", order: "desc" },
    });

    const order = orders.find((o: any) =>
      o.meta_data?.some((m: any) =>
        m.key === "shopee_order_no" &&
        typeof m.value === "string" &&
        m.value.trim().toUpperCase() === shopee_order_no.trim().toUpperCase()
      )
    );

    if (!order) return res.status(404).json({ error: "找不到該訂單" });

    const orderId = order.id;

    const { data: fullOrder } = await axios.get(`${WC_API_URL}/${orderId}`, {
      auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET },
    });

    const alreadyRedeemed = fullOrder.meta_data?.some(
      (m: any) => m.key === "esim_qrcode_redeemed" && m.value === "yes"
    );

    if (alreadyRedeemed) {
      return res.status(200).json({
        success: false,
        message: "此訂單已完成兌換，請勿重複提交。",
        alreadyRedeemed: true,
      });
    }

    const customerEmail = email || fullOrder.billing?.email || "";
    if (!customerEmail) return res.status(400).json({ error: "無法取得 email" });

    const lineItems = fullOrder.line_items || [];
    const htmlList: string[] = [];

    for (const item of lineItems) {
      const sku = item.sku || item.name;
      const planId = PLAN_ID_MAP[sku] || sku;
      const quantity = item.quantity || 1;

      const { data: esim } = await axios.post(ESIM_PROXY_URL, {
        channel_dataplan_id: planId,
        number: quantity,
      });

      const imageList: string[] = Array.isArray(esim.qrcode)
        ? esim.qrcode.map(String)
        : [String(esim.qrcode)];

      const qrcodeHtmlList = imageList.map((src, idx) => {
        const imgTag = src.startsWith("http")
          ? `<img src="${src}" style="max-width:300px" />`
          : `<img src="data:image/png;base64,${src}" style="max-width:300px" />`;
        return `<p><strong>${sku} - 第 ${idx + 1} 張</strong></p>${imgTag}`;
      });

      htmlList.push(qrcodeHtmlList.join("<br/>"));

      // 寫入每個 SKU 對應的 QRCode meta
      await axios.put(
        `${WC_API_URL}/${orderId}`,
        {
          meta_data: [
            { key: `esim_plan_id_${sku}`, value: planId },
            { key: `esim_qrcode_${sku}`, value: imageList.join(",") },
          ],
        },
        { auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET } }
      );

      // 寫入訂單備註（顯示 QRCode）
      await axios.post(
        `${WC_API_URL}/${orderId}/notes`,
        {
          note: qrcodeHtmlList.join("<br/>"),
          customer_note: true,
        },
        { auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET } }
      );
    }

    // 發送 Email
    await sendEsimEmail(customerEmail, shopee_order_no, htmlList.join("<hr/>"));

    // ✅ 更新訂單為已完成，並寫入兌換紀錄
    await axios.put(
      `${WC_API_URL}/${orderId}`,
      {
        status: "completed",
        meta_data: [
          { key: "esim_qrcode_redeemed", value: "yes" },
        ],
      },
      { auth: { username: CONSUMER_KEY, password: CONSUMER_SECRET } }
    );

    return res.status(200).json({
      success: true,
      message: "已處理並寄送 QRCode，訂單已完成",
    });
  } catch (err: any) {
    console.error("❌ 發生錯誤：", err?.response?.data || err.message);
    return res.status(500).json({ error: "系統錯誤" });
  }
}
