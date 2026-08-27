import { createClient } from "@supabase/supabase-js";
import {
  resolveMemberEmail,
  expandMemberLookupEmails,
  fetchMemberEsimsForIdentity,
} from "./_memberAuth";
import { findOwnedEsim } from "../../../lib/esimOrderExtract";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function normalizeIccid(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

/** push_subscriptions.order_id 是 uuid；Medusa id（order_01…）不可寫入 */
function toPushOrderId(orderId) {
  const raw = String(orderId || "").trim();
  if (!raw) return null;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      raw,
    )
  ) {
    return raw;
  }
  return null;
}

async function loadMemberEsims(member) {
  const emails = await expandMemberLookupEmails(member);
  return fetchMemberEsimsForIdentity({
    emails,
    lineUserId: member.lineUserId || null,
    supabaseUserId: member.userId || null,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const {
    endpoint,
    iccid: rawIccid,
    email: rawEmail,
    code,
    topupId,
    bindMethod,
  } = req.body ?? {};

  if (!endpoint) {
    return res.status(400).json({ error: "缺少推播 endpoint，請先開啟推播通知" });
  }

  const { data: existing, error: findErr } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (findErr) {
    return res.status(500).json({ error: "查詢推播訂閱失敗", detail: findErr.message });
  }
  if (!existing) {
    return res.status(404).json({
      error: "找不到推播訂閱",
      hint: "請先點「開啟流量提醒通知」完成瀏覽器推播授權",
    });
  }

  const member = await resolveMemberEmail(req, res);
  const iccid = normalizeIccid(rawIccid);
  const update = {
    iccid_bound_at: new Date().toISOString(),
    monitor_enabled: true,
  };
  if (member?.userId && member.source === "supabase") {
    update.user_id = member.userId;
  }

  // 路徑 C：會員選擇本站訂單 eSIM
  if (bindMethod === "member_order" && topupId) {
    if (!member?.email) {
      return res.status(401).json({ error: "請先登入會員" });
    }
    const esims = await loadMemberEsims(member);
    const target = findOwnedEsim(esims, topupId);
    if (!target) {
      return res.status(403).json({ error: "此 eSIM 不屬於您的帳戶" });
    }
    update.topup_id = target.topupId;
    update.product_label = target.productName;
    const oid = toPushOrderId(target.orderId);
    if (oid) update.order_id = oid;
    update.guest_email = member.email;
    update.bind_method = "member_order";
    if (target.iccid) update.iccid = target.iccid;
  }
  // 路徑 A：手動 ICCID（僅會員）
  else if (iccid) {
    if (!member?.email) {
      return res.status(401).json({
        error: "請先登入會員",
        hint: "流量提醒僅限會員使用，登入後即可綁定 ICCID",
      });
    }
    if (!/^\d{18,22}$/.test(iccid)) {
      return res.status(400).json({
        error: "ICCID 格式錯誤",
        hint: "請輸入 18～22 碼數字",
      });
    }
    update.iccid = iccid;
    update.bind_method = "member_iccid";
    update.guest_email = member.email;
  }
  // 路徑 B：訪客 Email／驗證碼已停用
  else if (rawEmail || code) {
    return res.status(401).json({
      error: "請先登入會員",
      hint: "流量提醒不再支援訪客 Email 綁定",
    });
  } else {
    return res.status(400).json({
      error: "請提供 ICCID，或選擇會員訂單",
    });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("push_subscriptions")
    .update(update)
    .eq("endpoint", endpoint);

  if (updateErr) {
    return res.status(500).json({ error: "綁定失敗", detail: updateErr.message });
  }

  return res.status(200).json({
    success: true,
    message: "eSIM 已綁定，流量偏低時將透過推播提醒您",
    bindMethod: update.bind_method,
    iccid: update.iccid || null,
    topupId: update.topup_id || null,
    productName: update.product_label || null,
    guestEmail: update.guest_email || null,
  });
}
