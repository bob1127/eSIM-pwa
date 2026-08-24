/**
 * GET /api/cron/check-traffic
 *
 * Vercel Cron 檢查已綁定 eSIM 的剩餘流量，偏低時發 Web Push + LINE 推播。
 * 排程見 esim-store-front/vercel.json（目前每 10 分鐘，cron: *\/10）。
 *
 * 授權：Vercel Cron header（x-vercel-cron），或 Bearer / ?secret= CRON_SECRET
 * （無硬編碼 fallback；未設密鑰時僅允許 Vercel Cron）
 */
import { runTrafficMonitor } from "../../../lib/trafficMonitor";

const CRON_SECRET =
  process.env.CRON_SECRET || process.env.PUSH_INTERNAL_SECRET || "";

/** Pro：單次最多跑 5 分鐘，避免監控人數變多時被預設時限砍斷 */
export const config = {
  maxDuration: 300,
};

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
    (Boolean(CRON_SECRET) &&
      (bearer === CRON_SECRET || querySecret === CRON_SECRET));

  if (!authorized) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await runTrafficMonitor();
    if (!result.ok) {
      return res.status(500).json(result);
    }
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/check-traffic]", err);
    return res.status(500).json({ error: err.message });
  }
}
