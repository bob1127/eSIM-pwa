import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { getToken } from "next-auth/jwt";
import { authOptions } from "../auth/[...nextauth]";
import { fetchMemberEsims } from "../../../lib/memberEsims";

export { fetchMemberEsims } from "../../../lib/memberEsims";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/** 解析目前請求的使用者 Email（Supabase 或 LINE NextAuth） */
export async function resolveMemberEmail(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user?.email) {
      return { email: user.email.toLowerCase(), userId: user.id, source: "supabase" };
    }
  }

  const session = await getServerSession(req, res, authOptions);
  if (session?.user) {
    const email =
      session.user.email ||
      (session.user.id
        ? `${session.user.id}@line-login.com`
        : `${session.user.name || "line"}@line.jekoesim.com`);
    // LINE Login access token：用來打 friendship/v1/status
    const jwt = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);
    // LINE providerAccountId 不是 UUID，不可當 supabase user_id
    return {
      email: email.toLowerCase(),
      userId: null,
      source: "line",
      lineUserId: session.user.id || null,
      lineAccessToken: jwt?.accessToken || null,
    };
  }

  return null;
}
