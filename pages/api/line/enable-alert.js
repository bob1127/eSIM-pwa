import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { verifyLineIdToken } from "../../../lib/lineIdToken";
import { fetchEsimsByLineUserId } from "../../../lib/memberEsims";
import {
  enableLineTrafficAlertForEsim,
  getActiveLineTrafficAlert,
  lookupLinkedEmail,
} from "../../../lib/lineTrafficAlert";

function maskIccid(iccid) {
  const s = String(iccid || "").replace(/\s+/g, "");
  if (s.length < 8) return s || null;
  return `…${s.slice(-6)}`;
}

function serializeEsim(esim) {
  return {
    topupId: esim.topupId || null,
    productName: esim.productName || "eSIM 方案",
    iccidMasked: maskIccid(esim.iccid),
    orderDate: esim.orderDate || null,
  };
}

/**
 * POST { idToken, listOnly?: true, topupId? }
 * 列出 eSIM，或開啟選定的一張（同時只監控一張，省推播）
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const verified = await verifyLineIdToken(req.body?.idToken);
  if (!verified.ok) {
    return res.status(401).json({
      ok: false,
      error: "LINE 身分驗證失敗，請關閉此頁後再從圖文選單「開啟流量提醒」進入",
      code: verified.error,
    });
  }

  try {
    const admin = getSupabaseAdminServer();
    const esims = await fetchEsimsByLineUserId(verified.lineUserId);
    const active = await getActiveLineTrafficAlert(
      admin,
      verified.lineUserId,
    );

    if (req.body?.listOnly) {
      return res.status(200).json({
        ok: true,
        esims: esims.map(serializeEsim),
        activeTopupId: active?.topup_id || null,
        activeLabel: active?.product_label || null,
      });
    }

    if (!esims.length) {
      return res.status(200).json({
        ok: false,
        code: "no_order",
        error: "尚無本站訂單，請輸入 ICCID 或一鍵綁定會員",
        esims: [],
      });
    }

    const requested = String(req.body?.topupId || "");
    const target =
      (requested && esims.find((e) => String(e.topupId) === requested)) ||
      (esims.length === 1 ? esims[0] : null);

    if (!target) {
      return res.status(200).json({
        ok: false,
        code: "need_select",
        error: "請選擇要開啟提醒的 eSIM（同時只監控一張）",
        esims: esims.map(serializeEsim),
        activeTopupId: active?.topup_id || null,
      });
    }

    const guestEmail =
      target.customerEmail ||
      (await lookupLinkedEmail(admin, verified.lineUserId)) ||
      null;
    const result = await enableLineTrafficAlertForEsim(
      admin,
      verified.lineUserId,
      target,
      guestEmail,
    );
    if (!result.ok) {
      return res.status(200).json({
        ok: false,
        code: result.code || "enable_failed",
        error: result.error || "開啟提醒失敗",
        esims: esims.map(serializeEsim),
      });
    }
    return res.status(200).json({
      ok: true,
      productName: target.productName || result.productName,
      topupId: target.topupId,
      esims: esims.map(serializeEsim),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || "設定失敗" });
  }
}
