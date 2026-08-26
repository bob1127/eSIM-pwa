/**
 * 結帳時若已登入 LINE／Supabase，把「當場填的真實 Email」自動綁到該身分，
 * 之後用 LINE 登入即可查到該 Email 的訂單（不必再走 OTP 認領）。
 *
 * 僅用於「本人當下登入結帳並自行填寫」的 Email，不可用於認領他人信箱。
 */
import { createClient } from "@supabase/supabase-js";
import { isLineSyntheticEmail } from "./lineAuth";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * @param {{
 *   email?: string|null,
 *   lineUserId?: string|null,
 *   supabaseUserId?: string|null,
 * }} args
 */
export async function linkCheckoutEmailToMember({
  email,
  lineUserId,
  supabaseUserId,
} = {}) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { ok: false, reason: "bad_email" };
  }
  if (isLineSyntheticEmail(normalized)) {
    return { ok: false, reason: "synthetic_email" };
  }

  const lineId = String(lineUserId || "").trim();
  const supabaseId = String(supabaseUserId || "").trim();
  if (!lineId && !supabaseId) {
    return { ok: false, reason: "no_subject" };
  }

  const supabase = getAdmin();
  if (!supabase) return { ok: false, reason: "no_supabase" };

  const rows = [];
  if (supabaseId) {
    rows.push({
      subject_type: "supabase",
      subject_id: supabaseId,
      email: normalized,
    });
  }
  if (lineId) {
    rows.push({
      subject_type: "line",
      subject_id: lineId,
      email: normalized,
    });
  }

  for (const r of rows) {
    const { data: ex } = await supabase
      .from("member_claimed_emails")
      .select("id")
      .eq("subject_type", r.subject_type)
      .eq("subject_id", r.subject_id)
      .eq("email", r.email)
      .maybeSingle();
    if (!ex) {
      const { error } = await supabase.from("member_claimed_emails").insert(r);
      if (error && error.code !== "23505") throw error;
    }
  }

  if (supabaseId) {
    try {
      const { data: u } = await supabase.auth.admin.getUserById(supabaseId);
      const prev = u?.user?.user_metadata || {};
      const list = Array.isArray(prev.linked_order_emails)
        ? prev.linked_order_emails.map((e) => String(e).toLowerCase())
        : [];
      if (!list.includes(normalized)) {
        await supabase.auth.admin.updateUserById(supabaseId, {
          user_metadata: {
            ...prev,
            linked_order_emails: [...list, normalized],
            ...(lineId ? { line_id: prev.line_id || lineId } : {}),
          },
        });
      }
    } catch {
      /* 非關鍵 */
    }
  }

  return { ok: true, email: normalized };
}
