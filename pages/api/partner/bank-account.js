import {
  getAuthUserFromBearer,
  getSupabaseAdmin,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { sanitizeBankPayload } from "../../../lib/partnerPayout";

const SELECT_FULL =
  "payout_method, bank_name, bank_code, branch_name, account_name, account_number, payout_note, updated_at";
const SELECT_BASIC =
  "bank_name, bank_code, branch_name, account_name, account_number, updated_at";

async function selectBank(supabase, partnerId) {
  let { data, error } = await supabase
    .from("partner_bank_accounts")
    .select(SELECT_FULL)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error && /payout_method|payout_note|column/i.test(error.message || "")) {
    ({ data, error } = await supabase
      .from("partner_bank_accounts")
      .select(SELECT_BASIC)
      .eq("partner_id", partnerId)
      .maybeSingle());
    if (data) {
      data = { ...data, payout_method: "tw_bank", payout_note: "" };
    }
  }
  return { data, error };
}

async function upsertBank(supabase, partnerId, value) {
  let { data, error } = await supabase
    .from("partner_bank_accounts")
    .upsert({ partner_id: partnerId, ...value }, { onConflict: "partner_id" })
    .select(SELECT_FULL)
    .single();

  if (error && /payout_method|payout_note|column/i.test(error.message || "")) {
    const {
      payout_method: _m,
      payout_note: _n,
      ...basic
    } = value;
    ({ data, error } = await supabase
      .from("partner_bank_accounts")
      .upsert(
        { partner_id: partnerId, ...basic },
        { onConflict: "partner_id" },
      )
      .select(SELECT_BASIC)
      .single());
    if (data) {
      data = {
        ...data,
        payout_method: value.payout_method || "tw_bank",
        payout_note: value.payout_note || "",
      };
      if (value.payout_method && value.payout_method !== "tw_bank") {
        // 欄位尚未 migration：提示但仍儲存基礎欄位
        return {
          data,
          error: null,
          warning:
            "已儲存基本帳戶資料；「收款方式」欄位需執行 migration 20260810 後才會完整保存。",
        };
      }
    }
  }
  return { data, error, warning: null };
}

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
    const { data, error } = await selectBank(supabase, partnerId);
    if (error && !/does not exist|schema cache/i.test(error.message || "")) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ bank: data || null });
  }

  const check = sanitizeBankPayload(req.body || {});
  if (!check.ok) return res.status(400).json({ error: check.error });

  const { data, error, warning } = await upsertBank(
    supabase,
    partnerId,
    check.value,
  );

  if (error) {
    if (/does not exist|schema cache/i.test(error.message || "")) {
      return res.status(503).json({
        error: "提領功能資料表尚未建立，請先執行 migration 20260802e",
      });
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ bank: data, warning: warning || undefined });
}
