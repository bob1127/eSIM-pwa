import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";
// 🚀 關鍵引入：Supabase Adapter
import { SupabaseAdapter } from "@auth/supabase-adapter";

export default NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
    }),
  ],
  // 🚀 關鍵設定：裝上 Adapter，並指定你的 Supabase 網址和最高權限金鑰
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  }),
  // 🚀 關鍵設定：當使用 Adapter 時，session 策略預設會變成 database，
  // 為了效能和 Next.js 14 的相容性，我們強制改回 jwt
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      // 🚀 將資料庫產生的 user id 存進 token 裡
      if (user) {
        token.sub = user.id; 
      }
      return token;
    },
    async session({ session, token }) {
      // 🚀 將 token 裡的 id 傳給前端，讓你的 AccountPage 可以抓到正確的訂單
      if (session.user) {
        (session.user as any).id = token.sub; 
      }
      return session;
    },
  },
});