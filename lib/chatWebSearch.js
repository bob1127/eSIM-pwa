/**
 * chatWebSearch.js
 * 官網知識不足時的網路搜尋備援（精準摘錄，控制 token）
 *
 * 優先順序：
 * 1) SERPER_API_KEY（Google via Serper）
 * 2) TAVILY_API_KEY
 * 3) DuckDuckGo HTML（免金鑰 fallback）
 */

const WEB_BUDGET = Number(process.env.CHAT_WEB_PROMPT_BUDGET || 1400);
const WEB_MAX_RESULTS = Number(process.env.CHAT_WEB_MAX_RESULTS || 5);
const WEB_FETCH_PAGES = Number(process.env.CHAT_WEB_FETCH_PAGES || 2);
const WEB_PAGE_CHARS = Number(process.env.CHAT_WEB_PAGE_CHARS || 500);

function stripHtml(html) {
  if (!html || typeof html !== "string") return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

async function searchWithSerper(query) {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "tw",
      hl: "zh-tw",
      num: WEB_MAX_RESULTS,
    }),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const data = await res.json();
  const organic = Array.isArray(data.organic) ? data.organic : [];
  return organic.slice(0, WEB_MAX_RESULTS).map((r) => ({
    title: r.title || "",
    url: r.link || "",
    snippet: r.snippet || "",
    provider: "serper",
  }));
}

async function searchWithTavily(query) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      include_answer: false,
      max_results: WEB_MAX_RESULTS,
    }),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];
  return results.slice(0, WEB_MAX_RESULTS).map((r) => ({
    title: r.title || "",
    url: r.url || "",
    snippet: r.content || r.snippet || "",
    provider: "tavily",
  }));
}

async function searchWithDuckDuckGo(query) {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
  const html = await res.text();
  const results = [];
  const seen = new Set();

  const linkRe =
    /<a\s+[^>]*href="([^"]*uddg=[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = linkRe.exec(html)) && results.length < WEB_MAX_RESULTS) {
    let href = decodeEntities(m[1]);
    try {
      const abs = href.startsWith("//") ? `https:${href}` : href;
      const u = new URL(abs, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      if (uddg) href = decodeURIComponent(uddg);
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(href)) continue;
    // skip ads / tracking
    if (/duckduckgo\.com\/y\.js|bing\.com\/aclick|doubleclick/i.test(href)) {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);

    const title = stripHtml(m[2]).slice(0, 120);
    if (!title || title.length < 2) continue;

    results.push({
      title,
      url: href,
      snippet: "",
      provider: "duckduckgo",
    });
  }

  return results;
}

async function fetchPageSnippet(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JekoBot/1.0; +https://www.jeko-esim.com.tw)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return "";
    const ctype = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(ctype) && ctype) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, WEB_PAGE_CHARS);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function enrichWithPageText(results) {
  const top = results.slice(0, WEB_FETCH_PAGES);
  const extras = await Promise.all(
    top.map(async (r) => {
      const pageText = await fetchPageSnippet(r.url);
      return pageText ? { ...r, pageText } : r;
    }),
  );
  const map = new Map(extras.map((r) => [r.url, r]));
  return results.map((r) => map.get(r.url) || r);
}

/**
 * @returns {Promise<{ text: string, usedWeb: boolean, provider: string|null, count: number }>}
 */
export async function fetchWebKnowledgeByQuery(queryText) {
  const q = String(queryText || "").trim();
  if (!q || q.length < 2) {
    return { text: "", usedWeb: false, provider: null, count: 0 };
  }

  let results = [];
  let provider = null;

  try {
    results = (await searchWithSerper(q)) || [];
    if (results.length) provider = "serper";
  } catch (e) {
    console.error("[chatWebSearch] serper:", e?.message);
  }

  if (!results.length) {
    try {
      results = (await searchWithTavily(q)) || [];
      if (results.length) provider = "tavily";
    } catch (e) {
      console.error("[chatWebSearch] tavily:", e?.message);
    }
  }

  if (!results.length) {
    try {
      results = (await searchWithDuckDuckGo(q)) || [];
      if (results.length) provider = "duckduckgo";
    } catch (e) {
      console.error("[chatWebSearch] ddg:", e?.message);
    }
  }

  if (!results.length) {
    return {
      text: "【網路資料】暫無可用搜尋結果。請避免臆測；可請使用者改查官方網站。",
      usedWeb: false,
      provider: null,
      count: 0,
    };
  }

  try {
    results = await enrichWithPageText(results);
  } catch (e) {
    console.error("[chatWebSearch] enrich:", e?.message);
  }

  const header =
    "【網路資料｜官網無強相關時之備援】僅可引用下方來源的事實與網址；禁止捏造未列出的連結或飯店名單。請註明「依公開網頁整理，請再向官方確認」。";

  const lines = [header];
  let used = header.length;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (!r.url) continue;
    const block = [
      `${i + 1}. ${r.title || "來源"}`,
      r.url,
      r.snippet ? `摘要：${r.snippet.slice(0, 180)}` : "",
      r.pageText ? `內文：${r.pageText.slice(0, WEB_PAGE_CHARS)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    if (used + block.length + 2 > WEB_BUDGET) break;
    lines.push(block);
    used += block.length + 2;
  }

  return {
    text: lines.join("\n\n"),
    usedWeb: true,
    provider,
    count: results.length,
  };
}
