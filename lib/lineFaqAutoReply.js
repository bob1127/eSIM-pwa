/**
 * LINE Messaging API FAQ 自動回覆（關鍵字比對）
 * 資料來源：line-oa/jeko_esim_line_ai_faq_utf8_bom.csv → lib/lineFaqEntries.js
 * 含日式顏文字 + 🌼🌻；用 replyToken 回覆，不佔推播額度。
 *
 * 重建資料：node scripts/build-line-faq-entries.mjs
 */

import faqEntries from "./lineFaqEntries.js";

/** 過短的英文／符號關鍵字：只接受整句相符，避免誤觸 */
const EXACT_ONLY_KEYWORDS = new Set([
  "hi",
  "hello",
  "ok",
  "ok.",
  "thanks",
  "thank you",
]);

function normalizeText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeKey(text) {
  return normalizeText(text).toLowerCase();
}

/**
 * @param {string} userText
 * @returns {{ id: number, matchedKeyword: string, reply: string, score: number } | null}
 */
export function matchLineFaqReply(userText) {
  const raw = normalizeText(userText);
  if (!raw) return null;

  const haystack = normalizeKey(raw);
  let best = null;

  for (const entry of faqEntries) {
    if (!entry?.keywords?.length || !entry?.reply) continue;

    for (const kw of entry.keywords) {
      const key = normalizeKey(kw);
      if (!key) continue;

      const exactOnly =
        EXACT_ONLY_KEYWORDS.has(key) ||
        (key.length <= 2 && /^[a-z0-9]+$/i.test(key));

      let hit = false;
      if (exactOnly) {
        hit = haystack === key;
      } else if (haystack === key) {
        hit = true;
      } else if (haystack.includes(key)) {
        hit = true;
      }

      if (!hit) continue;

      // 較長關鍵字優先；同長度時「整句相符」加分
      const score = key.length * 10 + (haystack === key ? 5 : 0);
      if (!best || score > best.score) {
        best = {
          id: entry.id,
          matchedKeyword: kw,
          reply: entry.reply,
          score,
        };
      }
    }
  }

  return best;
}

export function getLineFaqEntryCount() {
  return Array.isArray(faqEntries) ? faqEntries.length : 0;
}

/**
 * @param {string} userText
 * @returns {{ type: 'text', text: string } | null}
 */
export function buildLineFaqReplyMessage(userText) {
  const match = matchLineFaqReply(userText);
  if (!match?.reply) return null;
  // LINE text message max 5000
  const text =
    match.reply.length > 5000
      ? `${match.reply.slice(0, 4990)}…`
      : match.reply;
  return { type: "text", text };
}
