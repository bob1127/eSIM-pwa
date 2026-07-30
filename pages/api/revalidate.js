/**
 * On-demand ISR：給 Medusa 後台（product create/update/delete）呼叫。
 *
 * POST /api/revalidate
 * Header: X-Revalidate-Secret: <REVALIDATE_SECRET 或 FULFILLMENT_INTERNAL_SECRET>
 * Body: { paths: string[] } 或 { path: string }
 *
 * 本站 trailingSlash: true，路徑會正規成尾斜線（例如 /product/）。
 */
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
  // 去掉 query / hash
  p = p.split("?")[0].split("#")[0];
  if (!p.endsWith("/")) p = `${p}/`;
  // 禁止任意 path traversal
  if (p.includes("..")) return null;
  return p;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ revalidated: false, message: "Method Not Allowed" });
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
  if (!paths.length) {
    return res.status(400).json({
      revalidated: false,
      message: "請提供 paths: string[] 或 path: string",
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

  const allOk = results.every((r) => r.ok);
  return res.status(allOk ? 200 : 207).json({
    revalidated: allOk,
    results,
    now: Date.now(),
  });
}
