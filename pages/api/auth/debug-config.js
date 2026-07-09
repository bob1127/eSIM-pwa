/**
 * GET /api/auth/debug-config
 * 檢查 NextAuth / LINE / Supabase 環境（不輸出完整 secret）
 */
import { authLog } from "../../../lib/authDebug";
import { PRODUCTION_SITE_URL, PRODUCTION_SITE_HOST } from "../../../lib/siteUrl";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
    vercelUrl: process.env.VERCEL_URL || "(本機)",
    nextAuthUrl,
    expectedLineCallback: nextAuthUrl.startsWith("http")
      ? `${nextAuthUrl.replace(/\/$/, "")}/api/auth/callback/line`
      : "(NEXTAUTH_URL 無效，無法推算 callback)",
    lineClientIdPrefix: lineId ? `${lineId.slice(0, 6)}...` : "(未設定)",
    hasLineClientId: !!lineId,
    hasLineClientSecret: hasLineSecret,
    hasNextAuthSecret,
    supabaseUrl,
    hasSupabaseAnonKey: !!anonKey,
    anonKeyPrefix: anonKey ? `${anonKey.slice(0, 18)}...` : "(未設定)",
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
    hint: anonKeyValid
      ? `LINE Developers 必須登記 expectedLineCallback；正式站 NEXTAUTH_URL=${PRODUCTION_SITE_URL}`
      : "NEXT_PUBLIC_SUPABASE_ANON_KEY 無效或未更新！請到 Supabase → Jeko-eSIM → Settings → API 複製 anon/publishable key 到 .env.local，然後重啟 npm run dev",
  };

  authLog("debug-config 被呼叫", report);
  return res.status(200).json(report);
}
