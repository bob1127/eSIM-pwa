/**
 * 本機開發用：以 LINE Login OAuth（非 LIFF）完成綁定導回。
 * LIFF Endpoint 固定為正式站時，liff.login() 會被導去 jeko-esim.com.tw。
 *
 * Google／Supabase 登入的 access token 只在瀏覽器 Authorization header，
 * LINE OAuth 回呼時伺服器讀不到 → 授權前先寫入簽章會員票券 cookie。
 */
import crypto from "crypto";

export const LINE_BIND_STATE_COOKIE = "jeko_line_bind_state";
export const LINE_BIND_RETURN_COOKIE = "jeko_line_bind_return";
export const LINE_BIND_MEMBER_COOKIE = "jeko_line_bind_member";

const STATE_TTL_MS = 10 * 60 * 1000;

export function isLocalDevHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

/** 只允許站內相對路徑，避免 open redirect */
export function sanitizeBindReturnTo(raw, fallback = "/account") {
  if (!raw || typeof raw !== "string") return fallback;
  let path = raw.trim();
  try {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      const u = new URL(path);
      if (!isLocalDevHost(u.hostname)) return fallback;
      path = `${u.pathname}${u.search || ""}`;
    }
  } catch {
    return fallback;
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  try {
    const u = new URL(path, "http://local.invalid");
    u.searchParams.delete("line_bind");
    u.searchParams.delete("line_bind_msg");
    u.searchParams.delete("line_bind_code");
    u.searchParams.delete("line_friend");
    path = `${u.pathname}${u.search}`;
  } catch {
    /* keep */
  }
  return path;
}

export function createBindState() {
  return crypto.randomBytes(24).toString("hex");
}

function ticketSecret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "jeko-line-bind-dev"
  );
}

/** 簽章會員票券（短效），供 OAuth 回呼還原「誰要綁定」 */
export function createMemberBindTicket(member) {
  const payload = {
    email: String(member?.email || "").toLowerCase(),
    userId: member?.userId || null,
    source: member?.source || "supabase",
    exp: Date.now() + STATE_TTL_MS,
  };
  if (!payload.email) return null;
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = crypto
    .createHmac("sha256", ticketSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyMemberBindTicket(ticket) {
  if (!ticket || typeof ticket !== "string") return null;
  const i = ticket.lastIndexOf(".");
  if (i <= 0) return null;
  const body = ticket.slice(0, i);
  const sig = ticket.slice(i + 1);
  const expected = crypto
    .createHmac("sha256", ticketSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload?.email || !payload?.exp || Date.now() > payload.exp) {
      return null;
    }
    return {
      email: String(payload.email).toLowerCase(),
      userId: payload.userId || null,
      source: payload.source === "line" ? "line" : "supabase",
      lineUserId: null,
    };
  } catch {
    return null;
  }
}

export function getBindCallbackAbsoluteUrl(req) {
  const proto =
    String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() ||
    "http";
  const host =
    req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  return `${proto}://${host}/api/line/bind-callback`;
}

export function buildLineAuthorizeUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "openid profile",
    nonce: crypto.randomBytes(16).toString("hex"),
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params}`;
}

export async function exchangeLineAuthCode({
  code,
  redirectUri,
  clientId,
  clientSecret,
}) {
  const res = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) {
    return {
      ok: false,
      error: data.error_description || data.error || `http_${res.status}`,
    };
  }
  return { ok: true, idToken: data.id_token, accessToken: data.access_token };
}

export function appendQuery(path, params) {
  const u = new URL(path, "http://local.invalid");
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") u.searchParams.set(k, String(v));
  });
  return `${u.pathname}${u.search}`;
}

export function bindCookieOptions() {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(STATE_TTL_MS / 1000)}`,
  ].join("; ");
}

export { STATE_TTL_MS };
