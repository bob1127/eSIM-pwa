/**
 * 訪客結帳：以 LINE Login / LIFF 驗證身分套用 welcome 券（不需註冊會員）
 */
import crypto from "crypto";
import { verifyLineIdToken } from "./lineIdToken";

export const LINE_WELCOME_GUEST_COOKIE = "jeko_line_welcome_guest";
export const LINE_WELCOME_STATE_COOKIE = "jeko_line_welcome_state";
export const LINE_WELCOME_RETURN_COOKIE = "jeko_line_welcome_return";

const TICKET_TTL_MS = 30 * 60 * 1000;

function ticketSecret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "jeko-line-welcome-guest"
  );
}

export function createLineGuestWelcomeTicket(lineUserId) {
  const id = String(lineUserId || "").trim();
  if (!id) return null;
  const payload = {
    lineUserId: id,
    exp: Date.now() + TICKET_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", ticketSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyLineGuestWelcomeTicket(ticket) {
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
    if (!payload?.lineUserId || !payload?.exp || Date.now() > payload.exp) {
      return null;
    }
    return { lineUserId: String(payload.lineUserId) };
  } catch {
    return null;
  }
}

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

/**
 * 從 LIFF id token 或 HttpOnly 訪客票券解析已驗證的 LINE userId
 */
export async function resolveVerifiedLineGuest(req, { lineIdToken } = {}) {
  const token = String(lineIdToken || "").trim();
  if (token) {
    const verified = await verifyLineIdToken(token);
    if (verified.ok) {
      return {
        ok: true,
        lineUserId: verified.lineUserId,
        via: "id_token",
      };
    }
    return { ok: false, error: verified.error || "LINE 驗證失敗" };
  }

  const ticket = parseCookie(req, LINE_WELCOME_GUEST_COOKIE);
  const parsed = verifyLineGuestWelcomeTicket(ticket);
  if (parsed?.lineUserId) {
    return {
      ok: true,
      lineUserId: parsed.lineUserId,
      via: "guest_cookie",
    };
  }

  return { ok: false, error: "need_line_verify" };
}

export function welcomeGuestCookieOptions() {
  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(TICKET_TTL_MS / 1000)}`,
  ].join("; ");
}
