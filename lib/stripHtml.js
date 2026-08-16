/** WordPress 「閱讀更多」會留下 [&hellip;] / […] / [...] */
export function stripWpReadMore(text = "") {
  return String(text)
    .replace(
      /\[\s*(?:&amp;hellip;|&hellip;|&#8230;|&#x2026;|…|\.{2,3})\s*\]/gi,
      "",
    )
    .replace(/\s*(?:&amp;hellip;|&hellip;|&#8230;|&#x2026;)\s*/gi, " ");
}

export function stripHtml(html = "") {
  return stripWpReadMore(
    String(html)
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#\d+;/gm, "")
      .replace(/&[a-z]+;/gi, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}
