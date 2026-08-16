/**
 * Medusa metadata.subtitle_by_carrier 解析。
 * product-content API 以 JSON.stringify 寫入，故常為字串；
 * 若未解析就 ...spread，字元索引會變成 "0"→"{"，再被模糊比對誤中。
 */

export function parseSubtitleByCarrier(raw) {
  if (!raw) return {};

  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const out = {};
  for (const [carrier, value] of Object.entries(parsed)) {
    const key = String(carrier || "").trim();
    const text = String(value ?? "").trim();
    if (!key || !text) continue;
    out[key] = text;
  }
  return out;
}

/** 前台副標／規格不要標歐包或「含歐洲 N 國」（單國 eSIM 上架） */
export function stripEuPackCountLabel(text) {
  if (!text) return text;
  return String(text)
    .replace(/[｜|]\s*歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國/g, "")
    .replace(/[（(]\s*歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國\s*[）)]/g, "")
    .replace(/；\s*歐包\s*\d+\s*國可用/g, "")
    .replace(/；[^；]*歐包[^；]*/g, "")
    .replace(/歐包\s*\d+(?:\s*[／/]\s*\d+)?\s*國/g, "")
    .replace(/含歐洲\s*\d+\s*國/g, "")
    .replace(/歐包多國/g, "")
    .replace(/歐包/g, "")
    .replace(/[｜|]{2,}/g, "｜")
    .replace(/[｜|\s]+$/g, "")
    .replace(/^[｜|\s]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 前台副標不要出現「｜110%」這類內部利潤標記 */
export function stripInternalMarginFromSubtitle(text) {
  if (!text) return text;
  return stripEuPackCountLabel(
    String(text)
      .replace(/[｜|／/]\s*\d+(?:\.\d+)?\s*%/g, "")
      .replace(/\s*\(\s*\d+(?:\.\d+)?\s*%\s*\)/g, "")
      .replace(/\s*\d+(?:\.\d+)?\s*%\s*利潤/g, "")
      .replace(/[｜|]{2,}/g, "｜")
      .replace(/[｜|\s]+$/g, "")
      .replace(/^[｜|\s]+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}
