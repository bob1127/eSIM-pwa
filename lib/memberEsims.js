import { createClient } from "@supabase/supabase-js";
import { extractEsimsFromOrders } from "./esimOrderExtract";
import { lineUserIdToEmail } from "./lineAuth";

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

export async function fetchMemberEsims(email) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id, items, qrcode_data, status, created_at, customer_email")
    .eq("customer_email", email)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return extractEsimsFromOrders(orders || []);
}

export { lineUserIdToEmail } from "./lineAuth";

export async function fetchEsimsByLineUserId(lineUserId) {
  if (!lineUserId) return [];
  const email = lineUserIdToEmail(lineUserId);
  return fetchMemberEsims(email);
}
