/** Klook 體驗／門票（聯盟 aid=125977） */
const AID = "125977";
/** 連結轉換器（網站：Jeko eSIM）產生的廣告編號 */
const AFF_ADID = "1387309";

export function klookAff(url) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  if (raw.startsWith("https://affiliate.klook.com/redirect")) return raw;

  let dest = raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("aid");
    dest = parsed.toString();
  } catch {
    dest = raw.replace(/([?&])aid=\d+&?/, "$1").replace(/[?&]$/, "");
  }

  return `https://affiliate.klook.com/redirect?aid=${AID}&aff_adid=${AFF_ADID}&k_site=${encodeURIComponent(dest)}`;
}

/** 僅保留有真實商品圖的體驗；舊版 /images/klook/kl-* 假圖已移除 */
export const KLOOK_ACTIVITIES = [];
