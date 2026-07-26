import { supabase } from "../../../lib/supabaseClient";
import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
import PLAN_ID_MAP from "../../../lib/esim/planMap";
import { sendMail } from "../../../lib/mailTransporter";

// 修改後的讀取方式 (加上 .trim() 防呆)
const ACCOUNT = (process.env.ESIM_ACCOUNT || "test_account_9999").trim();
const SECRET = (process.env.ESIM_SECRET || "7119968f9ff07654ga485487822g").trim();
const SALT_HEX = (process.env.ESIM_SALT || "c38ab89bd01537b3915848d689090e56").trim();
const BASE_URL = (process.env.ESIM_BASE_URL || "https://microesim.cn").trim();

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
  const signature = crypto.createHmac("sha256", Buffer.from(hexKey, "utf8")).update(dataToSign).digest("hex");
  return { timestamp, nonce, signature };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ success: false, message: "缺少訂單 ID" });

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) throw new Error("找不到該筆訂單");
    if (!order.items || order.items.length === 0) throw new Error("訂單內沒有商品");

    const customerEmail = order.customer_email;
    const purchasedItems = order.items;
    let fulfilledCodes = []; 

    for (const item of purchasedItems) {
      const rawPlanId = item.planId || item.sku;
      const cleanedSku = rawPlanId?.trim().replace(/\u200B/g, "").replace(/,/g, "-");
      const finalPlanId = PLAN_ID_MAP[cleanedSku] || cleanedSku;

      const quantity = item.quantity || 1;

      if (!finalPlanId) {
        console.warn(`⚠️ 商品 ${item.name} 缺少 planId`);
        continue;
      }

      console.log(`📡 使用帳號 ${ACCOUNT} 向供應商連線: ${BASE_URL}`);

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
             fulfilledCodes.push({
               productName: item.name,
               qrcodeUrl: detail.result.qrcode,
               topupId: topup_id
             });
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

    if (fulfilledCodes.length === 0) throw new Error("發貨失敗，請檢查餘額或 Plan ID");

    // 更新 Supabase
    await supabase.from("orders").update({ status: "completed", qrcode_data: fulfilledCodes }).eq("id", orderId);

    // 寄信
    const qrCodeHtml = fulfilledCodes.map(code => `
      <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
         <h3 style="margin-top: 0;">${code.productName}</h3>
         <img src="${code.qrcodeUrl}" alt="eSIM QR Code" style="max-width: 250px;"/>
      </div>
    `).join("");

    await sendMail({
      to: customerEmail,
      fromName: "Jeko eSIM 自動發貨",
      subject: `🎉 您的 eSIM 訂單已準備就緒！`,
      html: `<div style="font-family: sans-serif;"><h2>您好！</h2><p>您的 eSIM 如下：</p>${qrCodeHtml}</div>`,
      text: "您的 eSIM 訂單已準備就緒，請至信箱 HTML 版本查看 QR Code。",
    });

    return res.status(200).json({ success: true, message: "發貨完成", codes: fulfilledCodes });

  } catch (error) {
    console.error("🔥 錯誤:", error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}