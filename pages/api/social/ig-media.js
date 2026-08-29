import {
  extractInstagramShortcode,
  fetchInstagramOgMedia,
} from "@/lib/instagramOg";

const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;
const CACHE_MAX = 200;

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key, data) {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { at: Date.now(), data });
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const raw = String(req.query.url || req.query.code || "").trim();
  const code = extractInstagramShortcode(raw) || raw.replace(/[^A-Za-z0-9_-]/g, "");
  if (!code || code.length < 5) {
    return res.status(400).json({ error: "invalid_url" });
  }

  const cached = getCached(code);
  if (cached) {
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(200).json({ ...cached, cached: true });
  }

  try {
    const data = await fetchInstagramOgMedia(raw.includes("instagram") ? raw : code);
    setCached(code, data);
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=3600");
    return res.status(data.ok ? 200 : 502).json(data);
  } catch (e) {
    return res.status(502).json({
      ok: false,
      shortcode: code,
      error: "upstream_error",
      message: e?.message || "failed",
    });
  }
}
