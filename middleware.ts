// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 只針對無斜線的 /api/newebpay-notify 做內部改寫
  if (pathname === "/api/newebpay-notify") {
    const url = req.nextUrl.clone();
    url.pathname = "/api/newebpay-notify/"; // ✅ rewrite，不是 redirect
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Notify-Rewrite", "true"); // 方便你用 curl 檢查
    return res;
  }

  return NextResponse.next();
}

// 只比對這條路徑，減少不必要的開銷
export const config = {
  matcher: ["/api/newebpay-notify"],
};
