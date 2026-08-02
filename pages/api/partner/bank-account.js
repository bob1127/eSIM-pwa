import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { sanitizeBankPayload } from "../../../lib/partnerPayout";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).end("Method Not Allowed");
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(500).json({ error: "伺服器設定不完整" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) return res.status(401).json({ error: "請先登入" });

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.partner) {
    return res.status(403).json({ error: access.message || "無夥伴權限" });
  }

  const partnerId = access.partner.id;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("partner_bank_accounts")
      .select(
        "bank_name, bank_code, branch_name, account_name, account_number, updated_at",
      )
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (error && !/does not exist|schema cache/i.test(error.message || "")) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ bank: data || null });
  }

  const check = sanitizeBankPayload(req.body || {});
  if (!check.ok) return res.status(400).json({ error: check.error });

  const { data, error } = await supabase
    .from("partner_bank_accounts")
    .upsert(
      { partner_id: partnerId, ...check.value },
      { onConflict: "partner_id" },
    )
    .select(
      "bank_name, bank_code, branch_name, account_name, account_number, updated_at",
    )
    .single();

  if (error) {
    if (/does not exist|schema cache/i.test(error.message || "")) {
      return res.status(503).json({
        error: "提領功能資料表尚未建立，請先執行 migration 20260802e",
      });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ bank: data });
}
