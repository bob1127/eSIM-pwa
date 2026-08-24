import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * POST /api/push/unbind
 * 取消流量提醒綁定（一次僅一張；解綁後可再選其他 eSIM）
 * body: { endpoint }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const { endpoint } = req.body ?? {};
  if (!endpoint) {
    return res.status(400).json({ error: "缺少推播 endpoint" });
  }

  const { data: existing, error: findErr } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, monitor_enabled, topup_id, product_label")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (findErr) {
    return res.status(500).json({ error: "查詢失敗", detail: findErr.message });
  }
  if (!existing) {
    return res.status(404).json({ error: "找不到推播訂閱" });
  }

  const { error: updateErr } = await supabaseAdmin
    .from("push_subscriptions")
    .update({
      monitor_enabled: false,
      topup_id: null,
      product_label: null,
      iccid: null,
      order_id: null,
      bind_method: null,
      iccid_bound_at: null,
    })
    .eq("endpoint", endpoint);

  if (updateErr) {
    return res.status(500).json({
      error: "取消綁定失敗",
      detail: updateErr.message,
    });
  }

  return res.status(200).json({
    success: true,
    message: "已取消綁定。可再選擇另一張 eSIM 綁定流量提醒。",
  });
}
