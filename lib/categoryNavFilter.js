/**
 * 後台兩層分類的「父層／群組」：僅整理用，虛擬商品前台不顯示階層。
 * 實體商城子分類也不進 eSIM 國家選單。
 */

export const CATEGORY_GROUP_HANDLES = new Set(["esim", "physical"]);

export const PHYSICAL_SHOP_HANDLES = new Set([
  "physical",
  "tech-accessories",
  "bags",
  "travel-gear",
  "pets-toys",
  "other",
]);

export function isCategoryNavGroup(category = {}) {
  const meta = category.metadata || {};
  if (meta.nav_group === true || meta.nav_group === "true") return true;
  const handle = String(category.handle || category.slug || "")
    .trim()
    .toLowerCase();
  return CATEGORY_GROUP_HANDLES.has(handle);
}

export function isPhysicalShopCategory(category = {}) {
  const meta = category.metadata || {};
  if (meta.shop_channel === "physical" || meta.channel === "physical") {
    return true;
  }
  const handle = String(category.handle || category.slug || "")
    .trim()
    .toLowerCase();
  return PHYSICAL_SHOP_HANDLES.has(handle);
}

/** 前台 eSIM 導覽／Hero／分類列表：只留國家等葉節點 */
export function filterLeafCategoriesForNav(categories = []) {
  return (categories || []).filter(
    (c) => !isCategoryNavGroup(c) && !isPhysicalShopCategory(c),
  );
}
