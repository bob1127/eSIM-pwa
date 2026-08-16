import { loadCreatorProfile } from "../../../lib/creatorProfile";
import { resolveMemberEmail } from "../push/_memberAuth";
import { memberKeyFromAuth } from "../../../lib/blogCreator";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const key = String(req.query.key || "jeko").trim();
  const profile = await loadCreatorProfile(key, { postLimit: 16 });
  if (!profile) return res.status(404).json({ error: "找不到創作者" });

  let following = false;
  const member = await resolveMemberEmail(req, res);
  const memberKey = memberKeyFromAuth(member);
  if (memberKey) {
    const { data } = await supabaseAdmin
      .from("creator_follows")
      .select("id")
      .eq("creator_key", profile.key)
      .eq("member_key", memberKey)
      .maybeSingle();
    following = Boolean(data);
  }

  return res.status(200).json({ ...profile, following, loggedIn: Boolean(memberKey) });
}
