import { resolveMemberEmail } from "../push/_memberAuth";
import {
  LINE_BIND_MEMBER_COOKIE,
  LINE_BIND_RETURN_COOKIE,
  LINE_BIND_STATE_COOKIE,
  bindCookieOptions,
  buildLineAuthorizeUrl,
  createBindState,
  createMemberBindTicket,
  getBindCallbackAbsoluteUrl,
  sanitizeBindReturnTo,
} from "../../../lib/lineBindOAuth";

/**
 * POST /api/line/bind-prepare
 * body: { returnTo?: string }
 *
 * 在仍帶有 Authorization Bearer（Google／Supabase）時，把會員身分寫入
 * 短效簽章 cookie，再回傳 LINE authorize URL。之後瀏覽器導向 LINE，
 * 回呼時即可還原「誰要綁定」，不必依賴 Authorization header。
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const clientId = (process.env.LINE_CLIENT_ID || "").trim();
  if (!clientId) {
    return res.status(500).json({
      success: false,
      error: "尚未設定 LINE_CLIENT_ID",
    });
  }

  try {
    const member = await resolveMemberEmail(req, res);
    if (!member?.email) {
      return res.status(401).json({
        success: false,
        error: "請先登入會員",
        needLogin: true,
      });
    }

    const ticket = createMemberBindTicket(member);
    if (!ticket) {
      return res.status(400).json({
        success: false,
        error: "無法建立綁定票券",
      });
    }

    const returnTo = sanitizeBindReturnTo(
      req.body?.returnTo || "/account",
      "/account",
    );
    const state = createBindState();
    const redirectUri = getBindCallbackAbsoluteUrl(req);
    const opts = bindCookieOptions();

    res.setHeader("Set-Cookie", [
      `${LINE_BIND_STATE_COOKIE}=${encodeURIComponent(state)}; ${opts}`,
      `${LINE_BIND_RETURN_COOKIE}=${encodeURIComponent(returnTo)}; ${opts}`,
      `${LINE_BIND_MEMBER_COOKIE}=${encodeURIComponent(ticket)}; ${opts}`,
    ]);

    const authorizeUrl = buildLineAuthorizeUrl({
      clientId,
      redirectUri,
      state,
    });

    return res.status(200).json({
      success: true,
      authorizeUrl,
      returnTo,
    });
  } catch (err) {
    console.error("[api/line/bind-prepare]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "準備綁定失敗",
    });
  }
}
