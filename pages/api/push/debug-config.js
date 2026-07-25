/**
 * GET /api/push/debug-config
 * 正式環境需帶 Authorization: Bearer {ADMIN_SECRET|CRON_SECRET}
 */
import { assertDebugAccess } from "../../../lib/serverEnv";

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!assertDebugAccess(req, res)) return;

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";

  const checks = {
    vapidPublicOk: pub.length > 20,
    vapidPrivateOk: priv.length > 20,
    vapidPairLikelyOk: pub.length > 20 && priv.length > 20,
    supabaseUrlOk: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceOk: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  return res.status(200).json({
    ok: Object.values(checks).every(Boolean),
    checks,
    vapidPublicPrefix: pub.slice(0, 12) || null,
    vapidPublicLength: pub.length,
    vapidPrivateLength: priv.length,
    supabaseUrlHost: (() => {
      try {
        return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
      } catch {
        return null;
      }
    })(),
    nodeEnv: process.env.NODE_ENV,
  });
}
