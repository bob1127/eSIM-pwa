/**
 * J寶 聊天室快捷按鈕／預設答（點選題，不應匯入 FAQ 知識庫）
 * AiChatWidget 與 FAQ 掃描共用，避免漏過濾。
 */
import { getPublicSiteUrl } from "./siteUrl";

const SITE = getPublicSiteUrl();

export const PRESET_ANSWERS = {
  "怎麼安裝 eSIM？": `安裝步驟：\n1. Email 接收 QR Code。\n2. 手機設定 > 行動服務 > 加入 eSIM。\n3. 掃描 QR Code 即可。\n教學：${SITE}/operation-shopee/`,
  "我的手機支援嗎？": `請檢查：\n- iPhone：設定 > 一般 > 關於本機，查看是否有 EID。\n- Android：撥號輸入 *#06# 查看 EID。\n清單：${SITE}/compatibility`,
  "日本推薦哪一款？": `首選「KDDI/SoftBank 原生卡」，低延遲、速度快！\n購買：${SITE}/product/japan/`,
  "韓國有吃到飽嗎？": `有的！「韓國純日用吃到飽」方案不降速。\n詳情：${SITE}/product/korea/`,
};

/** 快捷關鍵字（含 eSIM／商城／住宿票券／文章）；無 preset 的會走 AI＋推薦卡） */
export const QUICK_QUESTIONS = [
  // eSIM
  "怎麼安裝 eSIM？",
  "我的手機支援嗎？",
  "日本推薦哪一款？",
  "韓國有吃到飽嗎？",
  "歐洲 eSIM 怎麼選？",
  // 住宿／門票／交通（聯盟卡）
  "大阪推薦飯店",
  "環球影城門票",
  "韓國交通票券",
  "東京迪士尼門票",
  // 商城
  "出國要帶什麼充電器",
  "推薦旅行收納包",
  "有沒有萬用轉接頭",
  // 旅遊文章／規定
  "中國大陸登機行動電源規定",
  "日本通關要注意什麼",
  "出國前要準備什麼",
];

const QUICK_SET = new Set(
  QUICK_QUESTIONS.flatMap((q) => {
    const t = String(q).trim();
    return [t, t.replace(/？/g, "?"), t.replace(/\?/g, "？")];
  }),
);

/** 是否為 J寶 小按鈕／快捷點選題（非使用者自由輸入） */
export function isAiChatQuickButtonQuestion(content) {
  const t = String(content || "").trim();
  if (!t) return false;
  if (QUICK_SET.has(t)) return true;
  if (Object.prototype.hasOwnProperty.call(PRESET_ANSWERS, t)) return true;
  return false;
}
