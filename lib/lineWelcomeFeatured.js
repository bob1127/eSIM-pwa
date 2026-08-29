import { buildLineProductCarouselMessages } from "./lineBroadcastMessage";
import { DEFAULT_LINE_WELCOME_SETTINGS } from "./lineWelcomeSettings";

/** 預設三國主推（與 lineWelcomeSettings 預設一致） */
export const LINE_WELCOME_FEATURED_UNLIMITED =
  DEFAULT_LINE_WELCOME_SETTINGS.cards.map((c) => ({ ...c }));

/**
 * LINE Flex 輪播：Jeko 推薦 原生eSIM
 * @param {{ carouselTitle?: string, cards?: object[] } | null} settings
 */
export function buildWelcomeFeaturedEsimCarouselMessage(settings = null) {
  const title =
    settings?.carouselTitle ||
    DEFAULT_LINE_WELCOME_SETTINGS.carouselTitle ||
    "Jeko 推薦 原生eSIM";
  const cards =
    Array.isArray(settings?.cards) && settings.cards.length
      ? settings.cards
      : LINE_WELCOME_FEATURED_UNLIMITED;

  const messages = buildLineProductCarouselMessages({
    title,
    body: "",
    cards,
    // 使用者會先看到「Jeko 推薦 原生eSIM」文字，再滑輪播
    includeLeadText: true,
    // 手機版正方形圖；1:1 + fit 滿寬、完整顯示不裁切
    cardStyle: {
      bubbleSize: "mega",
      aspectRatio: "1:1",
      aspectMode: "fit",
    },
  });
  return messages;
}
