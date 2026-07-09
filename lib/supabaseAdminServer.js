import { createClient } from "@supabase/supabase-js";

/** 僅供 getServerSideProps / API 使用的 service role client */
export function getSupabaseAdminServer() {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdminServer is server-only");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
