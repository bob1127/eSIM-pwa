import { createClient } from "@supabase/supabase-js";
import { extractEsimsFromOrders } from "./esimOrderExtract";
import { lineUserIdToEmail } from "./lineAuth";
import { fetchMedusaMemberOrders } from "./medusaMemberOrders";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin credentials not configured");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeEmails(emails) {
  const set = new Set();
  for (const e of emails || []) {
    if (!e) continue;
    set.add(String(e).trim().toLowerCase());
  }
  return [...set];
}

function mergeEsimLists(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const e of list || []) {
      const key = e?.topupId
        ? String(e.topupId)
        : e?.iccid
          ? `iccid:${e.iccid}`
          : null;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(e);
    }
  }
  return out.sort(
    (a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0),
  );
}

async function fetchSupabaseOrdersByEmails(emails) {
  const list = normalizeEmails(emails);
  if (!list.length) return [];
  const supabaseAdmin = getSupabaseAdmin();
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, items, qrcode_data, status, created_at, customer_email")
    .in("customer_email", list)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return orders || [];
}

/**
 * 合併 Medusa（主站已出貨 esim_qrcodes）+ Supabase 夥伴／舊單，抽出可監控 eSIM。
 * @param {{ emails?: string[], lineUserId?: string|null, supabaseUserId?: string|null }} identity
 */
export async function fetchMemberEsimsForIdentity(identity = {}) {
  const emails = normalizeEmails(identity.emails || []);
  const lineUserId = identity.lineUserId
    ? String(identity.lineUserId)
    : null;
  const supabaseUserId = identity.supabaseUserId
    ? String(identity.supabaseUserId)
    : null;

  const [supabaseOrders, medusaOrders] = await Promise.all([
    emails.length ? fetchSupabaseOrdersByEmails(emails) : Promise.resolve([]),
    fetchMedusaMemberOrders({ emails, lineUserId, supabaseUserId }),
  ]);

  const fromSupabase = extractEsimsFromOrders(supabaseOrders);
  const fromMedusa = extractEsimsFromOrders(medusaOrders);
  return mergeEsimLists(fromMedusa, fromSupabase);
}

/** 相容舊呼叫：單一 email → 含該 email 的 Medusa + Supabase */
export async function fetchMemberEsims(email) {
  if (!email) return [];
  return fetchMemberEsimsForIdentity({
    emails: [String(email).toLowerCase()],
  });
}

export { lineUserIdToEmail } from "./lineAuth";

export async function fetchEsimsByLineUserId(lineUserId) {
  if (!lineUserId) return [];
  const emails = [lineUserIdToEmail(lineUserId)];

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: links } = await supabaseAdmin
      .from("line_account_links")
      .select("email")
      .eq("line_user_id", String(lineUserId));
    for (const l of links || []) {
      if (l?.email) emails.push(String(l.email).toLowerCase());
    }

    const { data: claimed } = await supabaseAdmin
      .from("member_claimed_emails")
      .select("email")
      .eq("subject_type", "line")
      .eq("subject_id", String(lineUserId));
    for (const c of claimed || []) {
      if (c?.email) emails.push(String(c.email).toLowerCase());
    }
  } catch (e) {
    console.warn(
      "[memberEsims] 擴充 LINE 關聯 email 失敗（略過）:",
      e?.message || e,
    );
  }

  return fetchMemberEsimsForIdentity({
    emails,
    lineUserId: String(lineUserId),
  });
}
