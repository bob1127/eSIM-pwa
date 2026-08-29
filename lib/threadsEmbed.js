/**
 * Threads 官方嵌入（embed.js 掛在 window.instgrm.Embeds，與 IG 同源 API）
 */

export function normalizeThreadsPermalink(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "threads.net" && host !== "threads.com") return "";
    url.hostname = "www.threads.com";
    url.hash = "";
    ["igshid", "utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(
      (k) => url.searchParams.delete(k),
    );
    let path = url.pathname;
    if (!path.endsWith("/")) path += "/";
    return `https://www.threads.com${path}${url.search}`;
  } catch {
    return "";
  }
}

export function loadThreadsEmbedScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.__jekoThreadsEmbedReady) return window.__jekoThreadsEmbedReady;

  window.__jekoThreadsEmbedReady = new Promise((resolve) => {
    const finish = (ok) => resolve(Boolean(ok));
    const existing = document.querySelector("script[data-jeko-threads-embed]");
    if (existing) {
      if (window.instgrm?.Embeds?.process) {
        finish(true);
        return;
      }
      existing.addEventListener("load", () => finish(true));
      existing.addEventListener("error", () => finish(false));
      // 已插入但尚未 onload
      window.setTimeout(() => finish(Boolean(window.instgrm?.Embeds?.process)), 2000);
      return;
    }
    const s = document.createElement("script");
    // 官方文件：threads.com/embed.js（會註冊 instgrm.Embeds）
    s.src = "https://www.threads.com/embed.js";
    s.async = true;
    s.dataset.jekoThreadsEmbed = "1";
    s.onload = () => finish(true);
    s.onerror = () => finish(false);
    document.body.appendChild(s);
  });

  return window.__jekoThreadsEmbedReady;
}

export function processThreadsEmbeds(root) {
  try {
    const api = window.instgrm?.Embeds;
    if (typeof api?.process !== "function") return false;
    // 先掃指定容器，失敗再掃整頁（與 IG SDK 行為一致）
    try {
      if (root) api.process(root);
      else api.process();
    } catch {
      api.process();
    }
    return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** 載入腳本並重試 process（燈箱／延遲掛載用） */
export async function ensureThreadsEmbeds(root, { retries = 6, gapMs = 250 } = {}) {
  const ok = await loadThreadsEmbedScript();
  if (!ok) return false;
  for (let i = 0; i < retries; i += 1) {
    if (processThreadsEmbeds(root)) {
      // 再補一次，給 iframe 插入時間
      window.setTimeout(() => processThreadsEmbeds(root), 400);
      return true;
    }
    await new Promise((r) => setTimeout(r, gapMs));
  }
  return Boolean(window.instgrm?.Embeds?.process);
}
