import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";
import { createClient } from "@supabase/supabase-js";

// 🚀 1. 召喚 Supabase 最高管理員實體 (Server-side 運行)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 🚀 Pages Router 必須使用 export default
export default NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "line") {
        const email = user.email || `${account.providerAccountId}@line-login.com`;
        const name = user.name || "LINE 會員";

        try {
          // 步驟 A：檢查 Supabase 是否已有此用戶
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) throw listError;

          const existingUser = users.find((u) => u.email === email);

          // 步驟 B：若無，則建立新用戶並標記 Email 已驗證
          if (!existingUser) {
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: email,
              email_confirm: true,
              user_metadata: { full_name: name },
              password: Math.random().toString(36).slice(-10) + "A1@", 
            });

            if (createError) {
              console.error("同步至 Supabase 失敗:", createError.message);
              return false;
            }
          }
        } catch (error) {
          console.error("Supabase Admin API 異常:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      return session;
    },
  },
  // 增加 debug 模式，如果有錯可以在 Vercel Logs 看得更清楚
  debug: process.env.NODE_ENV === 'development',
});