import { resolveMemberEmail } from "../push/_memberAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { performLineAccountBind } from "../../../lib/lineAccountBind";
import { getClientIp } from "../../../lib/couponRateLimit";
import {
  LINE_BIND_MEMBER_COOKIE,
  LINE_BIND_RETURN_COOKIE,
  LINE_BIND_STATE_COOKIE,
  appendQuery,
  exchangeLineAuthCode,
  getBindCallbackAbsoluteUrl,
  sanitizeBindReturnTo,
  verifyMemberBindTicket,
} from "../../../lib/lineBindOAuth";

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i === -1) continue;
    if (p.slice(0, i) === name) {
      try {
        return decodeURIComponent(p.slice(i + 1));
      } catch {
        return p.slice(i + 1);
      }
    }
  }
  return null;
}

function clearBindCookies(res) {
  res.setHeader("Set-Cookie", [
    `${LINE_BIND_STATE_COOKIE}=; Path=/; Max-Age=0`,
    `${LINE_BIND_RETURN_COOKIE}=; Path=/; Max-Age=0`,
    `${LINE_BIND_MEMBER_COOKIE}=; Path=/; Max-Age=0`,
  ]);
}

/**
 * GET /api/line/bind-callback
 * LINE Login OAuth 回呼（本機開發用）
 *
 * Callback URL：http://localhost:3000/api/line/bind-callback
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const returnTo = sanitizeBindReturnTo(
    readCookie(req, LINE_BIND_RETURN_COOKIE),
    "/account",
  );
  const expectedState = readCookie(req, LINE_BIND_STATE_COOKIE);
  const { code, state, error, error_description: errorDesc } = req.query;

  const fail = (msg, code = "BIND_FAILED") => {
    clearBindCookies(res);
    return res.redirect(
      302,
      appendQuery(returnTo, {
        line_bind: "error",
        line_bind_code: code,
        // 短訊息即可；長中文放 URL 偶爾會讓頁面解析異常
        line_bind_msg: String(msg || "").slice(0, 80),
      }),
    );
  };

  if (error) {
    return fail(String(errorDesc || error || "授權已取消"));
  }
  if (!code || typeof code !== "string") {
    return fail("缺少授權碼");
  }
  if (!expectedState || state !== expectedState) {
    return fail("授權狀態驗證失敗，請重試");
  }

  const clientId = (process.env.LINE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.LINE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return fail("伺服器尚未設定 LINE Login");
  }

  try {
    // 優先用 prepare 寫入的簽章票券（Google／Supabase Bearer 情境）
    // 其次才嘗試 session cookie（NextAuth LINE）
    const ticketMember = verifyMemberBindTicket(
      readCookie(req, LINE_BIND_MEMBER_COOKIE),
    );
    const sessionMember = ticketMember
      ? null
      : await resolveMemberEmail(req, res);
    const member = ticketMember || sessionMember;

    if (!member?.email) {
      return fail("請先登入本站會員後再連結 LINE", "NEED_LOGIN");
    }

    const redirectUri = getBindCallbackAbsoluteUrl(req);
    const tokenResult = await exchangeLineAuthCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });
    if (!tokenResult.ok) {
      return fail(tokenResult.error || "無法取得 LINE Token");
    }

    const supabaseAdmin = getSupabaseAdminServer();
    const ip = getClientIp(req);
    const result = await performLineAccountBind(
      supabaseAdmin,
      member,
      tokenResult.idToken,
      {
        logAttempt: async ({ success }) => {
          try {
            await supabaseAdmin.from("line_bind_attempts").insert([
              { ip: ip || null, email: member.email, success: !!success },
            ]);
          } catch {
            /* ignore */
          }
        },
      },
    );

    clearBindCookies(res);

    if (!result.ok) {
      return res.redirect(
        302,
        appendQuery(returnTo, {
          line_bind: "error",
          line_bind_msg: result.body?.error || "綁定失敗",
        }),
      );
    }

    return res.redirect(
      302,
      appendQuery(returnTo, {
        line_bind: "ok",
        line_friend: result.body?.is_friend ? "1" : "0",
      }),
    );
  } catch (err) {
    console.error("[api/line/bind-callback]", err);
    return fail(err?.message || "綁定失敗");
  }
}
