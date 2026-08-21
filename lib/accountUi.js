/** 會員中心 UI — 對齊 Shopify Admin／夥伴後台：深灰／淺灰／白 + 小圓角 */
import { SHOPIFY_UI } from "@/lib/shopifyUi";

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
  /** 狀態 tag：對齊 Jeko 膠囊按鈕 */
  radiusBadge: "9999px",
};

/**
 * 會員頁狀態 tag 色系（對齊合作頁／JekoPillButton：藍 #1E4AD1＋黃 #FADE2B）
 * 夥伴後台仍用 lib/shopifyUi 的 SHOPIFY_BADGE（Polaris 綠）。
 */
export const ACCOUNT_BADGE = {
  success: {
    bg: "#E8EEFC",
    text: "#1E4AD1",
    dot: "#FADE2B",
    border: "#C5D2F7",
  },
  info: {
    bg: "#EFF6FC",
    text: "#1E4AD1",
    dot: "#1E4AD1",
    border: "#C5D2F7",
  },
  neutral: {
    bg: "#F1F3F7",
    text: "#5B6570",
    dot: "#A5B4CB",
    border: "#E3E7EE",
  },
  warning: {
    bg: "#FFF6C8",
    text: "#1E4AD1",
    dot: "#FADE2B",
    border: "#FADE2B",
  },
  critical: {
    bg: "#FFF0D6",
    text: "#1E4AD1",
    dot: "#FADE2B",
    border: "#F2CC40",
  },
};

/** 會員中心別名：舊程式 import SHOPIFY_BADGE 也會拿到 Jeko 色票 */
export const SHOPIFY_BADGE = ACCOUNT_BADGE;

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
  brand: "#1E4AD1",
  accent: "#FADE2B",
  badge: ACCOUNT_BADGE,
};

export { SHOPIFY_UI };
