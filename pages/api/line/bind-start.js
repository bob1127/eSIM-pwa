import {
  LINE_BIND_RETURN_COOKIE,
  LINE_BIND_STATE_COOKIE,
  STATE_TTL_MS,
  buildLineAuthorizeUrl,
  createBindState,
  getBindCallbackAbsoluteUrl,
  sanitizeBindReturnTo,
} from "../../../lib/lineBindOAuth";

/**
 * GET /api/line/bind-start?returnTo=/Cart
 * 本機開發：導向 LINE Login 授權頁（不走 LIFF，避免被導回正式站）
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  const clientId = (process.env.LINE_CLIENT_ID || "").trim();
  if (!clientId) {
    return res.status(500).send("尚未設定 LINE_CLIENT_ID");
  }

  const returnTo = sanitizeBindReturnTo(
    typeof req.query.returnTo === "string" ? req.query.returnTo : "/account",
  );
  const state = createBindState();
  const redirectUri = getBindCallbackAbsoluteUrl(req);

  const cookieOpts = [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(STATE_TTL_MS / 1000)}`,
  ].join("; ");

  res.setHeader("Set-Cookie", [
    `${LINE_BIND_STATE_COOKIE}=${encodeURIComponent(state)}; ${cookieOpts}`,
    `${LINE_BIND_RETURN_COOKIE}=${encodeURIComponent(returnTo)}; ${cookieOpts}`,
  ]);

  const url = buildLineAuthorizeUrl({ clientId, redirectUri, state });
  return res.redirect(302, url);
}
