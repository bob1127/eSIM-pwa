export function creatorKeyFromPost(post, { partnerDomain } = {}) {
  const domain =
    partnerDomain ||
    post?.partnerStoreDomain ||
    post?.storeDomain ||
    null;
  if (domain) {
    return `partner:${String(domain).trim().toLowerCase()}`;
  }
  return "jeko";
}

export function postKeyFromPost(post, { partnerDomain } = {}) {
  const slug = post?.slug || String(post?.id || "post");
  const key = creatorKeyFromPost(post, { partnerDomain });
  if (key === "jeko") return `wp:${slug}`;
  return `${key}:${slug}`;
}

export function memberKeyFromAuth(member) {
  if (!member) return null;
  if (member.userId) return `uid:${member.userId}`;
  if (member.lineUserId) return `line:${member.lineUserId}`;
  if (member.email) return `email:${String(member.email).toLowerCase()}`;
  return null;
}

export function creatorLabelFromPost(post) {
  if (post?.partnerContribution || post?.source === "partner") {
    return (
      post.partnerStoreName ||
      post.partnerAuthorName ||
      post.authorName ||
      "合作夥伴"
    );
  }
  return "Jeko eSIM";
}

export function parseCreatorKey(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s || s === "jeko") return { type: "jeko", key: "jeko", domain: null };
  if (s.startsWith("partner:")) {
    const domain = s.slice("partner:".length).replace(/[^a-z0-9-]/g, "");
    if (!domain) return { type: "jeko", key: "jeko", domain: null };
    return { type: "partner", key: `partner:${domain}`, domain };
  }
  return { type: "jeko", key: "jeko", domain: null };
}

export function creatorProfileHref(creatorKey) {
  const parsed = parseCreatorKey(creatorKey);
  if (parsed.type === "partner") return `/creators/partner/${parsed.domain}/`;
  return "/creators/jeko/";
}

export function creatorKeyFromPath(slugParts = []) {
  const parts = (Array.isArray(slugParts) ? slugParts : [slugParts])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  if (!parts.length || parts[0] === "jeko") return "jeko";
  if (parts[0] === "partner" && parts[1]) return `partner:${parts[1].toLowerCase()}`;
  return `partner:${parts[0].toLowerCase()}`;
}
