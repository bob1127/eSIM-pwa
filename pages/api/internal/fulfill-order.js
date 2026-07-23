// pages/api/internal/fulfill-order.js
//
// 受保護的內部 API：只給 esim-backend 的 /newebpay/notify 呼叫（付款確認後
// 觸發發貨），用共用密鑰驗證來源（比照 esim-backend 既有的
// PRODUCT_CONTENT_ADMIN_SECRET 保護模式），不對外公開。
//
// 沿用既有 pages/api/fulfillment/send-esim.js 的 microesim 供應商邏輯，
// 但改成直接接收 { orderId, items, email }，不再依賴 Supabase orders 表
// （付款狀態與 QRCode 現在都存在 Medusa order.metadata 裡）。
import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import nodemailer from "nodemailer";
import PLAN_ID_MAP from "../../../lib/esim/planMap";

const ACCOUNT = (process.env.ESIM_ACCOUNT || "test_account_9999").trim();
const SECRET = (process.env.ESIM_SECRET || "7119968f9ff07654ga485487822g").trim();
const SALT_HEX = (process.env.ESIM_SALT || "c38ab89bd01537b3915848d689090e56").trim();
const BASE_URL = (process.env.ESIM_BASE_URL || "https://microesim.cn").trim();

function signHeaders() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto
    .pbkdf2Sync(SECRET, Buffer.from(SALT_HEX, "hex"), 1024, 32, "sha256")
    .toString("hex");
  const dataToSign = ACCOUNT + nonce + timestamp;
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey, "utf8"))
    .update(dataToSign)
    .digest("hex");
  return { timestamp, nonce, signature };
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

async function sendEsimEmail(to, orderNumber, imagesHtml) {
  await transporter.sendMail({
    from: `"eSIM 團隊" <${process.env.GMAIL_USER}>`,
    to,
    subject: `🎉 您的 eSIM 訂單已準備就緒！（訂單 ${orderNumber}）`,
    html: `<div style="font-family: sans-serif;"><h2>您好！</h2><p>您的 eSIM 如下：</p>${imagesHtml}</div>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const secret = req.headers["x-fulfillment-secret"];
  const expected = process.env.FULFILLMENT_INTERNAL_SECRET;
  if (!expected || expected.length < 16) {
    return res.status(503).json({ success: false, message: "FULFILLMENT_INTERNAL_SECRET 未設定" });
  }
  if (!secret || secret !== expected) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const { orderId, items, email } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, message: "缺少訂單 ID" });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: "訂單內沒有商品" });
  }

  try {
    const qrcodes = [];
    const allImagesHtml = [];

    for (const item of items) {
      const rawPlanId = item.sku || item.planId;
      const cleanedSku = String(rawPlanId || "").trim().replace(/\u200B/g, "").replace(/,/g, "-");
      const finalPlanId = PLAN_ID_MAP[cleanedSku] || cleanedSku;
      const quantity = item.quantity || 1;

      if (!finalPlanId) {
        console.warn(`⚠️ 商品 ${item.name} 缺少 planId/sku`);
        continue;
      }

      console.log(`📡 [fulfill-order] 使用帳號 ${ACCOUNT} 向供應商連線: ${BASE_URL}（訂單 ${orderId}）`);

      let active_type = "ACTIVEDBYDEVICE";
      try {
        const listSig = signHeaders();
        const listRes = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
          headers: {
            "Content-Type": "application/json",
            "MICROESIM-ACCOUNT": ACCOUNT,
            "MICROESIM-NONCE": listSig.nonce,
            "MICROESIM-TIMESTAMP": listSig.timestamp,
            "MICROESIM-SIGN": listSig.signature,
          },
          timeout: 10000,
        });
        const found = listRes.data.result?.find((p) => p.channel_dataplan_id === finalPlanId);
        if (found) active_type = found.active_type || "ACTIVEDBYDEVICE";
      } catch (e) {
        console.warn("⚠️ 獲取方案清單失敗，預設 ACTIVEDBYDEVICE");
      }

      const { timestamp, nonce, signature } = signHeaders();
      const form = new FormData();
      form.append("number", quantity.toString());
      form.append("channel_dataplan_id", finalPlanId);

      if (active_type === "ACTIVEDBYORDER") {
        const now = new Date(Date.now() + 5 * 60 * 1000);
        const activationDate = now.toISOString().replace("T", " ").substring(0, 16);
        form.append("activation_date", activationDate);
      }

      const headers = {
        ...form.getHeaders(),
        "MICROESIM-ACCOUNT": ACCOUNT,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      };

      try {
        const subscribeRes = await axios.post(`${BASE_URL}/allesim/v1/esimSubscribe`, form, { headers, timeout: 15000 });
        const result = subscribeRes.data;

        if (result.code === 1 && result.result?.topup_id) {
          const topup_id = result.result.topup_id;
          const detailSig = signHeaders();
          const detailForm = new FormData();
          detailForm.append("topup_id", topup_id);

          const detailRes = await axios.post(`${BASE_URL}/allesim/v1/topupDetail`, detailForm, {
            headers: {
              ...detailForm.getHeaders(),
              "MICROESIM-ACCOUNT": ACCOUNT,
              "MICROESIM-NONCE": detailSig.nonce,
              "MICROESIM-TIMESTAMP": detailSig.timestamp,
              "MICROESIM-SIGN": detailSig.signature,
            },
            timeout: 15000,
          });

          const detail = detailRes.data;
          if (detail.code === 1 && detail.result?.qrcode) {
            const raw = String(detail.result.qrcode);
            const src = raw.startsWith("http") ? raw : `data:image/png;base64,${raw}`;
            qrcodes.push({ name: item.name || "eSIM", src });
            allImagesHtml.push(
              `<div><strong>${item.name || "eSIM"}</strong><br/><img src="${src}" style="max-width:300px;margin-bottom:10px;" /></div>`,
            );
          } else {
            throw new Error(`獲取 QR Code 失敗: ${JSON.stringify(detail)}`);
          }
        } else {
          throw new Error(`供應商拒絕訂單: ${result.msg}`);
        }
      } catch (axiosError) {
        const realMsg = axiosError.response?.data?.msg || axiosError.message;
        throw new Error(`連線失敗: ${JSON.stringify(realMsg)}`);
      }
    }

    if (qrcodes.length === 0) {
      throw new Error("發貨失敗，請檢查餘額或 Plan ID");
    }

    if (email) {
      try {
        await sendEsimEmail(email, orderId, allImagesHtml.join("<hr style='margin:16px 0'/>"));
      } catch (mailErr) {
        console.error("⚠️ [fulfill-order] 寄信失敗:", mailErr?.message || mailErr);
      }
    }

    return res.status(200).json({ success: true, message: "發貨完成", qrcodes });
  } catch (error) {
    console.error("🔥 [fulfill-order] 錯誤:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
