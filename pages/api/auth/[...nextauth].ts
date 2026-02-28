import NextAuth from "next-auth";
import LineProvider from "next-auth/providers/line";

export default NextAuth({
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
    }),
  ],
  // 這裡可以自訂登入頁面，之後刻好前端可以打開註解
  // pages: {
  //   signIn: '/login', 
  // },
  callbacks: {
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