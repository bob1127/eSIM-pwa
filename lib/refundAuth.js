import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import {
  resolveMemberEmail as resolveEmailFromIdentity,
  collectOrderLookupEmails,
} from "./memberIdentity";
import { lineUserIdToEmail } from "./lineAuth";

export function getSupabaseAdmin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** 相容舊呼叫：只回主 Email */
export async function requireCustomerEmail(req, res) {
  const member = await resolveRefundMember(req, res);
  return member?.email || null;
}

/**
 * 退款用會員身分（含可查詢 email 聯集，對齊 user-orders）
 */
export async function resolveRefundMember(req, res) {
  const supabaseAdmin = getSupabaseAdmin();
  let member = null;

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (supabaseAdmin) {
      const {
        data: { user },
      } = await supabaseAdmin.auth.getUser(token);
      if (user?.email) {
        const meta = user.user_metadata || {};
        let lineUserId = null;
        if (meta.line_id) lineUserId = String(meta.line_id);
        else if (meta.line_user_id) lineUserId = String(meta.line_user_id);
        else if (/@line-login\.com$/i.test(user.email)) {
          lineUserId = user.email.replace(/@line-login\.com$/i, "");
        }
        member = {
          email: user.email.toLowerCase(),
          userId: user.id,
          source: "supabase",
          lineUserId,
          userMetadata: meta,
        };
      }
    } else {
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } },
      );
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (user?.email) {
        member = {
          email: user.email.toLowerCase(),
          userId: user.id,
          source: "supabase",
          lineUserId: null,
          userMetadata: user.user_metadata || {},
        };
      }
    }
  }

  if (!member) {
    const session = await getServerSession(req, res, authOptions);
    if (session?.user) {
      const email =
        resolveEmailFromIdentity({ sessionUser: session.user }) ||
        (session.user.id ? lineUserIdToEmail(session.user.id) : null);
      if (email) {
        const jwt = await getToken({
          req,
          secret: process.env.NEXTAUTH_SECRET,
        }).catch(() => null);
        member = {
          email: String(email).toLowerCase(),
          userId: null,
          source: "line",
          lineUserId: session.user.id || null,
          lineAccessToken: jwt?.accessToken || null,
          userMetadata: {},
        };
      }
    }
  }

  if (!member?.email) return null;

  member.emails = await expandRefundLookupEmails(member, supabaseAdmin);
  return member;
}

async function expandRefundLookupEmails(member, supabaseAdmin) {
  const emails = collectOrderLookupEmails(
    member?.email,
    member?.userMetadata || {},
  );
  const addEmail = (value) => {
    if (!value) return;
    const e = String(value).toLowerCase();
    if (!emails.includes(e)) emails.push(e);
  };

  if (!supabaseAdmin) return emails;

  const lineUserId = member?.lineUserId || null;
  const supabaseUserId = member?.userId || null;

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
  } catch {
    /* table may not exist */
  }

  if (lineUserId) {
    try {
      const { data: links } = await supabaseAdmin
        .from("line_account_links")
        .select("email, user_id")
        .eq("line_user_id", lineUserId);
      for (const l of links || []) {
        addEmail(l?.email);
        if (l?.user_id) {
          try {
            const { data: u } = await supabaseAdmin.auth.admin.getUserById(
              l.user_id,
            );
            addEmail(u?.user?.email);
            const linked = u?.user?.user_metadata?.linked_order_emails;
            if (Array.isArray(linked)) linked.forEach(addEmail);
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return emails;
}

/** 訂單是否屬於此會員（主信箱／認領／LINE 綁定聯集） */
export function memberOwnsOrder(order, emails = [], lineUserId = null) {
  if (!order) return false;
  if (emails?.length) {
    const set = new Set(emails.map((e) => String(e).toLowerCase()));
    const candidates = [
      order.customer_email,
      order.email,
      order?.metadata?.checkout_email,
      order?.metadata?.customer_email,
    ];
    if (candidates.some((e) => e && set.has(String(e).toLowerCase()))) {
      return true;
    }
  }
  // Medusa／結帳以 LINE 身分下單：metadata 帶 line_user_id
  if (lineUserId) {
    const metaLine =
      order?.metadata?.line_user_id ||
      order?.metadata?.line_id ||
      order?.line_user_id ||
      null;
    if (metaLine && String(metaLine) === String(lineUserId)) return true;
  }
  return false;
}

/**
 * 依 order_id 或 medusa_order_id 取訂單，並驗證歸屬
 * @returns {{ order: object|null, forbidden: boolean }}
 */
export async function loadOwnedRefundOrder(
  supabaseAdmin,
  orderId,
  emails,
  lineUserId = null,
) {
  if (!supabaseAdmin || !orderId) {
    return { order: null, forbidden: false };
  }

  let { data } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!data && String(orderId).startsWith("order_")) {
    const byMedusa = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("medusa_order_id", orderId)
      .maybeSingle();
    data = byMedusa.data || null;
  }

  if (!data) return { order: null, forbidden: false };

  if (!memberOwnsOrder(data, emails, lineUserId)) {
    return { order: null, forbidden: true };
  }
  return { order: data, forbidden: false };
}
