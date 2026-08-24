/**
 * GET/POST /api/admin/line-broadcast
 * Boss：廣播日常訊息給官方 LINE 好友（類似 /api/send-push）
 *
 * POST { title, body, url?, lineUserId?, secret? }
 * secret 可替代 Medusa 登入（與 PUSH_INTERNAL_SECRET 相同，供 /admin/push 使用）
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { isLineBotConfigured, pushLineMessage } from "../../../lib/lineBot";
import { buildLineBroadcastMessages } from "../../../lib/lineBroadcastMessage";

const INTERNAL_SECRET = process.env.PUSH_INTERNAL_SECRET || "";
const BATCH = 5;

async function authorize(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (admin) return true;

  const secret = String(req.body?.secret || req.query?.secret || "").trim();
  if (INTERNAL_SECRET && INTERNAL_SECRET.length >= 24 && secret === INTERNAL_SECRET) {
    return true;
  }

  res.status(401).json({ error: "需要 Medusa 管理員登入或正確內部密鑰" });
  return false;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const supabase = getSupabaseAdminServer();
      const { count, error } = await supabase
        .from("line_oa_friends")
        .select("line_user_id", { count: "exact", head: true })
        .is("unfollowed_at", null);
      if (error) throw error;
      return res.status(200).json({
        ok: true,
        friendCount: count ?? 0,
      });
    } catch (err) {
      return res.status(500).json({ error: err?.message || "讀取失敗" });
    }
  }

  if (!(await authorize(req, res))) return;

  if (!isLineBotConfigured()) {
    return res.status(503).json({ error: "LINE Messaging API 未設定" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const body = req.body || {};
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  const url = body.url || "/";
  const singleId = body.lineUserId ? String(body.lineUserId).trim() : null;

  if (!title || !text) {
    return res.status(400).json({ error: "缺少 title 或 body" });
  }

  try {
    const supabase = getSupabaseAdminServer();
    let friends = [];

    if (singleId) {
      friends = [{ line_user_id: singleId, display_name: null }];
    } else {
      const { data, error } = await supabase
        .from("line_oa_friends")
        .select("line_user_id, display_name")
        .is("unfollowed_at", null)
        .order("followed_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      friends = data || [];
    }

    if (!friends.length) {
      return res.status(200).json({
        success: true,
        total: 0,
        sent: 0,
        failed: 0,
        message: "無 LINE 好友可推播",
      });
    }

    const messages = buildLineBroadcastMessages({ title, body: text, url });
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < friends.length; i += BATCH) {
      const chunk = friends.slice(i, i + BATCH);
      await Promise.all(
        chunk.map(async (f) => {
          try {
            await pushLineMessage(f.line_user_id, messages);
            sent++;
          } catch (err) {
            failed++;
            if (errors.length < 5) {
              errors.push({
                lineUserId: f.line_user_id,
                error: err?.message || "push failed",
              });
            }
          }
        }),
      );
    }

    return res.status(200).json({
      success: true,
      total: friends.length,
      sent,
      failed,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "LINE 廣播失敗",
    });
  }
}
