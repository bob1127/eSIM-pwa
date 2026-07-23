/** 商品評價前端防洗版檢查（真正限制仍以 DB trigger 為準） */

export const REVIEW_LIMITS = {
  minReviewLen: 5,
  minReplyLen: 2,
  maxContentLen: 2000,
  maxTitleLen: 100,
  cooldownMs: 60_000,
  maxReviewsPerProductPerDay: 3,
};

function isRepeatedCharSpam(text) {
  const t = String(text || "").trim();
  if (t.length < 6) return false;
  return /^(.)\1+$/u.test(t);
}

function countUrls(text) {
  const m = String(text || "").match(/https?:\/\/|www\./gi);
  return m?.length || 0;
}

/**
 * @returns {string|null} 錯誤訊息；通過則回 null
 */
export function validateReviewContent({
  content,
  title,
  isReply = false,
} = {}) {
  const body = String(content || "").trim();
  const ttl = String(title || "").trim();
  const minLen = isReply
    ? REVIEW_LIMITS.minReplyLen
    : REVIEW_LIMITS.minReviewLen;

  if (body.length < minLen) {
    return isReply
      ? `回覆至少 ${minLen} 個字`
      : `評價內容至少 ${minLen} 個字`;
  }
  if (body.length > REVIEW_LIMITS.maxContentLen) {
    return `內容過長（上限 ${REVIEW_LIMITS.maxContentLen} 字）`;
  }
  if (!isReply && ttl.length > REVIEW_LIMITS.maxTitleLen) {
    return `標題過長（上限 ${REVIEW_LIMITS.maxTitleLen} 字）`;
  }
  if (isRepeatedCharSpam(body)) {
    return "內容疑似無效或洗版，請改寫後再送";
  }
  if (countUrls(body) > 3) {
    return "內容含過多連結，請精簡後再送";
  }
  return null;
}

export function getCooldownRemainingMs(lastPostAt) {
  if (!lastPostAt) return 0;
  const elapsed = Date.now() - Number(lastPostAt);
  return Math.max(0, REVIEW_LIMITS.cooldownMs - elapsed);
}

export function formatCooldownMessage(remainMs) {
  const sec = Math.ceil(remainMs / 1000);
  return `發文過於頻繁，請 ${sec} 秒後再試`;
}
