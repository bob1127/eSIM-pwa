import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../auth/[...nextauth]";
import {
  fetchMemberEsims,
  fetchMemberEsimsForIdentity,
} from "../../../lib/memberEsims";
import { collectOrderLookupEmails } from "../../../lib/memberIdentity";
import { lineUserIdToEmail } from "../../../lib/lineAuth";

export {
  fetchMemberEsims,
  fetchMemberEsimsForIdentity,
} from "../../../lib/memberEsims";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * 解析目前請求的使用者（Supabase 或 LINE NextAuth）
 * @returns {Promise<null | {
 *   email: string,
 *   userId: string|null,
 *   source: 'supabase'|'line',
 *   lineUserId: string|null,
 *   lineAccessToken: string|null,
 *   userMetadata: object,
 * }>}
 */
export async function resolveMemberEmail(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token) {
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
      return {
        email: user.email.toLowerCase(),
        userId: user.id,
        source: "supabase",
        lineUserId,
        lineAccessToken: null,
        userMetadata: meta,
      };
    }
  }

  const session = await getServerSession(req, res, authOptions);
  if (session?.user) {
    const email =
      session.user.email ||
      (session.user.id
        ? lineUserIdToEmail(session.user.id)
        : `${session.user.name || "line"}@line.jekoesim.com`);
    const jwt = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    return {
      email: email.toLowerCase(),
      userId: null,
      source: "line",
      lineUserId: session.user.id || null,
      lineAccessToken: jwt?.accessToken || null,
      userMetadata: {},
    };
  }

  return null;
}

/** 擴充本人可查詢的 email 聯集（認領／LINE 綁定），與 user-orders 一致 */
export async function expandMemberLookupEmails(member) {
  const emails = collectOrderLookupEmails(
    member?.email,
    member?.userMetadata || {},
  );
  const addEmail = (value) => {
    if (!value) return;
    const e = String(value).toLowerCase();
    if (!emails.includes(e)) emails.push(e);
  };

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
  } catch (e) {
    console.warn("[memberAuth] claimed emails:", e?.message);
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
            const linked = u?.user?.user_metadata?.linked_order_emails;
            if (Array.isArray(linked)) linked.forEach(addEmail);
            addEmail(u?.user?.email);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.warn("[memberAuth] line links:", e?.message);
    }
  }

  return emails;
}
