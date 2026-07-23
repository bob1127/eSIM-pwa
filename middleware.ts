// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // trailingSlash: true 時，無尾斜線的 API 會 308；LINE Webhook 不接受 308
  const apiRewriteTargets: Record<string, string> = {
    "/api/line/webhook": "/api/line/webhook/",
  };
  const rewriteTo = apiRewriteTargets[pathname];
  if (rewriteTo) {
    const url = req.nextUrl.clone();
    url.pathname = rewriteTo;
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Api-Rewrite", rewriteTo);
    return res;
  }

  return NextResponse.next();
}

// 只比對這條路徑，減少不必要的開銷
export const config = {
  matcher: ["/api/line/webhook"],
};
