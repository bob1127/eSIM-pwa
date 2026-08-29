/**
 * GET/PUT /api/admin/line-welcome
 * Boss：LINE 加好友歡迎文案／輪播圖卡
 */
import { requireMedusaAdminFromRequest } from "../../../lib/medusaAdminAuth";
import {
  describeLineWelcomeSettings,
  saveLineWelcomeSettings,
  DEFAULT_LINE_WELCOME_SETTINGS,
} from "../../../lib/lineWelcomeSettings";

export default async function handler(req, res) {
  const admin = await requireMedusaAdminFromRequest(req);
  if (!admin) {
    return res.status(401).json({ error: "需要 Medusa 管理員登入" });
  }

  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const desc = await describeLineWelcomeSettings();
      return res.status(200).json(desc);
    } catch (err) {
      return res.status(500).json({ error: err?.message || "讀取失敗" });
    }
  }

  if (req.method === "PUT" || req.method === "POST") {
    const body = req.body || {};
    if (body.reset) {
      const result = await saveLineWelcomeSettings(DEFAULT_LINE_WELCOME_SETTINGS);
      if (!result.ok) {
        return res.status(400).json({ error: result.message });
      }
      const desc = await describeLineWelcomeSettings();
      return res.status(200).json({ ok: true, ...desc });
    }

    const result = await saveLineWelcomeSettings(body.copy || body);
    if (!result.ok) {
      return res.status(400).json({ error: result.message });
    }
    const desc = await describeLineWelcomeSettings();
    return res.status(200).json({ ok: true, ...desc });
  }

  res.setHeader("Allow", ["GET", "PUT", "POST"]);
  return res.status(405).end("Method Not Allowed");
}
