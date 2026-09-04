/**
 * GET|POST /api/cron/purge-chat-logs
 *
 * 刪除超過 TTL 的 chat_logs（預設 90 天，CHAT_LOGS_TTL_DAYS 可調 14～365）。
 * 授權：Vercel Cron header，或 Bearer / ?secret= CRON_SECRET / PUSH_INTERNAL_SECRET
 */
import { getSupabaseAdminServer } from "../../../lib/supabaseAdminServer";
import { getChatLogsTtlDays } from "../../../lib/chatLogFilter";

const CRON_SECRET =
  process.env.CRON_SECRET || process.env.PUSH_INTERNAL_SECRET || "";

/** 單次最多刪除筆數，避免逾時；可設 CHAT_LOGS_PURGE_BATCH */
const BATCH_LIMIT = Math.min(
  5000,
  Math.max(500, Number(process.env.CHAT_LOGS_PURGE_BATCH || 2000)),
);

export const config = {
  maxDuration: 60,
};

function isAuthorized(req) {
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const querySecret = req.query.secret;
  const vercelCron = req.headers["x-vercel-cron"] === "1";
  return (
    vercelCron ||
    (Boolean(CRON_SECRET) &&
      (bearer === CRON_SECRET || querySecret === CRON_SECRET))
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ttlDays = getChatLogsTtlDays();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ttlDays);
  const cutoffIso = cutoff.toISOString();

  try {
    const supabase = getSupabaseAdminServer();

    // 先查將刪的 id，再依 id 刪（避免 delete+select 回傳列數在部分環境不可靠）
    const { data: oldRows, error: selectErr } = await supabase
      .from("chat_logs")
      .select("id")
      .lt("created_at", cutoffIso)
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);

    if (selectErr) {
      console.error("[cron/purge-chat-logs] select", selectErr.message);
      return res.status(500).json({ error: selectErr.message });
    }

    const ids = (oldRows || []).map((r) => r.id).filter(Boolean);
    if (!ids.length) {
      return res.status(200).json({
        success: true,
        ttlDays,
        cutoff: cutoffIso,
        deleted: 0,
        hasMore: false,
      });
    }

    const { error: deleteErr } = await supabase
      .from("chat_logs")
      .delete()
      .in("id", ids);

    if (deleteErr) {
      console.error("[cron/purge-chat-logs] delete", deleteErr.message);
      return res.status(500).json({ error: deleteErr.message });
    }

    const hasMore = ids.length >= BATCH_LIMIT;
    console.info(
      `[cron/purge-chat-logs] deleted=${ids.length} ttlDays=${ttlDays} hasMore=${hasMore}`,
    );

    return res.status(200).json({
      success: true,
      ttlDays,
      cutoff: cutoffIso,
      deleted: ids.length,
      hasMore,
    });
  } catch (err) {
    console.error("[cron/purge-chat-logs]", err);
    return res.status(500).json({ error: err.message || "purge failed" });
  }
}
