/**
 * 夥伴首頁 CMS 儲存（共用於各區塊編輯 Dialog）
 */
export function homepageSaveMinDelay() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000 + Math.floor(Math.random() * 1000));
  });
}

export async function savePartnerHomepageCms({
  token,
  storeId,
  homepageCms,
  syncBrand = false,
}) {
  const res = await fetch("/api/partner/homepage-cms", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      store_id: storeId,
      homepage_cms: homepageCms,
      sync_brand: syncBrand,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "儲存失敗");
  return data.homepage_cms || homepageCms;
}
