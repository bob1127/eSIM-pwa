import {
  appendQuery,
  exchangeLineAuthCode,
} from "../../../lib/lineBindOAuth";
import { verifyLineIdToken } from "../../../lib/lineIdToken";
import {
  LINE_WELCOME_GUEST_COOKIE,
  LINE_WELCOME_RETURN_COOKIE,
  LINE_WELCOME_STATE_COOKIE,
  createLineGuestWelcomeTicket,
  welcomeGuestCookieOptions,
} from "../../../lib/lineGuestWelcomeVerify";

function parseCookie(req, name) {
  const raw = req.headers.cookie || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function clearOAuthCookies() {
  const expired = "Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
  return [
    `${LINE_WELCOME_STATE_COOKIE}=; ${expired}`,
    `${LINE_WELCOME_RETURN_COOKIE}=; ${expired}`,
  ];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).send("Method Not Allowed");
  }

  const clientId = (process.env.LINE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.LINE_CLIENT_SECRET || "").trim();
  const fallbackReturn = "/Cart/";

  const returnTo =
    parseCookie(req, LINE_WELCOME_RETURN_COOKIE) || fallbackReturn;
  const failRedirect = (msg, code = "verify_failed") =>
    res.redirect(
      302,
      appendQuery(returnTo, {
        line_welcome: "0",
        line_welcome_msg: msg,
        line_welcome_code: code,
      }),
    );

  const { code, state, error, error_description: errorDesc } = req.query || {};
  if (error) {
    res.setHeader("Set-Cookie", clearOAuthCookies());
    return failRedirect(errorDesc || String(error), String(error));
  }

  const savedState = parseCookie(req, LINE_WELCOME_STATE_COOKIE);
  if (!code || !state || !savedState || String(state) !== String(savedState)) {
    res.setHeader("Set-Cookie", clearOAuthCookies());
    return failRedirect("LINE 驗證狀態無效，請重試", "bad_state");
  }

  if (!clientId || !clientSecret) {
    res.setHeader("Set-Cookie", clearOAuthCookies());
    return failRedirect("伺服器尚未設定 LINE Login", "missing_config");
  }

  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
    "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const redirectUri = `${proto}://${host}/api/line/welcome-verify-callback`;

  try {
    const exchanged = await exchangeLineAuthCode({
      code: String(code),
      redirectUri,
      clientId,
      clientSecret,
    });
    if (!exchanged.ok || !exchanged.idToken) {
      res.setHeader("Set-Cookie", clearOAuthCookies());
      return failRedirect(exchanged.error || "LINE 授權失敗", "token_exchange");
    }

    const verified = await verifyLineIdToken(exchanged.idToken);
    if (!verified.ok || !verified.lineUserId) {
      res.setHeader("Set-Cookie", clearOAuthCookies());
      return failRedirect(verified.error || "LINE 身分驗證失敗", "id_token");
    }

    const ticket = createLineGuestWelcomeTicket(verified.lineUserId);
    if (!ticket) {
      res.setHeader("Set-Cookie", clearOAuthCookies());
      return failRedirect("無法建立驗證票券", "ticket");
    }

    const guestOpts = welcomeGuestCookieOptions();
    res.setHeader("Set-Cookie", [
      ...clearOAuthCookies(),
      `${LINE_WELCOME_GUEST_COOKIE}=${encodeURIComponent(ticket)}; ${guestOpts}`,
    ]);

    return res.redirect(
      302,
      appendQuery(returnTo, {
        line_welcome: "1",
      }),
    );
  } catch (err) {
    console.error("[api/line/welcome-verify-callback]", err);
    res.setHeader("Set-Cookie", clearOAuthCookies());
    return failRedirect(err.message || "LINE 驗證失敗", "exception");
  }
}
