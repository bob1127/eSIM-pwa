// 檔案位置: pages/api/orders/user-orders.js
//
// 會員查單（Medusa 為主站訂單的單一真相）。
//   - 主站（無 store_id）：Medusa /store/member-orders（依 email 聯集 /
//     line_user_id / supabase_user_id 查）+ 相容舊資料的 Supabase orders，合併去重。
//   - 夥伴店（帶 store_id）：維持只查 Supabase orders（夥伴店流程仍以 Supabase 為主）。
//
// 安全把關：只允許查詢「登入者本人」可存取的 email（含已綁定 linked_order_emails）。
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { lineUserIdToEmail } from "@/lib/lineAuth";
import { collectOrderLookupEmails } from "@/lib/memberIdentity";
import { fetchMedusaMemberOrders } from "@/lib/medusaMemberOrders";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const targetEmail = req.query.email;
  if (!targetEmail) {
    return res.status(400).json({ message: "缺少 Email 參數" });
  }

  let isAuthenticated = false;
  let userEmail = null;
  let userMetadata = {};
  let supabaseUserId = null;
  let lineUserId = null;

  try {
    // 🛡️ 1. 檢查 Supabase Token (Google / Email 登入)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (user) {
        isAuthenticated = true;
        userEmail = user.email;
        userMetadata = user.user_metadata || {};
        supabaseUserId = user.id;
        // Supabase 使用者若曾綁定 LINE，metadata.line_id 可一併帶入查單
        if (userMetadata?.line_id) lineUserId = String(userMetadata.line_id);
        else if (userMetadata?.line_user_id) {
          lineUserId = String(userMetadata.line_user_id);
        } else if (
          typeof userEmail === "string" &&
          /@line-login\.com$/i.test(userEmail)
        ) {
          lineUserId = userEmail.replace(/@line-login\.com$/i, "");
        }
      }
    }

    // 🛡️ 2. 檢查 NextAuth Session (LINE 登入)
    if (!isAuthenticated) {
      const session = await getServerSession(req, res, authOptions);
      if (session && session.user) {
        isAuthenticated = true;
        userEmail =
          session.user.email ||
          (session.user.id ? lineUserIdToEmail(session.user.id) : null);
        if (session.user.id) lineUserId = String(session.user.id);
      }
    }

    const lookupEmails = collectOrderLookupEmails(userEmail, userMetadata);

    // Service Role 客戶端（查單 + 綁定 email 擴充都會用到）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );

    // 🔗 擴充：把「已驗證綁定到本人 LINE 身分」的 email 併入查詢聯集。
    // line_account_links 於綁定時已驗證 LINE id_token 且該 email 為本人所有，
    // 因此符合「歷史訂單只用已驗證 email 認領」原則。
    const addEmail = (value) => {
      if (!value) return;
      const e = String(value).toLowerCase();
      if (!lookupEmails.includes(e)) lookupEmails.push(e);
    };

    // 已驗證（OTP）認領的 email：依 LINE / Supabase 身分讀取 member_claimed_emails
    try {
      const orFilters = [];
      if (lineUserId) orFilters.push(["line", lineUserId]);
      if (supabaseUserId) orFilters.push(["supabase", supabaseUserId]);
      for (const [subjectType, subjectId] of orFilters) {
        const { data: claimed } = await supabaseAdmin
          .from("member_claimed_emails")
          .select("email")
          .eq("subject_type", subjectType)
          .eq("subject_id", subjectId);
        for (const c of claimed || []) addEmail(c?.email);
      }
    } catch (e) {
      console.warn("[user-orders] 讀取已認領 email 失敗（略過）:", e?.message);
    }

    if (lineUserId) {
      try {
        const { data: links } = await supabaseAdmin
          .from("line_account_links")
          .select("email, user_id")
          .eq("line_user_id", lineUserId);
        for (const l of links || []) {
          addEmail(l?.email);
          // 該 LINE 綁定的 Supabase 會員若另存已驗證 linked_order_emails，一併納入
          if (l?.user_id) {
            try {
              const { data: u } = await supabaseAdmin.auth.admin.getUserById(
                l.user_id,
              );
              const linked = u?.user?.user_metadata?.linked_order_emails;
              if (Array.isArray(linked)) linked.forEach(addEmail);
              addEmail(u?.user?.email);
            } catch {
              /* 忽略單筆讀取失敗 */
            }
          }
        }
      } catch (e) {
        console.warn(
          "[user-orders] 讀取 LINE 綁定 email 失敗（略過）:",
          e?.message,
        );
      }
    }

    const normalizedTarget = String(targetEmail).toLowerCase();

    // 🛡️ 3. 資安防護：只能查詢本人（或已關聯）的 Email
    if (!isAuthenticated || !lookupEmails.includes(normalizedTarget)) {
      return res.status(401).json({ message: "未授權的存取，無法查詢他人訂單" });
    }

    const storeId = Number(req.query.store_id);
    const isPartnerStore = Number.isFinite(storeId) && storeId > 0;

    const { data: orders, error } = await (() => {
      let q = supabaseAdmin
        .from("orders")
        .select("*")
        .in("customer_email", lookupEmails)
        .order("created_at", { ascending: false });
      if (isPartnerStore) {
        q = q.eq("store_id", storeId);
      }
      return q;
    })();

    if (error) throw error;

    const supabaseOrders = orders || [];
    const orderIds = supabaseOrders.map((o) => o.id).filter(Boolean);

    let refundsByOrder = {};
    if (orderIds.length) {
      const { data: refunds, error: refundErr } = await supabaseAdmin
        .from("refund_requests")
        .select(
          "id, order_id, status, request_type, reason_type, reason_note, admin_note, created_at, reviewed_at",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });

      if (refundErr) throw refundErr;

      for (const r of refunds || []) {
        if (!refundsByOrder[r.order_id]) refundsByOrder[r.order_id] = [];
        refundsByOrder[r.order_id].push(r);
      }
    }

    const supabaseNormalized = supabaseOrders.map((order) => ({
      ...order,
      refund_requests: refundsByOrder[order.id] || [],
    }));

    // 🚀 5. 主站（非夥伴店）：加入 Medusa 為真相的主站訂單
    let medusaNormalized = [];
    if (!isPartnerStore) {
      medusaNormalized = await fetchMedusaMemberOrders({
        emails: lookupEmails,
        lineUserId,
        supabaseUserId,
      });
    }

    // 🚀 6. 合併去重（跨系統 id 不重疊；同系統以 id 去重）
    // 已取消訂單不進會員中心列表（本機／未付款殘單取消後也不佔用儀表板）
    const seen = new Set();
    const merged = [];
    for (const o of [...medusaNormalized, ...supabaseNormalized]) {
      const key = String(o.id);
      if (seen.has(key)) continue;
      const st = String(o?.status || "").toLowerCase();
      if (st === "cancelled" || st === "canceled") continue;
      seen.add(key);
      merged.push(o);
    }

    merged.sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );

    return res.status(200).json({ success: true, data: merged });
  } catch (error) {
    console.error("[Get Orders Error]:", error);
    return res.status(500).json({ message: "系統讀取訂單失敗" });
  }
}
