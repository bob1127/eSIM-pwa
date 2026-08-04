/** 會員中心 UI — 對齊 Shopify Admin／夥伴後台：深灰／淺灰／白 + 小圓角 */
import { SHOPIFY_UI, SHOPIFY_BADGE } from "@/lib/shopifyUi";

export const ACCOUNT_CONTENT_MAX_PX = 1280;

export const ACCOUNT_UI = {
  pagePt: "pt-0",
  stickyTop: "top-0",
  sidebarH: "h-screen",
  contentMax: "max-w-[1280px] mx-auto w-full",
  modalOverlay:
    "fixed inset-0 z-[11050] flex items-center justify-center p-4 bg-black/45",
  modalOverlayBottom:
    "fixed inset-0 z-[11050] flex items-end sm:items-center justify-center p-4 bg-black/45",
  dropdown: "z-[11000]",
  shellSticky: "z-[100]",
  /** 小圓角（對齊夥伴後台） */
  radiusCard: "rounded-lg",
  radiusInput: "rounded-md",
  radiusBtn: "rounded-md",
  radius: "0.5rem",
  radiusSm: "0.375rem",
};

/** 頁面色票別名（相容舊 ACCENT 引用） */
export const ACCOUNT_THEME = {
  ...SHOPIFY_UI,
  wash: "#f6f6f6",
  light: "#f0f0f0",
  dark: "#2d2d2d",
  mid: "#5c5c5c",
  soft: "#8a8a8a",
  border: "#e5e5e5",
  white: "#ffffff",
  badge: SHOPIFY_BADGE,
};

export { SHOPIFY_UI, SHOPIFY_BADGE };
