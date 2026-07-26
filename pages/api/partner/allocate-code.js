import { createClient } from "@supabase/supabase-js";
import {
  allocateUniquePartnerCode,
  suggestCodeFromName,
} from "@/lib/partnerReferral";

const supabaseAdmin =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

/**
 * 申請流程：自動發放不重複的專屬推薦代碼（免申請人自行輸入）
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      message: "伺服器未設定 SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const preferredBase = suggestCodeFromName(req.body?.name || "");

  try {
    const code = await allocateUniquePartnerCode(supabaseAdmin, {
      preferredBase,
      forReferral: true,
    });
    return res.status(200).json({ success: true, code });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "無法產生專屬代碼",
    });
  }
}
