import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";
import {
  getAdminEmailAllowlist,
  isAdminEmail,
} from "./productAdminConfig";

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export { getAdminEmailAllowlist, isAdminEmail };

/**
 * 解析目前請求是否為管理者（Supabase JWT 或 NextAuth session）
 * 絕不依賴前端傳入的 isAdmin 旗標
 */
export async function resolveAdminUser(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (token && supabaseAdmin) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (!error && user?.email) {
      // ⚠️ 安全性：絕不可信任 user_metadata.role — Supabase 允許使用者用自己的
      // JWT 透過 `auth.updateUser({ data: {...} })` 自行改寫 user_metadata，
      // 等於任何登入者都能自封為 admin。app_metadata 才是只有服務端（service
      // role）能寫入的欄位，才可作為權限依據；email allowlist 為主要判斷來源。
      if (isAdminEmail(user.email) || user.app_metadata?.role === "admin") {
        return {
          email: user.email.toLowerCase(),
          userId: user.id,
          source: "supabase",
        };
      }
    }
  }

  const session = await getServerSession(req, res, authOptions);
  const sessionEmail =
    session?.user?.email ||
    (session?.user?.id ? `${session.user.id}@line-login.com` : null);

  if (sessionEmail && isAdminEmail(sessionEmail)) {
    return {
      email: sessionEmail.toLowerCase(),
      userId: session.user.id || null,
      source: "nextauth",
    };
  }

  return null;
}

/** 管理者專用 API：未通過則回 403 並回傳 null */
export async function requireAdmin(req, res) {
  const admin = await resolveAdminUser(req, res);
  if (!admin) {
    res.status(403).json({ error: "需要管理者權限" });
    return null;
  }
  return admin;
}
