/**
 * 公開 API：彙總各商品購買次數（供 Hero「選擇國家方案」排序）
 * 僅回傳 handle / name → count，不含訂單細節。
 */
import { getSupabaseAdminServer } from "@/lib/supabaseAdminServer";
import { isSettledOrderStatus } from "@/lib/refundPolicy";
import { parseItemDetails } from "@/lib/partnerAnalytics";

function bump(map, key, qty = 1) {
  const k = String(key || "")
    .trim()
    .toLowerCase();
  if (!k) return;
  map[k] = (map[k] || 0) + Math.max(1, Number(qty) || 1);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const supabase = getSupabaseAdminServer();
    const { data: orders, error } = await supabase
      .from("orders")
      .select("status, item_details")
      .order("created_at", { ascending: false })
      .limit(3000);

    if (error) {
      console.warn("[hero-product-ranks]", error.message);
      return res.status(200).json({ byHandle: {}, byName: {} });
    }

    const byHandle = {};
    const byName = {};

    for (const order of orders || []) {
      if (!isSettledOrderStatus(order.status)) continue;
      const items = parseItemDetails(order);
      for (const item of items) {
        const qty = item.quantity ?? item.qty ?? 1;
        bump(byHandle, item.handle || item.slug, qty);
        bump(byName, item.name || item.title, qty);
      }
    }

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600",
    );
    return res.status(200).json({ byHandle, byName });
  } catch (err) {
    console.warn("[hero-product-ranks] fail:", err?.message || err);
    return res.status(200).json({ byHandle: {}, byName: {} });
  }
}
