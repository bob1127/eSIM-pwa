/**
 * POST /api/admin/clear-chat-cache
 * 清除 J寶 商品與文章知識庫快取，讓下一次對話立即讀取最新資料。
 * 需要 ?secret=<ADMIN_SECRET> 保護。
 */
import { clearProductKnowledgeCache } from "../../../lib/chatProducts";
import { clearArticleKnowledgeCache } from "../../../lib/chatArticles";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret || req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }

  clearProductKnowledgeCache();
  clearArticleKnowledgeCache();
  return res.status(200).json({ ok: true, message: "商品/文章知識庫快取已清除" });
}
