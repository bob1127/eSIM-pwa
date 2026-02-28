import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";
import { createClient } from "@supabase/supabase-js";

// 🚀 1. 召喚 Supabase 最高管理員實體 (只在後端運行，絕對安全)
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

const handler = NextAuth({
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
    // 🚀 2. 登入攔截器：在客人成功授權 LINE 後、進入網站前觸發
    async signIn({ user, account, profile }) {
      if (account?.provider === "line") {
        // 🚨 防呆機制：LINE 有時候不會提供 Email，我們幫他生成一個專屬 ID 信箱
        const email = user.email || `${account.providerAccountId}@line-login.com`;
        const name = user.name || "LINE 會員";

        try {
          // 步驟 A：用管理員權限尋找這個信箱是否已經在 Supabase 裡
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (listError) throw listError;

          const existingUser = users.find((u) => u.email === email);

          // 步驟 B：如果沒找到，就在 Supabase 自動幫他生一個帳號
          if (!existingUser) {
            const { error: createError } = await supabaseAdmin.auth.admin.createUser({
              email: email,
              email_confirm: true, // 直接標記為已驗證
              user_metadata: { full_name: name },
              // 給他一組隨機亂碼密碼，反正他是用 LINE 登入的
              password: Math.random().toString(36).slice(-10) + "A1@", 
            });

            if (createError) {
              console.error("同步 LINE 帳號至 Supabase 失敗:", createError);
              return false; // 阻擋登入
            }
            console.log("✅ 成功將新的 LINE 會員同步至 Supabase!");
          } else {
            console.log("ℹ️ 此 LINE 會員已存在於 Supabase，直接放行");
          }
        } catch (error) {
          console.error("Supabase Admin API 發生錯誤:", error);
          return false;
        }
      }
      return true; // 檢查完畢，完美放行！
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
});

export { handler as GET, handler as POST };