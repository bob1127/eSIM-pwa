/**
 * On-demand ISR：給 Medusa 後台（product create/update/delete）呼叫。
 *
 * POST /api/revalidate
 * Header: X-Revalidate-Secret: <REVALIDATE_SECRET 或 FULFILLMENT_INTERNAL_SECRET>
 * Body:
 *   { paths: string[] } 或 { path: string }
 *   可選目錄同步（主站下架／刪除 → 暫停所有夥伴上架）：
 *   {
 *     medusa_product_id: "prod_xxx",
 *     event: "unpublish" | "delete" | "publish",
 *     paths?: string[]
 *   }
 *
 * 本站 trailingSlash: true，路徑會正規成尾斜線（例如 /product/）。
 */
import { createClient } from "@supabase/supabase-js";
import {
  markMedusaProductOffCatalog,
  syncCatalogAvailability,
  CATALOG_STATUS,
} from "../../lib/partnerCatalogAvailability";

function getExpectedSecret() {
  return (
    process.env.REVALIDATE_SECRET ||
    process.env.FULFILLMENT_INTERNAL_SECRET ||
    ""
  );
}

function normalizePath(path) {
  if (!path || typeof path !== "string") return null;
  let p = path.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.split("?")[0].split("#")[0];
  if (!p.endsWith("/")) p = `${p}/`;
  if (p.includes("..")) return null;
  return p;
}

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ revalidated: false, message: "Method Not Allowed" });
  }

  const expected = getExpectedSecret();
  if (!expected || expected.length < 16) {
    return res.status(503).json({
      revalidated: false,
      message: "REVALIDATE_SECRET（或 FULFILLMENT_INTERNAL_SECRET）未設定",
    });
  }

  const provided =
    req.headers["x-revalidate-secret"] ||
    (typeof req.headers.authorization === "string" &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : "");

  if (!provided || provided !== expected) {
    return res.status(403).json({ revalidated: false, message: "Forbidden" });
  }

  const body = req.body || {};
  const rawPaths = Array.isArray(body.paths)
    ? body.paths
    : body.path
      ? [body.path]
      : [];

  const paths = [...new Set(rawPaths.map(normalizePath).filter(Boolean))];
  const medusaProductId = String(
    body.medusa_product_id || body.product_id || "",
  ).trim();
  const event = String(body.event || "").toLowerCase();

  let catalog = null;
  if (medusaProductId && (event || body.catalog_off)) {
    const supabase = getAdmin();
    if (supabase) {
      if (event === "publish" || event === "update") {
        catalog = await syncCatalogAvailability(supabase, [medusaProductId]);
      } else if (
        event === "delete" ||
        event === "unpublish" ||
        event === "unpublished" ||
        body.catalog_off
      ) {
        catalog = await markMedusaProductOffCatalog(supabase, medusaProductId, {
          deleted: event === "delete",
        });
      }
    } else {
      catalog = { ok: false, error: "缺少 SUPABASE_SERVICE_ROLE_KEY" };
    }
  }

  if (!paths.length && !catalog) {
    return res.status(400).json({
      revalidated: false,
      message:
        "請提供 paths / path，或 medusa_product_id + event（unpublish|delete|publish）",
    });
  }

  const results = [];
  for (const path of paths) {
    try {
      await res.revalidate(path);
      results.push({ path, ok: true });
    } catch (err) {
      console.error("[revalidate] failed:", path, err?.message || err);
      results.push({ path, ok: false, error: err?.message || String(err) });
    }
  }

  const allOk = !results.length || results.every((r) => r.ok);
  return res.status(allOk ? 200 : 207).json({
    revalidated: allOk,
    results,
    catalog,
    catalog_status_hint:
      event === "delete"
        ? CATALOG_STATUS.DELETED
        : event === "unpublish" || event === "unpublished"
          ? CATALOG_STATUS.UNAVAILABLE
          : undefined,
    now: Date.now(),
  });
}
