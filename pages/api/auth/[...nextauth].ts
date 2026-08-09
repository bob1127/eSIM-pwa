import NextAuth, { type NextAuthOptions } from "next-auth";
import LineProvider from "next-auth/providers/line";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function log(step: string, detail?: unknown) {
  const ts = new Date().toISOString();
  if (detail !== undefined) {
    console.log(`[Auth Debug] ${ts} | ${step}`, detail);
  } else {
    console.log(`[Auth Debug] ${ts} | ${step}`);
  }
}

// 啟動時印一次環境摘要（Vercel Functions Logs 可見）
log("NextAuth 模組載入", {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || "(未設定)",
  VERCEL_ENV: process.env.VERCEL_ENV || "(本機)",
  hasLineId: !!process.env.LINE_CLIENT_ID,
  hasLineSecret: !!process.env.LINE_CLIENT_SECRET,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  hasSupabaseAdmin: !!supabaseAdmin,
  expectedCallback: process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL.replace(/\/$/, "")}/api/auth/callback/line`
    : "(無法推算)",
});

function isDuplicateUserError(message = "") {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("duplicate") ||
    lower.includes("exists")
  );
}

const isProd = process.env.NODE_ENV === "production";
const useSecureCookies =
  isProd && !!process.env.NEXTAUTH_URL?.startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    LineProvider({
      clientId: process.env.LINE_CLIENT_ID as string,
      clientSecret: process.env.LINE_CLIENT_SECRET as string,
      // LINE 會驗證登入時回傳的 email 屬於該帳號本人，信任程度與 Google OAuth 相近，
      // 因此允許與既有同 email 帳號連結（讓會員可用 Email／Google／LINE 交替登入同一帳號）。
      allowDangerousEmailAccountLinking: true,
      // 登入時可一併加官方帳號（需在 LINE Developers 把 OA 連結到 Login 頻道）
      authorization: {
        params: {
          bot_prompt: "aggressive",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  // 顯式設定 cookie 屬性：httpOnly + sameSite=lax + 正式環境強制 Secure（__Secure- 前綴）
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      // CSRF token 前端需讀取比對，不能設 httpOnly
      name: `${useSecureCookies ? "__Host-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  // 只設 signIn：OAuthCallback 會變成 /login?error=OAuthCallback
  // 不要設 error→/login，否則打到 /api/auth/error（無參數）會變成 ?error=undefined
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      log("callback.signIn 開始", {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        userEmail: user?.email,
        userName: user?.name,
      });

      if (account?.provider !== "line") {
        log("callback.signIn 非 LINE，直接通過");
        return true;
      }

      if (!supabaseAdmin) {
        log("callback.signIn 失敗：Supabase Admin 未初始化", {
          hasUrl: !!supabaseUrl,
          hasServiceRole: !!serviceRoleKey,
        });
        return false;
      }

      const email = user.email || `${account.providerAccountId}@line-login.com`;
      const name = user.name || "LINE 會員";

      log("callback.signIn 準備同步 Supabase", { email, name, profile });

      try {
        const { data, error: createError } =
          await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
              full_name: name,
              line_id: account.providerAccountId,
              avatar_url: user.image,
            },
            password: crypto.randomBytes(16).toString("hex") + "A1@",
          });

        if (createError) {
          if (isDuplicateUserError(createError.message)) {
            log("callback.signIn Supabase 使用者已存在，允許登入", {
              email,
              msg: createError.message,
            });
            return true;
          }
          log("callback.signIn Supabase createUser 失敗 → AccessDenied", {
            email,
            error: createError.message,
            status: createError.status,
          });
          return false;
        }

        log("callback.signIn Supabase 新使用者建立成功", {
          email,
          userId: data?.user?.id,
        });
        return true;
      } catch (error) {
        log("callback.signIn Supabase 例外 → AccessDenied", error);
        return false;
      }
    },
    async jwt({ token, account, user }) {
      if (account) {
        log("callback.jwt 收到 account", {
          provider: account.provider,
          type: account.type,
          hasAccessToken: !!account.access_token,
        });
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      if (user) {
        log("callback.jwt 寫入 user", { id: user.id, email: user.email });
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        session.user.id = token.sub;
        if (!session.user.email) {
          session.user.email = `${token.sub}@line-login.com`;
        }
      }
      log("callback.session", {
        email: session?.user?.email,
        tokenSub: token?.sub,
      });
      return session;
    },
  },
  events: {
    async signIn(message) {
      log("event.signIn 成功", {
        user: message.user?.email,
        provider: message.account?.provider,
        isNewUser: message.isNewUser,
      });
    },
    async signOut(message) {
      log("event.signOut", { session: !!message.session });
    },
  },
  debug: process.env.NODE_ENV === "development",
};

/**
 * 包一層 log：從 terminal 可看到 LINE 實際打回來的完整 URL
 * （用來判斷 Callback 是否指錯成 /api/auth/error）
 */
const nextAuthHandler = NextAuth(authOptions);

export default function handler(req: any, res: any) {
  const q = req.query || {};
  log("NextAuth 收到請求", {
    method: req.method,
    url: req.url,
    action: q.nextauth,
    hasCode: typeof q.code === "string",
    hasState: typeof q.state === "string",
    error: q.error ?? null,
    queryKeys: Object.keys(q),
  });
  return nextAuthHandler(req, res);
}
