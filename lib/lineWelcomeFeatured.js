import { buildLineProductCarouselMessages } from "./lineBroadcastMessage";
import { DEFAULT_LINE_WELCOME_SETTINGS } from "./lineWelcomeSettings";

/** 預設三國主推（與 lineWelcomeSettings 預設一致） */
export const LINE_WELCOME_FEATURED_UNLIMITED =
  DEFAULT_LINE_WELCOME_SETTINGS.cards.map((c) => ({ ...c }));

/**
 * LINE Flex 輪播：加好友歡迎主推方案（不含前導標題文字）
 * @param {{ carouselTitle?: string, cards?: object[] } | null} settings
 */
export function buildWelcomeFeaturedEsimCarouselMessage(settings = null) {
  const title =
    settings?.carouselTitle ||
    DEFAULT_LINE_WELCOME_SETTINGS.carouselTitle ||
    "";
  const cards =
    Array.isArray(settings?.cards) && settings.cards.length
      ? settings.cards
      : LINE_WELCOME_FEATURED_UNLIMITED;

  const messages = buildLineProductCarouselMessages({
    title,
    body: "",
    cards,
    // 不加前導文字 bubble（避免加好友後又多一行「Jeko 推薦 原生eSIM」）
    includeLeadText: false,
    // 手機版正方形圖；1:1 + fit 滿寬、完整顯示不裁切
    cardStyle: {
      bubbleSize: "mega",
      aspectRatio: "1:1",
      aspectMode: "fit",
    },
  });
  return messages;
}
