/**
 * POST /api/orders/notify-status
 *
 * 內部／藍新／Medusa webhook 串接後呼叫：依訂單狀態即時通知客戶。
 * Body: { secret, orderId, eventType, force? }
 * eventType: unpaid_created | unpaid_reminder | paid | fulfilled | cancelled | refunded
 */
import { notifyByOrderId } from "../../../lib/orderNotify";

const SECRET =
  process.env.CRON_SECRET ||
  process.env.PUSH_INTERNAL_SECRET ||
  process.env.ADMIN_SECRET ||
  "";

const ALLOWED = new Set([
  "unpaid_created",
  "unpaid_reminder",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { secret, orderId, eventType, force } = req.body || {};
  if (!SECRET || secret !== SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!orderId || !ALLOWED.has(String(eventType))) {
    return res.status(400).json({
      error: "缺少 orderId 或 eventType 無效",
      allowed: [...ALLOWED],
    });
  }

  try {
    const result = await notifyByOrderId(orderId, eventType, {
      force: !!force,
    });
    if (!result.ok) {
      return res.status(400).json(result);
    }
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[orders/notify-status]", err);
    return res.status(500).json({ error: err.message });
  }
}
