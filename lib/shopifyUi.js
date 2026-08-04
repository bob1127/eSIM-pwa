/**
 * Shopify Admin 風格色票／樣式 token（Polaris 配色近似值）。
 * 用於逐頁把夥伴後台改成完全比照 Shopify 後台的視覺語言：
 * 黑色頂欄／白色側欄／淺灰畫布／白卡＋細邊框／黑色主要按鈕／膠囊狀態徽章。
 */
export const SHOPIFY_UI = {
  chromeBg: "#1a1a1a",
  chromeBorder: "#2d2d2d",
  sidebarBg: "#ffffff",
  sidebarBorder: "#e3e3e3",
  sidebarActiveBg: "#f1f1f1",
  sidebarText: "#303030",
  sidebarTextMuted: "#6b6b6b",
  canvasBg: "#f1f1f1",
  cardBg: "#ffffff",
  cardBorder: "#e3e5e7",
  divider: "#eceef0",
  textPrimary: "#1a1a1a",
  textSecondary: "#6b6b6b",
  textTertiary: "#8a8a8a",
  primaryBtnBg: "#1a1a1a",
  primaryBtnBgHover: "#000000",
  primaryBtnText: "#ffffff",
  secondaryBorder: "#c9cccf",
  link: "#2c6ecb",
  focus: "#458fff",
};

/** Polaris 風格狀態膠囊配色（bg / text / dot） */
export const SHOPIFY_BADGE = {
  success: { bg: "#aee9d1", text: "#004c3f", dot: "#008060" },
  info: { bg: "#e0f0ff", text: "#0b5fa5", dot: "#2c6ecb" },
  neutral: { bg: "#e4e5e7", text: "#5c5f62", dot: "#8c9196" },
  warning: { bg: "#ffedbb", text: "#8a5a00", dot: "#eec200" },
  critical: { bg: "#fed3d1", text: "#8e1f0b", dot: "#d82c0d" },
};
