import {
  getAuthUserFromBearer,
  verifyPartnerAccessForUser,
} from "../../../lib/partnerServer";
import { sanitizePartnerBlogSlug } from "../../../lib/partnerBlog";
import { notifyCreatorFollowers } from "../../../lib/creatorFollowNotify";
import { getPublicSiteUrl } from "../../../lib/siteUrl";

function normalizePath(path) {
  if (!path || typeof path !== "string") return null;
  let p = path.trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.split("?")[0].split("#")[0];
  if (p.includes("..")) return null;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}

/**
 * 夥伴發布／更新文章後立刻刷新 ISR，讓前台接近靜態頁。
 * POST { slug, oldSlug? }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method Not Allowed" });
  }

  const user = await getAuthUserFromBearer(req);
  if (!user) {
    return res.status(401).json({ ok: false, message: "請先登入" });
  }

  const access = await verifyPartnerAccessForUser(user);
  if (!access.ok || !access.store?.domain) {
    return res.status(403).json({ ok: false, message: access.message || "無權限" });
  }

  const domain = String(access.store.domain).trim().toLowerCase();
  const slug = sanitizePartnerBlogSlug(req.body?.slug);
  const oldSlug = sanitizePartnerBlogSlug(req.body?.oldSlug);
  if (!slug) {
    return res.status(400).json({ ok: false, message: "缺少 slug" });
  }

  const raw = [
    `/blog/${slug}/`,
    `/p/${domain}/blog/${slug}/`,
    `/p/${domain}/blog/`,
  ];
  if (oldSlug && oldSlug !== slug) {
    raw.push(`/blog/${oldSlug}/`, `/p/${domain}/blog/${oldSlug}/`);
  }

  const paths = [...new Set(raw.map(normalizePath).filter(Boolean))];
  const results = [];
  for (const path of paths) {
    try {
      await res.revalidate(path);
      results.push({ path, ok: true });
    } catch (err) {
      results.push({ path, ok: false, error: err?.message || String(err) });
    }
  }

  let notify = null;
  if (req.body?.notifyFollowers) {
    const site = getPublicSiteUrl();
    notify = await notifyCreatorFollowers({
      creatorKey: `partner:${domain}`,
      creatorName: access.store.store_name || access.store.footer_company_name,
      title: String(req.body?.title || slug),
      url: `${site}/blog/${slug}/`,
    });
  }

  return res.status(200).json({ ok: true, results, notify });
}
