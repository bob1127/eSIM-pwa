// 檔案位置：pages/api/create-order.js
import { createClient } from "@supabase/supabase-js";
import {
  resolveActiveReferralPartner,
  profitFromReferralPartner,
} from "../../lib/resolveReferralPartner";
import { notifyOrderStatus } from "../../lib/orderNotify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const {
      store_id,
      total_amount,
      b2b_cost,
      partner_profit,
      coupon_id,
      partner_id,
      referral_code,
      items,
      customer_email,
      customer_name,
      payment_info,
    } = req.body;

    let finalPartnerId = partner_id || null;
    let finalProfit =
      partner_profit != null && partner_profit !== ""
        ? Number(partner_profit)
        : 0;

    // 主站／無賣場：用推薦 Cookie 代碼歸因
    if (!store_id && !finalPartnerId && referral_code) {
      const refPartner = await resolveActiveReferralPartner(referral_code);
      if (refPartner) {
        finalPartnerId = refPartner.id;
        finalProfit = await profitFromReferralPartner(
          refPartner,
          total_amount,
          b2b_cost,
          { admin: supabase },
        );
      }
    }

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert([
        {
          store_id: store_id || null,
          total_amount: total_amount,
          b2b_cost: b2b_cost,
          partner_profit: finalProfit,
          coupon_id: coupon_id || null,
          partner_id: finalPartnerId,
          item_details: items,
          status: "pending",
          customer_email: customer_email
            ? String(customer_email).trim().toLowerCase()
            : null,
          customer_name: customer_name ? String(customer_name).trim() : null,
          payment_info: payment_info || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // 待付款即時通知（Email / LINE / Push；無聯絡方式會 skip）
    if (newOrder?.customer_email) {
      try {
        await notifyOrderStatus(newOrder, "unpaid_created", {
          admin: supabase,
        });
      } catch (notifyErr) {
        console.error(
          "[create-order] unpaid notify failed:",
          notifyErr?.message || notifyErr,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "訂單建立成功",
      orderId: newOrder.id,
    });
  } catch (error) {
    console.error("建立訂單失敗:", error);
    return res
      .status(500)
      .json({ success: false, message: "伺服器發生錯誤，無法建立訂單" });
  }
}
