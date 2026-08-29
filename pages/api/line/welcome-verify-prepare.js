import {
  buildLineAuthorizeUrl,
  createBindState,
  bindCookieOptions,
  sanitizeBindReturnTo,
} from "../../../lib/lineBindOAuth";
import {
  LINE_WELCOME_RETURN_COOKIE,
  LINE_WELCOME_STATE_COOKIE,
} from "../../../lib/lineGuestWelcomeVerify";

/**
 * POST /api/line/welcome-verify-prepare
 * 訪客套用 welcome 券前的 LINE OAuth（不需登入會員）
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
    const returnTo = sanitizeBindReturnTo(req.body?.returnTo || "/Cart/", "/Cart/");
    const state = createBindState();
    const proto =
      String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
      "http";
    const host =
      req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
    const redirectUri = `${proto}://${host}/api/line/welcome-verify-callback`;
    const opts = bindCookieOptions();

    res.setHeader("Set-Cookie", [
      `${LINE_WELCOME_STATE_COOKIE}=${encodeURIComponent(state)}; ${opts}`,
      `${LINE_WELCOME_RETURN_COOKIE}=${encodeURIComponent(returnTo)}; ${opts}`,
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
    console.error("[api/line/welcome-verify-prepare]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "準備 LINE 驗證失敗",
    });
  }
}
