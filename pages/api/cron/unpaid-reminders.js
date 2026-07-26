/**
 * GET|POST /api/cron/unpaid-reminders
 *
 * 掃描待付款訂單，依 1h / 12h / 23h 節奏發送 Email + LINE + Web Push 提醒。
 * 授權：Vercel Cron header、Bearer CRON_SECRET、或 ?secret=
 */
import { runUnpaidOrderReminders } from "../../../lib/orderNotify";

const CRON_SECRET =
  process.env.CRON_SECRET ||
  process.env.PUSH_INTERNAL_SECRET ||
  "";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const querySecret = req.query.secret;
  const vercelCron = req.headers["x-vercel-cron"] === "1";

  const authorized =
    vercelCron ||
    (CRON_SECRET && (bearer === CRON_SECRET || querySecret === CRON_SECRET));

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await runUnpaidOrderReminders();
    if (!result.ok) {
      return res.status(500).json(result);
    }
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/unpaid-reminders]", err);
    return res.status(500).json({ error: err.message });
  }
}
