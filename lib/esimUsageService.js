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

/** 供應商常回陣列欄位 ["…"] */
function firstScalar(...vals) {
  for (const v of vals) {
    if (v == null || v === "") continue;
    if (Array.isArray(v)) {
      const nested = firstScalar(...v);
      if (nested != null && nested !== "") return nested;
      continue;
    }
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function toMbNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "0.00 MB" / "1.5 GB" → MB number */
export function parseDataUsageToMb(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^([\d.]+)\s*(GB|MB|KB)?$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] || "MB").toUpperCase();
  if (unit === "GB") return n * 1024;
  if (unit === "KB") return n / 1024;
  return n;
}

/** Taiwan-Daily2GB-1-D1 / Daily1GB → 額度 MB（供 remaining = total - used） */
export function quotaMbFromPlanName(name) {
  const s = String(name || "");
  const daily = s.match(/Daily\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  const dailyCompact = s.match(/Daily(\d+(?:\.\d+)?)(GB|MB)/i);
  const hit = daily || dailyCompact;
  if (hit) {
    const n = Number(hit[1]);
    const u = String(hit[2] || "GB").toUpperCase();
    if (!Number.isFinite(n)) return null;
    return u === "GB" ? n * 1024 : n;
  }
  const total = s.match(/Total\s*(\d+(?:\.\d+)?)\s*(GB|MB)/i);
  const totalCompact = s.match(/Total(\d+(?:\.\d+)?)(GB|MB)/i);
  const hitT = total || totalCompact;
  if (hitT) {
    const n = Number(hitT[1]);
    const u = String(hitT[2] || "GB").toUpperCase();
    if (!Number.isFinite(n)) return null;
    return u === "GB" ? n * 1024 : n;
  }
  return null;
}

export function normalizeUsageIccid(v) {
  return String(v || "").replace(/\s+/g, "").trim();
}

async function postMicroesimForm(path, fields) {
  if (!ACCOUNT || !SECRET || !SALT_HEX) {
    return { ok: false, error: "eSIM 供應商 API 未設定" };
  }
  const sig = signHeaders();
  const form = new FormData();
  for (const [k, v] of Object.entries(fields || {})) {
    if (v == null || v === "") continue;
    form.append(k, String(v));
  }
  const res = await axios.post(`${BASE_URL}${path}`, form, {
    headers: {
      ...form.getHeaders(),
      "MICROESIM-ACCOUNT": ACCOUNT,
      "MICROESIM-NONCE": sig.nonce,
      "MICROESIM-TIMESTAMP": sig.timestamp,
      "MICROESIM-SIGN": sig.signature,
    },
    timeout: 15000,
  });
  return { ok: true, data: res.data };
}

async function fetchTopupDetail(topupId) {
  return postMicroesimForm("/allesim/v1/topupDetail", { topup_id: topupId });
}

/**
 * 真實用量：需同時 topup_id + device_id（ICCID）
 * 回傳 data_usage / active_time / expire_time 等
 */
async function fetchDeviceDetail(topupId, deviceId) {
  return postMicroesimForm("/allesim/v1/deviceDetail", {
    topup_id: topupId,
    device_id: deviceId,
  });
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
 * topupDetail：方案／QR 中繼；deviceDetail：真實 data_usage／active_time
 * @returns {{ ok: boolean, status?: number, data?: object, error?: string }}
 */
export async function queryEsimUsage({ iccid, topupId, endpoint } = {}) {
  const resolved = await resolveTopupId({ iccid, topupId, endpoint });

  if (!resolved.topupId && !resolved.iccid) {
    return { ok: false, status: 400, error: "請提供 ICCID 或 topup_id" };
  }

  if (!resolved.topupId) {
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
    let iccidResolved =
      resolved.iccid ||
      firstScalar(r.iccid, r.ICCID, r.device_id, r.device_ids) ||
      null;
    iccidResolved = normalizeUsageIccid(iccidResolved);

    let remainingMb = toMbNumber(
      firstScalar(
        r.remaining_mb,
        r.remain_mb,
        r.data_balance,
        r.remaining,
        r.remain_data,
        r.left_mb,
      ),
    );
    let totalMb = toMbNumber(
      firstScalar(r.total_mb, r.data_total, r.total, r.total_data, r.data_mb),
    );
    let usedMb = toMbNumber(
      firstScalar(r.used_mb, r.data_used, r.used, r.used_data),
    );

    // topupDetail.activation_date ≈ 出貨開通；deviceDetail.active_time = 裝置實際啟用
    let provisionedAt = firstScalar(
      r.activation_date,
      r.activated_at,
      r.activate_time,
    );
    let activatedAt = null;
    const createdAt = firstScalar(r.create_time, r.created_at, r.createTime);
    let expiresAt = firstScalar(
      r.plan_end_date,
      r.expire_time,
      r.expired_at,
      r.end_date,
    );
    const planName = firstScalar(
      r.channel_dataplan_name,
      r.product_name,
      r.plan_name,
      r.name,
    );
    let status = firstScalar(r.status, r.state);
    let source = "topup_id";
    let dailyResetTime = null;
    let isDaily = null;

    if (iccidResolved) {
      try {
        const deviceRes = await fetchDeviceDetail(
          resolved.topupId,
          iccidResolved,
        );
        if (deviceRes.ok && deviceRes.data?.code === 1) {
          const d = deviceRes.data.result || {};
          source = "device_detail";
          const usageMb = parseDataUsageToMb(d.data_usage);
          if (usageMb != null) usedMb = usageMb;

          const quota = quotaMbFromPlanName(
            firstScalar(d.channel_dataplan_name, planName),
          );
          if (quota != null) totalMb = quota;
          if (usedMb != null && totalMb != null) {
            remainingMb = Math.max(0, Number(totalMb) - Number(usedMb));
          }

          activatedAt = firstScalar(d.active_time) || activatedAt;
          expiresAt = firstScalar(d.expire_time) || expiresAt;
          status = firstScalar(d.status) || status;
          dailyResetTime = firstScalar(d.daily_reset_time) || null;
          isDaily =
            d.is_daily === true ||
            String(d.is_daily || "").toLowerCase() === "true";
          if (!iccidResolved) {
            iccidResolved = firstScalar(d.device_id, d.operator_iccid);
          }
        }
      } catch (deviceErr) {
        console.warn(
          "[esimUsage] deviceDetail 失敗，改用 topupDetail:",
          deviceErr?.message || deviceErr,
        );
      }
    }

    if (
      usedMb == null &&
      remainingMb != null &&
      totalMb != null
    ) {
      usedMb = Math.max(0, Number(totalMb) - Number(remainingMb));
    }

    const raw = {
      success: true,
      source,
      topupId: resolved.topupId,
      iccid: iccidResolved,
      productName: planName,
      planId: firstScalar(r.plan_id, r.planId, r.channel_dataplan_id),
      sku: firstScalar(r.sku, r.product_code, planName),
      status,
      remainingMb,
      totalMb,
      usedMb,
      // active_time＝手機／網路實際啟用；provisionedAt＝出貨戳記
      activatedAt: activatedAt || null,
      provisionedAt: provisionedAt || null,
      createdAt: createdAt || null,
      expiresAt: expiresAt || null,
      dailyResetTime,
      isDaily,
      dataAllowance: firstScalar(r.flow, r.data, r.data_allowance),
      serviceDays: firstScalar(r.day, r.days, r.service_days),
      ruleDesc: firstScalar(r.rule_desc, r.Rule_desc),
      specialDesc: firstScalar(r.special_desc, r.speed_desc),
      speedDesc: firstScalar(r.speed_desc),
      note:
        remainingMb == null && usedMb == null
          ? "供應商尚未回傳用量數值（可能尚未產生流量或同步延遲）。用量更新通常需間隔 30–60 分鐘；手機顯示用量通常會略高於此數字。"
          : "用量更新通常需間隔 30–60 分鐘；手機顯示用量通常會略高於此數字",
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

export function formatUsageForLine(data) {
  if (!data?.success) {
    return "查詢失敗，請稍後再試。";
  }

  if (data.source === "iccid_only") {
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
  const used = formatMb(data.usedMb);
  const lines = [
    "📊 eSIM 用量查詢結果",
    "",
    data.productName ? `方案：${data.productName}` : null,
    data.iccid ? `ICCID：…${String(data.iccid).slice(-8)}` : null,
    remaining && total
      ? `剩餘流量：${remaining} / ${total}`
      : remaining
        ? `剩餘流量：${remaining}`
        : used
          ? `已用流量：${used}${total ? ` / ${total}` : ""}`
          : "剩餘流量：暫無（供應商尚未同步）",
    data.status ? `狀態：${data.status}` : null,
    data.activatedAt
      ? `裝置啟用：${String(data.activatedAt).slice(0, 16)}`
      : data.provisionedAt || data.createdAt
        ? `供應商開通：${String(data.provisionedAt || data.createdAt).slice(0, 16)}`
        : null,
    data.expiresAt ? `到期：${String(data.expiresAt).slice(0, 10)}` : null,
    "",
    `※ ${data.note || "數據可能有延遲"}`,
  ].filter(Boolean);

  return lines.join("\n");
}
