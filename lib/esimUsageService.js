import axios from "axios";
import FormData from "form-data";
import { createClient } from "@supabase/supabase-js";
import { formatMb } from "./esimUsageFormat";
import { getPublicSiteUrl } from "./siteUrl";
import {
  ESIM_ACCOUNT as ACCOUNT,
  ESIM_SECRET as SECRET,
  ESIM_SALT as SALT_HEX,
  ESIM_BASE_URL as BASE_URL,
  signMicroesimHeaders,
} from "./esim/microesimClient";
import { enrichUsagePlanRules } from "./trafficPlanCatalog";

export { formatMb } from "./esimUsageFormat";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function signHeaders() {
  return signMicroesimHeaders();
}

export function normalizeUsageIccid(v) {
  return String(v || "").replace(/\s+/g, "").trim();
}

async function fetchTopupDetail(topupId) {
  if (!ACCOUNT || !SECRET || !SALT_HEX) {
    return { ok: false, error: "eSIM 供應商 API 未設定" };
  }
  const detailSig = signHeaders();
  const detailForm = new FormData();
  detailForm.append("topup_id", topupId);
  const detailRes = await axios.post(
    `${BASE_URL}/allesim/v1/topupDetail`,
    detailForm,
    {
      headers: {
        ...detailForm.getHeaders(),
        "MICROESIM-ACCOUNT": ACCOUNT,
        "MICROESIM-NONCE": detailSig.nonce,
        "MICROESIM-TIMESTAMP": detailSig.timestamp,
        "MICROESIM-SIGN": detailSig.signature,
      },
      timeout: 15000,
    },
  );
  return { ok: true, data: detailRes.data };
}

async function resolveTopupId({ iccid, topupId, endpoint }) {
  let resolvedIccid = normalizeUsageIccid(iccid);
  let resolvedTopupId = topupId || null;

  if (endpoint && !resolvedTopupId && !resolvedIccid) {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) return { iccid: resolvedIccid, topupId: resolvedTopupId };
    const { data: sub } = await supabaseAdmin
      .from("push_subscriptions")
      .select("iccid, topup_id")
      .eq("endpoint", endpoint)
      .maybeSingle();
    if (sub) {
      resolvedTopupId = sub.topup_id || resolvedTopupId;
      resolvedIccid = resolvedIccid || sub.iccid;
    }
  }

  if (!resolvedTopupId && resolvedIccid) {
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
    const { data: sub } = await supabaseAdmin
      .from("push_subscriptions")
      .select("topup_id")
      .eq("iccid", resolvedIccid)
      .order("iccid_bound_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub?.topup_id) resolvedTopupId = sub.topup_id;
    }
  }

  return { iccid: resolvedIccid, topupId: resolvedTopupId };
}

/**
 * 查詢 eSIM 用量（網站 / LINE Bot 共用）
 * @returns {{ ok: boolean, status?: number, data?: object, error?: string }}
 */
export async function queryEsimUsage({ iccid, topupId, endpoint } = {}) {
  const resolved = await resolveTopupId({ iccid, topupId, endpoint });

  if (!resolved.topupId && !resolved.iccid) {
    return { ok: false, status: 400, error: "請提供 ICCID 或 topup_id" };
  }

  if (resolved.topupId) {
    try {
      const result = await fetchTopupDetail(resolved.topupId);
      if (!result.ok) {
        return { ok: false, status: 503, error: result.error };
      }
      const detail = result.data;
      if (detail.code !== 1) {
        return {
          ok: false,
          status: 400,
          error: detail.msg || "查詢失敗",
        };
      }
      const r = detail.result || {};
      const remainingMb = r.remaining_mb ?? r.remain_mb ?? r.data_balance ?? null;
      const totalMb = r.total_mb ?? r.data_total ?? null;
      const usedFromApi = r.used_mb ?? r.data_used ?? null;
      const usedMb =
        usedFromApi != null
          ? usedFromApi
          : remainingMb != null && totalMb != null
            ? Math.max(0, Number(totalMb) - Number(remainingMb))
            : null;
      const raw = {
        success: true,
        source: "topup_id",
        topupId: resolved.topupId,
        iccid: resolved.iccid || r.iccid || r.ICCID || null,
        productName: r.product_name || r.plan_name || null,
        planId: r.plan_id || r.planId || null,
        sku: r.sku || r.product_code || null,
        status: r.status || r.state || null,
        remainingMb,
        totalMb,
        usedMb,
        expiresAt: r.expire_time || r.expired_at || null,
        ruleDesc: r.rule_desc || r.Rule_desc || null,
        specialDesc: r.special_desc || r.speed_desc || null,
        speedDesc: r.speed_desc || null,
        note: "數據依供應商更新，可能有 30 分鐘以上延遲",
      };
      return {
        ok: true,
        status: 200,
        data: enrichUsagePlanRules(raw),
      };
    } catch (e) {
      return {
        ok: false,
        status: 500,
        error: e.response?.data?.msg || e.message || "連線供應商失敗",
      };
    }
  }

  return {
    ok: true,
    status: 200,
    data: {
      success: true,
      source: "iccid_only",
      iccid: resolved.iccid,
      note: "已收到 ICCID，但尚無法直查用量。若為本站購買，請用 LINE 登入本站後再查，或確認 ICCID 是否正確。",
      remainingMb: null,
      totalMb: null,
    },
  };
}

export function formatUsageForLine(data) {
  if (!data?.success) {
    return "查詢失敗，請稍後再試。";
  }

  if (data.source === "iccid_only" || data.remainingMb == null) {
    return [
      "📱 eSIM 用量查詢",
      "",
      `ICCID：${data.iccid || "—"}`,
      "",
      "⚠️ 目前無法依 ICCID 直接取得用量。",
      "若您曾在本站購買，請：",
      "1️⃣ 用同一 LINE 帳號登入本站",
      "2️⃣ 再傳「查詢用量」可自動查最近訂單",
      "",
      "或至網站查詢：",
      `${getPublicSiteUrl()}/data-query`,
    ].join("\n");
  }

  const remaining = formatMb(data.remainingMb);
  const total = formatMb(data.totalMb);
  const lines = [
    "📊 eSIM 用量查詢結果",
    "",
    data.productName ? `方案：${data.productName}` : null,
    data.iccid ? `ICCID：…${String(data.iccid).slice(-8)}` : null,
    remaining && total
      ? `剩餘流量：${remaining} / ${total}`
      : remaining
        ? `剩餘流量：${remaining}`
        : null,
    data.status ? `狀態：${data.status}` : null,
    data.expiresAt ? `到期：${String(data.expiresAt).slice(0, 10)}` : null,
    "",
    `※ ${data.note || "數據可能有延遲"}`,
  ].filter(Boolean);

  return lines.join("\n");
}
