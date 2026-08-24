/**
 * GET/POST /api/admin/line-broadcast
 *
 * GET  ?resolveHandle= 可把商品填成可編輯卡片
 * POST {
 *   template: text | hero | text_hero | carousel | text_carousel
 *   title, body, url, lineUserId, secret,
 *   cardStyle, card, cards, imageUrl, productHandles
 * }
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { isLineBotConfigured, pushLineMessage } from "../../../lib/lineBot";
import { buildLineBroadcastMessages } from "../../../lib/lineBroadcastMessage";
import {
  fetchLineBroadcastProductCard,
  fetchLineBroadcastProducts,
  parseProductHandleList,
} from "../../../lib/lineBroadcastProducts";
import {
  LINE_CAROUSEL_PRESETS,
  LINE_HERO_DM_PRESETS,
} from "../../../lib/lineBroadcastPresets";
import {
  defaultLineCardStyle,
  sanitizeLineCard,
  sanitizeLineCards,
} from "../../../lib/lineBroadcastCard";

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

function buildPresetFallbackMap() {
  const map = {};
  for (const p of LINE_CAROUSEL_PRESETS) {
    map[p.handle] = {
      label: p.label,
      fallbackImage: p.fallbackImage,
      url: p.url,
    };
  }
  return map;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const resolveHandle = String(req.query?.resolveHandle || "").trim();
      if (resolveHandle) {
        const card = await fetchLineBroadcastProductCard(
          resolveHandle,
          buildPresetFallbackMap(),
        );
        if (!card) {
          return res.status(404).json({ error: "找不到商品" });
        }
        return res.status(200).json({ ok: true, card });
      }

      const supabase = getSupabaseAdminServer();
      const { count, error } = await supabase
        .from("line_oa_friends")
        .select("line_user_id", { count: "exact", head: true })
        .is("unfollowed_at", null);
      if (error) throw error;
      return res.status(200).json({
        ok: true,
        friendCount: count ?? 0,
        presets: {
          heroImages: LINE_HERO_DM_PRESETS,
          carouselProducts: LINE_CAROUSEL_PRESETS,
        },
        defaultStyles: {
          hero: defaultLineCardStyle("hero"),
          carousel: defaultLineCardStyle("carousel"),
        },
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
  const template = String(body.template || "text").toLowerCase();
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  const url = (body.card && body.card.url) || body.url || "/";
  const singleId = body.lineUserId ? String(body.lineUserId).trim() : null;
  const imageUrl = body.imageUrl ? String(body.imageUrl).trim() : "";
  const card = body.card ? sanitizeLineCard(body.card) : null;
  let cards = sanitizeLineCards(body.cards);
  const cardStyle = body.cardStyle || null;

  if (template === "text" && (!title || !text)) {
    return res.status(400).json({ error: "純文字模式需填標題與內容" });
  }
  if (template === "text_hero" && !title && !text) {
    return res.status(400).json({ error: "文字＋DM 需填前導標題或內容" });
  }
  if (template === "text_carousel" && !title && !text) {
    return res.status(400).json({ error: "文字＋輪播需填前導標題或內容" });
  }
  if (template === "hero" || template === "text_hero") {
    const img = card?.imageUrl || imageUrl;
    if (!img) return res.status(400).json({ error: "DM 卡片需填圖片網址" });
  }
  if (template === "carousel" || template === "text_carousel") {
    if (!cards.length && parseProductHandleList(body.productHandles).length) {
      const products = await fetchLineBroadcastProducts(
        parseProductHandleList(body.productHandles),
        buildPresetFallbackMap(),
      );
      cards = products.map((p) =>
        sanitizeLineCard({
          title: p.title,
          subtitle: p.priceLabel,
          imageUrl: p.imageUrl,
          url: p.url,
          buttonLabel: "查看商品",
        }),
      );
    }
    if (!cards.length) {
      return res.status(400).json({ error: "輪播至少需要 1 張可編輯卡片" });
    }
  }

  try {
    const messages = buildLineBroadcastMessages({
      template,
      title,
      body: text,
      url,
      imageUrl,
      cards,
      card,
      cardStyle,
    });

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
      template,
      total: friends.length,
      sent,
      failed,
      productCount: cards.length || undefined,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "LINE 廣播失敗",
    });
  }
}
