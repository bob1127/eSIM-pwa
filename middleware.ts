// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function withPartnerSecurityHeaders(res: NextResponse) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.headers.set("X-DNS-Prefetch-Control", "off");
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // trailingSlash: true 時，無尾斜線的 API 會 308；LINE Webhook 不接受 308
  // NextAuth LINE callback 若帶尾斜線，也可能弄丟 query / state
  const apiRewriteTargets: Record<string, string> = {
    "/api/line/webhook": "/api/line/webhook/",
    "/api/auth/callback/line/": "/api/auth/callback/line",
  };
  const rewriteTo = apiRewriteTargets[pathname];
  if (rewriteTo) {
    const url = req.nextUrl.clone();
    url.pathname = rewriteTo;
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Api-Rewrite", rewriteTo);
    return res;
  }

  // 夥伴登入／後台入口：防 clickjacking、禁快取敏感頁
  if (
    pathname === "/partner/login" ||
    pathname === "/partner/login/" ||
    pathname.startsWith("/partner/reset-password") ||
    pathname.startsWith("/api/partner/login")
  ) {
    return withPartnerSecurityHeaders(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/line/webhook",
    "/api/auth/callback/line/:path*",
    "/partner/login",
    "/partner/login/",
    "/partner/reset-password",
    "/partner/reset-password/",
    "/api/partner/login",
    "/api/partner/login/",
  ],
};
