import { buildLineProductCarouselMessages } from "./lineBroadcastMessage";

/** 首頁「真．不限速 eSIM」三國主推（加好友歡迎輪播） */
export const LINE_WELCOME_FEATURED_UNLIMITED = [
  {
    title: "日本 AU(KDDI)",
    subtitle: "真．不限速・日本 IP",
    body: "AU（KDDI）當地網路，高速吃到飽、真．不限速，適合導航、視訊與熱點。",
    imageUrl: "/images/九州01.png",
    url: "/product/japan/japan-unlimited-esim-nolimit?telecom=au-kddi&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
  {
    title: "韓國 SK電信（含門號）",
    subtitle: "真．不限速・韓國 IP",
    body: "SKT 原生韓國 IP、真．不限速吃到飽。實名後可接聽來電與收簡訊，適合外送 App 與認證碼。",
    imageUrl: "/images/韓國01.png",
    url: "/product/korea/korea-unlimited-esim?telecom=sk-native&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
  {
    title: "泰國 Truemove 8／15天",
    subtitle: "真．不限速・當地號碼",
    body: "Truemove H 當地號碼，8 天與 15 天兩檔，真．不限速高速上網，可免費接聽來電與收簡訊。",
    imageUrl: "/images/泰國原生eSIM.png",
    url: "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8&data_amount=unlimited",
    buttonLabel: "查看方案",
  },
];

/** LINE Flex 輪播：Jeko 主推 eSIM（加好友時緊接歡迎文字下方） */
export function buildWelcomeFeaturedEsimCarouselMessage() {
  const messages = buildLineProductCarouselMessages({
    title: "Jeko 主推 eSIM",
    cards: LINE_WELCOME_FEATURED_UNLIMITED,
    includeLeadText: false,
  });
  return messages[0];
}
