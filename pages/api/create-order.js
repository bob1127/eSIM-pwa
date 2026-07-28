// 檔案位置：pages/api/create-order.js
import { createClient } from "@supabase/supabase-js";
import {
  resolveActiveReferralPartner,
  profitFromReferralPartner,
} from "../../lib/resolveReferralPartner";
import { getVerifiedReferralCodeFromRequest } from "../../lib/referralSignature";
import { notifyOrderStatus } from "../../lib/orderNotify";
import {
  computeAuthoritativeStoreOrder,
  PricingError,
} from "../../lib/partnerOrderPricing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MAX_SANE_AMOUNT = 5_000_000;

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

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
      items,
      customer_email,
      customer_name,
      payment_info,
    } = req.body || {};

    if (customer_email && !isValidEmail(customer_email)) {
      return res
        .status(400)
        .json({ success: false, message: "Email 格式錯誤" });
    }

    let finalPartnerId = partner_id || null;
    let finalTotalAmount;
    let finalB2bCost;
    let finalProfit;
    let finalItemDetails = items;

    if (store_id) {
      // ── 專屬商店訂單：金額／底價／分潤一律由伺服器依當下商店設定重算，
      //    完全不信任前端傳來的 total_amount／b2b_cost／partner_profit。──
      const { data: storeRow, error: storeErr } = await supabase
        .from("stores")
        .select("id, status, markup_rate, markup_mode, markup_fixed")
        .eq("id", store_id)
        .maybeSingle();

      if (storeErr || !storeRow) {
        // 舊 DB 尚未有 markup_mode 欄位時降級
        if (
          storeErr &&
          /markup_mode|markup_fixed|schema cache|does not exist/i.test(
            storeErr.message || "",
          )
        ) {
          const { data: legacyStore, error: legacyErr } = await supabase
            .from("stores")
            .select("id, status, markup_rate")
            .eq("id", store_id)
            .maybeSingle();
          if (legacyErr || !legacyStore) {
            return res.status(404).json({ success: false, message: "找不到該商店" });
          }
          if (legacyStore.status !== "active") {
            return res
              .status(403)
              .json({ success: false, message: "此商店目前無法下單" });
          }
          try {
            const priced = await computeAuthoritativeStoreOrder({
              storeId: legacyStore.id,
              storeMarkupRate: legacyStore.markup_rate,
              storeMarkupMode: "percent",
              storeMarkupFixed: 0,
              items,
            });
            finalTotalAmount = priced.total_amount;
            finalB2bCost = priced.b2b_cost;
            finalProfit = priced.partner_profit;
            finalItemDetails = priced.items;
          } catch (pricingErr) {
            if (pricingErr instanceof PricingError) {
              return res
                .status(pricingErr.status || 400)
                .json({ success: false, message: pricingErr.message });
            }
            throw pricingErr;
          }
        } else {
          return res.status(404).json({ success: false, message: "找不到該商店" });
        }
      } else {
      if (storeRow.status !== "active") {
        return res
          .status(403)
          .json({ success: false, message: "此商店目前無法下單" });
      }

      let priced;
      try {
        priced = await computeAuthoritativeStoreOrder({
          storeId: storeRow.id,
          storeMarkupRate: storeRow.markup_rate,
          storeMarkupMode: storeRow.markup_mode || "percent",
          storeMarkupFixed: Number(storeRow.markup_fixed) || 0,
          items,
        });
      } catch (pricingErr) {
        if (pricingErr instanceof PricingError) {
          return res
            .status(pricingErr.status || 400)
            .json({ success: false, message: pricingErr.message });
        }
        throw pricingErr;
      }

      finalTotalAmount = priced.total_amount;
      finalB2bCost = priced.b2b_cost;
      finalProfit = priced.partner_profit;
      finalItemDetails = priced.items;
      }
    } else {
      // ── 非商店（主站／推薦連結）訂單：目前尚未有逐項 SKU 來源可重算，
      //    僅信任伺服器簽章過的推薦 Cookie 做歸因，並對金額做基本邊界檢查。
      const referralCode = getVerifiedReferralCodeFromRequest(req);
      let computedProfit = 0;
      if (!finalPartnerId && referralCode) {
        const refPartner = await resolveActiveReferralPartner(referralCode);
        if (refPartner) {
          finalPartnerId = refPartner.id;
          computedProfit = await profitFromReferralPartner(
            refPartner,
            total_amount,
            b2b_cost,
            { admin: supabase },
          );
        }
      }

      const amountNum = Number(total_amount);
      const costNum = Number(b2b_cost);
      if (
        !Number.isFinite(amountNum) ||
        amountNum < 0 ||
        amountNum > MAX_SANE_AMOUNT
      ) {
        return res
          .status(400)
          .json({ success: false, message: "訂單金額無效" });
      }

      finalTotalAmount = amountNum;
      finalB2bCost = Number.isFinite(costNum) ? Math.max(0, costNum) : 0;
      finalProfit = finalPartnerId
        ? computedProfit
        : Math.max(
            0,
            Math.min(
              Number.isFinite(Number(partner_profit))
                ? Number(partner_profit)
                : 0,
              amountNum,
            ),
          );
    }

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert([
        {
          store_id: store_id || null,
          total_amount: finalTotalAmount,
          b2b_cost: finalB2bCost,
          partner_profit: finalProfit,
          coupon_id: coupon_id || null,
          partner_id: finalPartnerId,
          item_details: finalItemDetails,
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
