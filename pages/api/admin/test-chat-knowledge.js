/**
 * GET /api/admin/test-chat-knowledge?secret=<CRON_SECRET>
 * 診斷：顯示 J寶 知識庫現在能讀到什麼資料
 * 可加 &q=關鍵字 &refresh=1
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import {
  fetchArticleKnowledgeByQuery,
  clearArticleKnowledgeCache,
  getArticleKnowledgeCacheInfo,
} from "../../../lib/chatArticles";

export default async function handler(req, res) {
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const result = {};

  // ── 1. Supabase products ────────────────────────────────────────────────
  try {
    const supabase = getSupabaseAdminServer();
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, description, handle")
      .order("created_at", { ascending: true });

    const { data: variations, error: varErr } = await supabase
      .from("product_variations")
      .select("product_id, sku, b2b_price, attributes")
      .order("b2b_price", { ascending: true });

    result.supabase = {
      productCount: products?.length ?? 0,
      variationCount: variations?.length ?? 0,
      products: products ?? [],
      productError: prodErr?.message ?? null,
      variationError: varErr?.message ?? null,
    };
  } catch (e) {
    result.supabase = { error: e.message };
  }

  // ── 2. Medusa products（若有設定）─────────────────────────────────────
  const medusaUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  if (medusaUrl && pubKey) {
    try {
      const r = await fetch(`${medusaUrl}/store/products?limit=50`, {
        headers: {
          "x-publishable-api-key": pubKey,
          "Content-Type": "application/json",
        },
      });
      if (r.ok) {
        const d = await r.json();
        result.medusa = {
          productCount: d.products?.length ?? 0,
          products: (d.products || []).map((p) => ({
            id: p.id,
            title: p.title,
            handle: p.handle,
            status: p.status,
          })),
        };
      } else {
        result.medusa = { error: `HTTP ${r.status}` };
      }
    } catch (e) {
      result.medusa = { error: e.message };
    }
  } else {
    result.medusa = { skipped: "NEXT_PUBLIC_MEDUSA_BACKEND_URL 未設定" };
  }

  // ── 3. WordPress 文章知識庫（動態全量）──────────────────────────────
  try {
    if (req.query.refresh === "1") clearArticleKnowledgeCache();
    const q = String(req.query.q || "飛中國 行動電源").trim();
    const sample = await fetchArticleKnowledgeByQuery(q, 2);
    result.wordpressArticles = {
      cache: getArticleKnowledgeCacheInfo(),
      sampleQuery: q,
      hasRelevant: sample?.hasRelevant,
      strongCoverage: sample?.strongCoverage,
      topScore: sample?.topScore,
      samplePreview: String(sample?.text || "").slice(0, 1200),
      sampleLength: String(sample?.text || "").length,
    };
  } catch (e) {
    result.wordpressArticles = { error: e.message };
  }

  return res.status(200).json(result);
}
