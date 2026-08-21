import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

/**
 * 從請求解析登入會員身分（Google/Email 走 Supabase Bearer；LINE 走 NextAuth session）。
 * 回傳一致的身分物件，供查單 / email 認領等端點共用。
 *
 * @returns {Promise<{
 *   authed: boolean,
 *   supabaseUserId: string|null,
 *   lineUserId: string|null,
 *   email: string|null,
 *   metadata: object,
 * }>}
 */
export async function resolveMemberFromRequest(req, res) {
  // 1) Supabase Token（Google / Email 登入）
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (user) {
      const metadata = user.user_metadata || {};
      return {
        authed: true,
        supabaseUserId: user.id,
        lineUserId: metadata.line_id ? String(metadata.line_id) : null,
        email: user.email || null,
        metadata,
      };
    }
  }

  // 2) NextAuth Session（LINE 登入）
  const session = await getServerSession(req, res, authOptions);
  if (session && session.user) {
    return {
      authed: true,
      supabaseUserId: null,
      lineUserId: session.user.id ? String(session.user.id) : null,
      email: session.user.email || null,
      metadata: {},
    };
  }

  return {
    authed: false,
    supabaseUserId: null,
    lineUserId: null,
    email: null,
    metadata: {},
  };
}
