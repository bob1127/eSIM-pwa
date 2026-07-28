import { createClient } from "@supabase/supabase-js";
import { normalizeReferralCode } from "../../../lib/partnerReferral";
import { buildSetSignedReferralCookieHeader } from "../../../lib/referralSignature";

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
  if (!supabaseAdmin) {
    return res.status(500).json({ error: "未設定 Supabase" });
  }

  const code = normalizeReferralCode(req.body?.code || "");
  if (!code) {
    return res.status(400).json({ error: "缺少推薦代碼" });
  }

  const { data: partner } = await supabaseAdmin
    .from("partners")
    .select("id, referral_code, status, cooperation_model")
    .eq("referral_code", code)
    .eq("status", "active")
    .eq("cooperation_model", "referral")
    .maybeSingle();

  if (!partner) {
    return res.status(404).json({ ok: false, error: "無效推薦代碼" });
  }

  await supabaseAdmin.from("referral_clicks").insert([
    {
      partner_id: partner.id,
      referral_code: code,
      landing_path: String(req.body?.landing_path || "").slice(0, 500) || null,
      user_agent: String(req.headers["user-agent"] || "").slice(0, 300) || null,
    },
  ]);

  // 由伺服器簽發 HttpOnly Cookie（含首次點擊時間 + HMAC 簽章）。
  // 前端 JS 無法讀寫此 Cookie，也無法偽造時間戳延長 30 天效期；
  // 下單時後端只信任這顆 Cookie 驗證後的結果，見 lib/referralSignature.js。
  const setCookie = buildSetSignedReferralCookieHeader(code);
  if (setCookie) {
    res.setHeader("Set-Cookie", setCookie);
  }

  return res.status(200).json({ ok: true, partner_id: partner.id });
}
