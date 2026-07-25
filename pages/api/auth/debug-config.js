/**
 * GET /api/auth/debug-config
 * 正式環境需帶 Authorization: Bearer {ADMIN_SECRET|CRON_SECRET}
 */
import { authLog } from "../../../lib/authDebug";
import { PRODUCTION_SITE_URL, PRODUCTION_SITE_HOST } from "../../../lib/siteUrl";
import { assertDebugAccess } from "../../../lib/serverEnv";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!assertDebugAccess(req, res)) return;

  const nextAuthUrl = process.env.NEXTAUTH_URL || "(未設定)";
  const lineId = process.env.LINE_CLIENT_ID || "";
  const hasLineSecret = !!process.env.LINE_CLIENT_SECRET;
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "(未設定)";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  let anonKeyValid = false;
  let anonKeyError = null;
  if (supabaseUrl.startsWith("http") && anonKey) {
    try {
      const r = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/settings`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });
      anonKeyValid = r.ok;
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        anonKeyError = body.message || `HTTP ${r.status}`;
      }
    } catch (e) {
      anonKeyError = e.message;
    }
  }

  const report = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || "(本機)",
    nextAuthUrl,
    expectedLineCallback: nextAuthUrl.startsWith("http")
      ? `${nextAuthUrl.replace(/\/$/, "")}/api/auth/callback/line`
      : "(NEXTAUTH_URL 無效)",
    hasLineClientId: !!lineId,
    hasLineClientSecret: hasLineSecret,
    hasNextAuthSecret,
    hasSupabaseAnonKey: !!anonKey,
    anonKeyValid,
    anonKeyError,
    hasSupabaseServiceRole: hasServiceRole,
    checks: {
      nextAuthUrlOk:
        nextAuthUrl.startsWith(PRODUCTION_SITE_URL) ||
        nextAuthUrl.startsWith(`https://${PRODUCTION_SITE_HOST}`) ||
        nextAuthUrl.startsWith("http://localhost:3000"),
      lineKeysOk: !!lineId && hasLineSecret,
      supabaseOk:
        supabaseUrl.includes("supabase.co") &&
        hasServiceRole &&
        hasNextAuthSecret &&
        anonKeyValid,
    },
    productionSiteUrl: PRODUCTION_SITE_URL,
  };

  authLog("debug-config 被呼叫", {
    nodeEnv: report.nodeEnv,
    checks: report.checks,
  });
  return res.status(200).json(report);
}
