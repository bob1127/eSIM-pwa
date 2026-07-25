/**
 * LINE LIFF 客戶端輔助（僅瀏覽器）
 *
 * 用途：官方帳號選單／圖文訊息開官網時，先經 /liff 初始化再進站。
 * 一鍵登入之後可再擴充；目前只負責「在 LINE 內開網站」。
 */

export function getLiffId() {
  return (process.env.NEXT_PUBLIC_LIFF_ID || "").trim();
}

/** 產生給官方帳號選單用的 LIFF 連結 */
export function getLiffEntryUrl(path = "/") {
  const id = getLiffId();
  if (!id) return null;
  const safe = sanitizeLiffPath(path);
  const q = safe && safe !== "/" ? `?path=${encodeURIComponent(safe)}` : "";
  return `https://liff.line.me/${id}${q}`;
}

/** 只允許站內相對路徑，避免 open redirect */
export function sanitizeLiffPath(raw) {
  if (!raw || typeof raw !== "string") return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw */
  }
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return "/";
  }
  return path;
}

let initPromise = null;

/**
 * 初始化 LIFF（同頁只跑一次）
 * @returns {Promise<{ ok: boolean, inClient: boolean, error?: string }>}
 */
export async function initLiff() {
  if (typeof window === "undefined") {
    return { ok: false, inClient: false, error: "ssr" };
  }

  const liffId = getLiffId();
  if (!liffId) {
    return { ok: false, inClient: false, error: "missing_liff_id" };
  }

  if (!initPromise) {
    initPromise = (async () => {
      const liff = (await import("@line/liff")).default;
      await liff.init({ liffId });
      return {
        ok: true,
        inClient: Boolean(liff.isInClient?.()),
        liff,
      };
    })().catch((err) => {
      initPromise = null;
      return {
        ok: false,
        inClient: false,
        error: err?.message || String(err),
      };
    });
  }

  return initPromise;
}
