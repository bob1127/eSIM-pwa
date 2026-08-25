import {
  checkRateLimit,
  checkVisionRateLimit,
  checkOrigin,
  detectInjection,
  checkTopic,
  validatePayload,
  getClientIp,
  stripClientOverrides,
} from "../../lib/chatSecurity";
import { fetchProductKnowledge, fetchProductCards } from "../../lib/chatProducts";
import { fetchArticleKnowledgeByQuery } from "../../lib/chatArticles";
import { fetchFaqKnowledgeByQuery } from "../../lib/chatFaqKnowledge";
import { fetchWebKnowledgeByQuery } from "../../lib/chatWebSearch";
import {
  fetchAffiliateKnowledge,
  fetchAffiliateCards,
} from "../../lib/chatAffiliate";
import { fetchShopKnowledge, fetchShopCards } from "../../lib/chatShop";
import { fetchNetworkCoverageKnowledge } from "../../lib/chatNetworkCoverage";
import { SUPPORT_HOURS_LABEL } from "../../lib/supportHours";

export const config = {
  api: {
    bodyParser: {
      // 嚴格 body 上限：圖片 base64 最大約 5.5MB，總 body 設 8MB
      sizeLimit: "8mb",
    },
  },
};

const BASE_SYSTEM_PROMPT = `你是 Jeko eSIM 的專屬 AI 旅行小幫手【J寶】。
你具備旅行小幫手與網路連線專家的雙重身份。

【回覆邏輯｜正確性優先】
1. 參考「對話歷史」提供連貫的回答。
2. 知識來源階層（必須遵守，禁止用訓練記憶瞎編名單／規定）：
   A. 【商品資料庫】→ 方案、價格、國家 eSIM
   B. 【原生 eSIM 收訊／熱點涵蓋】→ 日本／韓國／中國／泰國／越南收訊、覆蓋、電信商熱點圖；必須依此作答並可附列出的地圖網址
   C. 【Jeko 商城推薦｜/shop】→ 充電配件、旅行用品、3C 周邊；引導點聊天室卡片加入購物車或購買
   D. 【Jeko 聯盟推薦｜Klook／KKday】→ 僅當使用者明確提到住宿／門票／交通票券／活動／Klook／KKday 等關鍵詞，且知識庫有列出對應商品時才推薦；必須使用「購買連結」。沒有對應關鍵詞時禁止主動推聯盟商品
   E. 【人工審核 FAQ 知識庫】→ 後台整理的 Q&A，有命中時優先依此作答
   F. 【Jeko官網WP知識】→ 有強相關摘錄／FAQ 時，優先依此作答並附官網閱讀連結
   G. 【網路資料】→ 僅當官網／聯盟／商城／FAQ 皆無強相關、且有提供網路來源時，才可依來源摘要作答並附來源網址
   H. 若以上都沒有可用依據：明確說尚無法確認；禁止憑印象列出飯店或票券名單
   I. 有商城或聯盟推薦時，回答結尾可簡短引導點卡片（Jeko 商城／合作夥伴）
3. 專業優先：針對旅行問題提供具體建議（如：日本通關提 Visit Japan Web 的 QR Code）。
4. 若使用者提供截圖，先描述你看到的關鍵畫面（設定頁、錯誤訊息、訊號、QR 等），再逐步說明如何排除。目前不支援影片判讀；若對方只提到影片，請引導改傳截圖，或於人工客服時段改傳官方 LINE。
5. 【導購語氣｜極重要｜先幫再說】
   - 先寫「基本實用資訊」（規格、注意事項、怎麼選），至少 2～4 句，讓客人覺得有被幫助。
   - 再自然帶出可選商品；不要一開場就硬推價格與購買路徑。
   - 若已提供【Jeko 商城推薦】：聊天室會顯示輪播卡片，文字中不要寫「購買：/shop/...」「售價：NT$…」這種清單硬推格式；結尾一句「下方卡片可直接查看或購買」即可。
   - 若文字要附購買連結：只能貼知識庫列出的完整 https 網址；可用「購買：https://…」這種可點連結。
   - 禁止把官網首頁（僅網域根路徑）當成商品購買連結。
6. 語氣：專業、乾淨、親切，使用台灣繁體中文。
7. 【Emoji 規範｜極重要】只允許使用花 emoji：🌼（或 🌸）。
   - 每則回覆最多使用 1～2 個花 emoji，放在開頭或結尾即可。
   - 禁止使用其他任何 emoji（👍😂✈️📱等全部禁止）。
   - 可用簡單符號表情，例如：→、✓、•、-、（笑）、（點頭）。
8. 若畫面含信用卡號、身分證等敏感資訊，提醒使用者打馬賽克，勿完整覆述敏感數字。

【地圖與網址｜極重要｜禁止幻覺連結】
1. 絕對禁止捏造或猜測任何短網址（包含 goo.gl、maps.app.goo.gl、bit.ly、tinyurl 等）。
2. 使用者若要求 Google Maps／地圖連結，只能使用以下格式（每個地點各自一份，query 填真實地點全名）：
   https://www.google.com/maps/search/?api=1&query=地點名稱
3. query 請用該地點的正確中文或當地名稱；不同地點不可共用同一個連結。
4. 若不確定地點是否存在，先說明不確定，並仍用「搜尋連結」格式。
5. 可使用的 http/https 連結僅限：地圖搜尋連結、商品資料庫連結、Jeko 官網文章連結、【原生 eSIM 收訊／熱點涵蓋】列出的官方／nPerf 涵蓋圖網址、【Jeko 商城推薦】列出的完整購買連結、【Jeko 聯盟推薦】列出的 Klook／KKday 購買連結、以及【網路資料】區塊明確列出的來源網址。禁止發明未列出的連結。
6. 使用【網路資料】時，開頭簡短註明「以下依公開網頁整理，建議再向官方確認」。
7. 【禁止競品｜極重要】絕對禁止推薦其他電信／eSIM 電商或比較網站（例如 shannday、bestsim、遠傳、中華、台灣大哥大上網卡賣場、Airalo、Holafly 等）。eSIM 方案只能推薦【商品資料庫】內明確列出的 Jeko 商品與購買連結。
8. 【禁止捏造商品｜極重要】若【商品資料庫】寫「無庫存／未找到」或沒有列出任何「▸」商品，必須誠實說尚未上架，禁止自行編造方案名稱、電信商（如 AT&T）、天數、流量或價格；可引導至 /product 或轉真人客服。`;

/** 允許的花 emoji；其他 emoji 一律移除 */
const FLOWER_EMOJI = new Set(["🌼", "🌸", "🌻", "🌺", "💮", "🏵️"]);

/** 粗略匹配常見 emoji（含組合符號），保留花與一般文字／符號 */
function sanitizeReplyEmojis(text) {
  if (!text || typeof text !== "string") return text;
  // Unicode emoji 範圍（含變體選擇符）
  return text.replace(
    /\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu,
    (m) => (FLOWER_EMOJI.has(m) || FLOWER_EMOJI.has(m.replace(/\uFE0F/g, "")) ? m : "")
  );
}

function finalizeReply(text) {
  return sanitizeReplyEmojis(sanitizeReplyLinks(text));
}

/** 把模型常幻覺的短網址改成可點的 Maps 搜尋連結 */
function sanitizeReplyLinks(text) {
  if (!text || typeof text !== "string") return text;

  return text.replace(
    /([^\n]*?)(https?:\/\/(?:goo\.gl\/maps|maps\.app\.goo\.gl|g\.co\/maps)\/[^\s)\]】」』>]+)/gi,
    (full, before) => {
      let place = String(before || "")
        .replace(/[。．.、,，:：；;！!？?\s\-–—]+$/g, "")
        .replace(/^(上午|下午|晚上|中午|早上)[：:]\s*/u, "")
        .replace(/^(拜訪|參觀|前往|享用|到|去|遊覽)/u, "")
        .trim();

      const m = place.match(
        /([\u4e00-\u9fff\u3040-\u30ffA-Za-z0-9][\u4e00-\u9fff\u3040-\u30ffA-Za-z0-9\s·・]{1,40})$/u
      );
      place = (m ? m[1] : place).trim();
      if (!place || place.length < 2) {
        return `${before}（請改搜尋該地點的 Google 地圖）`;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
      return `${before.replace(/\s*$/, " ")}${url}`.replace(/\s{2,}/g, " ");
    }
  );
}

function normalizeHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-12)
    .map((m) => ({
      role: m.role === "assistant" || m.role === "ai" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000),
    }));
}

function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/** 免費路線：Groq 多模型 → Gemini Flash 文字備援（不預設走付費 OpenAI） */
const GROQ_MODEL_DEFAULT = "openai/gpt-oss-120b";
const GROQ_MODEL_FALLBACKS = [
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
];
/** 免費額度看圖／文字：新帳號請用 3.x Flash（2.5 對 new users 已停） */
const GEMINI_TEXT_MODEL_DEFAULT = "gemini-3.6-flash";
const GEMINI_VISION_FALLBACKS = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

function getGroqModels() {
  const preferred = (process.env.GROQ_MODEL || "").trim();
  const list = [preferred || GROQ_MODEL_DEFAULT, ...GROQ_MODEL_FALLBACKS].filter(
    Boolean,
  );
  return [...new Set(list)];
}

function getGeminiTextModels() {
  const preferred = (process.env.GEMINI_TEXT_MODEL || "").trim();
  const list = [
    preferred ||
      process.env.GEMINI_VISION_MODEL ||
      GEMINI_TEXT_MODEL_DEFAULT,
    ...GEMINI_VISION_FALLBACKS,
  ].filter(Boolean);
  return [...new Set(list)];
}

/** 截圖判讀：多模型輪詢，避開單一 Flash 高負載／停用 */
function getGeminiVisionModels({ advanced = false } = {}) {
  const preferred = advanced
    ? (process.env.GEMINI_ADVANCED_MODEL || "").trim()
    : (process.env.GEMINI_VISION_MODEL || "").trim();
  const list = [preferred || GEMINI_TEXT_MODEL_DEFAULT, ...GEMINI_VISION_FALLBACKS].filter(
    Boolean,
  );
  return [...new Set(list)];
}

function isTransientModelError(errMsg = "") {
  return /does not exist|not have access|no longer available|decommissioned|deprecated|model_not_found|rate.?limit|quota|overloaded|unavailable|temporarily|high demand|try again later|429|503|502/i.test(
    String(errMsg),
  );
}

async function chatWithGroq({ message, history, systemPrompt }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const allMessages = [
    { role: "system", content: systemPrompt || BASE_SYSTEM_PROMPT },
    ...normalizeHistory(history),
    { role: "user", content: message },
  ];

  const models = getGroqModels();
  let lastError = null;

  for (const model of models) {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: allMessages,
            temperature: 0.5,
            max_tokens: 1500,
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        return {
          reply: finalizeReply(
            data.choices?.[0]?.message?.content ||
              "暫時無法回答，請稍後再試。🌼",
          ),
          provider: `groq:${model}`,
        };
      }

      const errMsg =
        data.error?.message || `Groq API 請求失敗（${response.status}）`;
      lastError = new Error(errMsg);
      if (!isTransientModelError(errMsg) && response.status < 500) break;
      console.warn(`[chat] Groq skip (${model}): ${errMsg}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[chat] Groq network skip (${model}): ${lastError.message}`);
    }
  }

  throw lastError || new Error("Groq API 請求失敗");
}

async function chatWithGemini({
  message,
  history,
  media,
  advanced,
  systemPrompt,
  textOnly = false,
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const models = textOnly
    ? getGeminiTextModels()
    : getGeminiVisionModels({ advanced: Boolean(advanced) });

  const promptToUse = systemPrompt || BASE_SYSTEM_PROMPT;

  const historyText = normalizeHistory(history)
    .map((m) => `${m.role === "assistant" ? "J寶" : "使用者"}：${m.content}`)
    .join("\n");

  const userText =
    (message && String(message).trim()) ||
    (media?.mimeType?.startsWith("video/")
      ? "請根據這段影片，幫我判斷問題並一步步說明怎麼處理。"
      : "請根據這張截圖，幫我判斷問題並一步步說明怎麼處理。");

  const parts = [];
  if (historyText) {
    parts.push({
      text: `【先前對話】\n${historyText}\n\n【本次問題】\n${userText}`,
    });
  } else {
    parts.push({ text: userText });
  }

  if (media?.data && media?.mimeType) {
    parts.push({
      inline_data: {
        mime_type: media.mimeType,
        data: media.data,
      },
    });
  }

  let lastError = null;
  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: promptToUse }],
            },
            contents: [{ role: "user", parts }],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 2048,
            },
          }),
        },
      );

      const data = await response.json();
      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text)
          .filter(Boolean)
          .join("\n");
        return {
          reply: finalizeReply(
            text || "我已收到媒體，但暫時無法判讀，請再描述一下狀況。🌼",
          ),
          provider: `gemini:${model}`,
        };
      }

      const errMsg =
        data.error?.message || `Gemini API 請求失敗（${response.status}）`;
      lastError = new Error(errMsg);
      if (!isTransientModelError(errMsg) && response.status < 500) break;
      console.warn(`[chat] Gemini skip (${model}): ${errMsg}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(
        `[chat] Gemini network skip (${model}): ${lastError.message}`,
      );
    }
  }

  throw lastError || new Error("Gemini API 請求失敗");
}

/** 純文字：免費 Groq 優先，失敗改走免費 Gemini Flash */
async function chatTextWithFreeProviders({ message, history, systemPrompt }) {
  const errors = [];

  if (process.env.GROQ_API_KEY) {
    try {
      return await chatWithGroq({ message, history, systemPrompt });
    } catch (e) {
      errors.push(`groq: ${e?.message || e}`);
      console.warn("[chat] Groq cascade failed, trying Gemini text backup");
    }
  } else {
    errors.push("groq: missing GROQ_API_KEY");
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      return await chatWithGemini({
        message,
        history,
        systemPrompt,
        textOnly: true,
      });
    } catch (e) {
      errors.push(`gemini: ${e?.message || e}`);
    }
  } else {
    errors.push("gemini: missing GEMINI_API_KEY");
  }

  throw new Error(
    `免費備援皆失敗（${errors.slice(0, 3).join(" | ")}）`.slice(0, 500),
  );
}

/** 是否為「只要 eSIM 方案」的提問（幫你規劃／明確求 eSIM） */
function isEsimFocusQuery(text = "") {
  const t = String(text || "");
  if (!t.trim()) return false;
  // 規劃表單固定文案
  if (/請依我的旅遊需求推薦適合的\s*eSIM/i.test(t)) return true;
  if (/【eSIM專推】/.test(t)) return true;
  if (/旅遊地點[\s\S]{0,40}天數[\s\S]{0,40}使用習慣/.test(t) && /eSIM/i.test(t)) {
    return true;
  }
  // 明確只要 eSIM，且不是在問周邊／住宿／門票
  const wantsEsim = /eSIM|esim|上網卡|網卡方案/i.test(t);
  const asksRecommend = /推薦|方案|怎麼選|哪一款|規劃|適合/.test(t);
  const asksOther =
    /充電器|轉接頭|收納|行動電源|商城|\/shop|飯店|住宿|門票|JR\s*PASS|鐵路|周遊券|klook|kkday|交通票/i.test(
      t,
    );
  return wantsEsim && asksRecommend && !asksOther;
}

export default async function handler(req, res) {
  // ── 0. HTTP method ──────────────────────────────────────────────────────
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── 1. 來源驗證：拒絕非本站跨域請求 ────────────────────────────────────
  if (!checkOrigin(req)) {
    return res.status(403).json({ error: "請求來源不被允許" });
  }

  // ── 2. IP 頻率限制 ───────────────────────────────────────────────────────
  const clientIp = getClientIp(req);
  const rateResult = checkRateLimit(clientIp);
  if (rateResult.blocked) {
    res.setHeader("Retry-After", String(rateResult.retryAfter ?? 60));
    return res.status(429).json({
      error:
        rateResult.reason === "rate_min"
          ? "請求太頻繁，請稍後再試"
          : "今日使用已達上限，請稍後再試",
    });
  }

  try {
    // 限流／模型／advanced 等安全參數一律由伺服器決定，客戶端傳入無效
    const {
      message = "",
      history = [],
      image,
      video,
      media,
    } = stripClientOverrides(req.body || {});

    // ── 3. Payload 結構與大小驗證 ──────────────────────────────────────────
    const payloadCheck = validatePayload({ message, history, image, video, media });
    if (!payloadCheck.valid) {
      return res.status(400).json({ error: payloadCheck.error });
    }

    const msgText = typeof message === "string" ? message.trim() : "";

    // ── 4. Prompt Injection 偵測 ──────────────────────────────────────────
    const injResult = detectInjection(msgText);
    if (injResult.detected) {
      console.warn(`[chat] injection attempt from ${clientIp}: ${injResult.pattern}`);
      return res.status(400).json({
        error: "抱歉，偵測到不符合規範的請求內容，無法處理。",
      });
    }

    // ── 5. 主題守衛（含程式碼偵測）───────────────────────────────────────
    const topicResult = checkTopic(msgText);
    if (topicResult.blocked) {
      const msg =
        topicResult.reason === "code_snippet"
          ? "偵測到程式碼片段。J寶 只回答旅行與 eSIM 相關問題，無法協助程式除錯或開發。🌼"
          : "J寶 專注於旅行與 eSIM 相關問題，這個問題超出我的服務範圍，請重新提問。🌼";
      return res.status(400).json({ error: msg });
    }

    // ── 6. 最終驗證 ────────────────────────────────────────────────────────
    const mediaPayload =
      parseDataUrl(media) ||
      parseDataUrl(video) ||
      parseDataUrl(image) ||
      null;

    const hasText = Boolean(msgText);
    if (!hasText && !mediaPayload) {
      return res.status(400).json({ error: "Message or media is required" });
    }

    const isVideo = mediaPayload?.mimeType?.startsWith("video/");
    const isImage = mediaPayload?.mimeType?.startsWith("image/");
    // 影片判讀已關閉（成本控管）；僅截圖走視覺模型
    if (isVideo) {
      return res.status(400).json({
        error:
          `目前僅支援截圖判讀。請改傳錯誤畫面或設定頁截圖；若需傳影片，請於人工客服時段（${SUPPORT_HOURS_LABEL}）透過官方 LINE 聯繫。🌼`,
      });
    }
    const useVision = Boolean(mediaPayload && isImage);
    const useAdvanced = false;

    // ── 7. 截圖獨立限流（比文字更嚴，保護 Gemini 額度）────────────────
    if (useVision) {
      const visionRate = checkVisionRateLimit(clientIp);
      if (visionRate.blocked) {
        res.setHeader("Retry-After", String(visionRate.retryAfter ?? 60));
        const msg =
          visionRate.reason === "vision_day"
            ? "今日截圖判讀次數已達上限，請改以文字描述問題，或稍後再試。也可透過官方 LINE 聯繫客服。🌼"
            : visionRate.reason === "vision_hour"
              ? "截圖判讀稍後再用（本小時次數已滿），請先用文字說明，或稍後再傳圖。🌼"
              : "截圖傳送太頻繁，請稍候再試。🌼";
        return res.status(429).json({ error: msg });
      }
    }

    // ── 8. 知識庫：eSIM + 聯盟 + 官網文章 → 不足再用網路 ─────────────
    const esimOnly = isEsimFocusQuery(msgText);

    const coverageKnowledge = fetchNetworkCoverageKnowledge(msgText);
    const hasCoverageKb = Boolean(coverageKnowledge);

    const [
      productKnowledge,
      articleResult,
      faqResult,
      productCards,
      affiliateKnowledge,
      affiliateCards,
      shopKnowledge,
      shopCards,
    ] = await Promise.all([
      fetchProductKnowledge(msgText),
      fetchArticleKnowledgeByQuery(msgText),
      fetchFaqKnowledgeByQuery(msgText),
      fetchProductCards(msgText),
      // eSIM 規劃／推薦：不要帶入商城與聯盟，避免推到充電器、JR PASS 等
      esimOnly ? Promise.resolve("") : Promise.resolve(fetchAffiliateKnowledge(msgText)),
      esimOnly ? Promise.resolve([]) : Promise.resolve(fetchAffiliateCards(msgText)),
      esimOnly ? Promise.resolve("") : Promise.resolve(fetchShopKnowledge(msgText)),
      esimOnly ? Promise.resolve([]) : Promise.resolve(fetchShopCards(msgText)),
    ]);

    const articleKnowledge =
      typeof articleResult === "string"
        ? articleResult
        : articleResult?.text || "";
    const faqKnowledge =
      typeof faqResult === "string" ? faqResult : faqResult?.text || "";
    const strongFaq = Boolean(faqResult?.strongCoverage);
    const strongCoverage =
      Boolean(articleResult?.strongCoverage) || strongFaq;
    const hasAffiliate = Boolean(affiliateCards?.length);
    const hasShop = Boolean(shopCards?.length);
    const hasProductCards = Boolean(productCards?.length);
    const hasProductDb =
      typeof productKnowledge === "string" &&
      productKnowledge.includes("購買連結：");
    const productOutOfStock =
      typeof productKnowledge === "string" &&
      (/【無庫存/.test(productKnowledge) ||
        (/找不到與問題相符/.test(productKnowledge) && !hasProductDb));

    // 已有 Jeko 商品可推時不要補網路（避免競品 eSIM 網站污染回答）
    let webKnowledge = "";
    let webMeta = { usedWeb: false, provider: null };
    if (
      !esimOnly &&
      !strongCoverage &&
      !hasCoverageKb &&
      !hasAffiliate &&
      !hasShop &&
      !hasProductCards &&
      !hasProductDb &&
      !productOutOfStock &&
      msgText
    ) {
      try {
        const web = await fetchWebKnowledgeByQuery(msgText);
        webKnowledge = web?.text || "";
        webMeta = {
          usedWeb: Boolean(web?.usedWeb),
          provider: web?.provider || null,
        };
      } catch (e) {
        console.error("[chat] web knowledge:", e?.message);
      }
    }

    const mergedCards = Array.isArray(productCards) ? productCards : [];

    const systemPrompt = [
      BASE_SYSTEM_PROMPT,
      faqKnowledge,
      productKnowledge,
      coverageKnowledge,
      esimOnly ? "" : shopKnowledge,
      esimOnly ? "" : affiliateKnowledge,
      // eSIM 專問時文章可留作安裝／注意事項，但仍以商品庫為主
      articleKnowledge,
      webKnowledge,
      strongFaq
        ? "【本次來源｜人工 FAQ】已命中後台 FAQ 知識庫；請優先依【人工審核 FAQ 知識庫】作答，可改寫語氣但勿改變事實。"
        : "",
      hasCoverageKb
        ? "【收訊／熱點｜必須遵守】若使用者問收訊、覆蓋、熱點圖或電信商訊號，優先依【原生 eSIM 收訊／熱點涵蓋】回答，並附上該國／該電信商列出的地圖連結；可提醒實際以商品標示電信商為準。"
        : "",
      esimOnly
        ? productOutOfStock || !hasProductDb
          ? "【本次來源｜eSIM 專推｜無庫存】商品資料庫沒有符合的方案。必須清楚告知尚未上架／找不到；禁止捏造任何 eSIM 方案名稱、電信商、天數、流量、價格或購買連結。可引導至 /product 看其他國家，或請改選目的地／轉真人客服。禁止推薦競品電商。"
          : "【本次來源｜eSIM 專推】使用者只要 eSIM 上網方案。只能依【商品資料庫】列出的商品推薦 1～2 個 Jeko eSIM；聊天室會顯示 eSIM 商品卡。禁止提及或推薦 Jeko 商城配件、Klook／KKday 聯盟商品、門票、鐵路周遊券、住宿。禁止推薦資料庫未列出的方案。\n" +
            "【HOT SALE 優先｜一律遵守】若商品標註 HOT SALE 電信（例如日本總量型的 AU(KDDI)、KDDI / SoftBank），推薦時一律以該電信商方案為主推；說明時可點出這是熱銷／推薦線路。不要主推非 HOT SALE 電信（如 IIJ(DOCOMO)），除非使用者明確指定。\n" +
            "【用量緩衝設計｜極重要｜避免客訴】可推 1～2 個：第 1 優先吃到飽／高容量；第 2 可推「明顯留餘裕」的總量型，禁止用「總量÷天數剛好夠」當理由。\n" +
            "依使用習慣的「建議最低總量」（約等於 天數 × 下列每日下限，再往上取商品庫現有檔）：\n" +
            "- 輕量（地圖／訊息）：每日至少約 1.5GB → 例 10 天至少約 15GB；或吃到飽。禁止推每日均攤＜1GB 的總量。\n" +
            "- 社群／拍照：每日至少約 2.5GB → 例 10 天至少約 25GB；優先吃到飽，其次高總量。\n" +
            "- 影音吃到飽：第 1 必推吃到飽；第 2 若推總量，每日至少約 5GB（10 天≥50GB），否則不要硬推總量。\n" +
            "- 工作視訊／會議雲端：第 1 必推吃到飽；第 2 若推總量，每日至少約 3～4GB（10 天至少約 30～40GB）。禁止推「10天10GB≈每日1GB」這類對視訊明顯不足的方案，並可明說視訊耗流大、總量要預留很多。\n" +
            "- 說明時寫「預留緩衝，避免旅遊中不夠用」；兩個方案都要合理，不要為了湊數推不夠用的第二個。"
        : productOutOfStock
        ? "【本次來源｜無庫存】商品資料庫沒有符合方案。誠實告知尚未上架；禁止捏造商品。可引導 /product 或轉客服。"
        : hasProductCards || hasProductDb
        ? "【本次來源】已提供 Jeko 商品資料庫與／或推薦卡。請只依資料庫列出的商品推薦，並引導點下方商品卡；禁止推薦未列出的方案或外部競品 eSIM／電信網站。" +
          "【HOT SALE】若知識庫標了 HOT SALE 電信，一律優先推薦該電信商方案。"
        : hasCoverageKb
        ? "【本次來源】已提供原生 eSIM 收訊／熱點涵蓋資料；請依此說明並附地圖連結，勿臆測未列出的覆蓋細節。"
        : strongCoverage
        ? "【本次來源】以 Jeko 官網文章為主；不要改用訓練記憶補充名單。"
        : hasShop && hasAffiliate
          ? "【本次來源】已提供商城與聯盟商品。請先寫實用說明，再引導點下方卡片；文字勿硬推價格清單。"
          : hasShop
            ? "【本次來源】已提供 Jeko 商城商品，聊天室會顯示輪播卡。請先寫基本實用說明，結尾輕提可參考下方卡片；勿在文字寫「購買：/路徑」「售價：NT$」硬推格式。若附連結只用知識庫完整 https 購買連結。"
            : hasAffiliate
              ? "【本次來源】已提供 Klook／KKday 聯盟商品（因使用者問題含對應關鍵詞）。請只推薦列出項目並列出購買連結；聊天室會顯示卡片。勿另推未列出的聯盟商品。"
              : webMeta.usedWeb
                ? "【本次來源】官網／聯盟／商城／商品庫無強相關，已提供【網路資料】；只能引用所列來源，並提醒向官方確認。仍禁止推薦競品 eSIM 電商，禁止捏造 Jeko eSIM 方案。"
                : "【本次來源】官網／聯盟／商城無強相關且網路資料不足；請誠實說明無法確認，勿編造。",
    ]
      .filter(Boolean)
      .join("\n\n");

    let reply;
    let provider;

    if (useVision) {
      const vision = await chatWithGemini({
        message: msgText,
        history,
        media: mediaPayload,
        advanced: useAdvanced,
        systemPrompt,
      });
      reply = vision.reply;
      provider = vision.provider || (useAdvanced ? "gemini-advanced" : "gemini-vision");
    } else {
      const textResult = await chatTextWithFreeProviders({
        message: msgText,
        history,
        systemPrompt,
      });
      reply = textResult.reply;
      provider = textResult.provider || "groq";
    }

    return res.status(200).json({
      reply,
      provider,
      productCards: mergedCards,
      affiliateCards: Array.isArray(affiliateCards) ? affiliateCards : [],
      shopCards: Array.isArray(shopCards) ? shopCards : [],
      knowledge: {
        siteStrong: strongCoverage,
        faqUsed: Boolean(faqKnowledge),
        coverageUsed: hasCoverageKb,
        affiliateUsed: hasAffiliate,
        shopUsed: hasShop,
        webUsed: webMeta.usedWeb,
        webProvider: webMeta.provider,
      },
    });
  } catch (error) {
    console.error("chat api error:", error);
    // 對外不洩漏內部錯誤細節
    return res.status(500).json({ error: "服務暫時不可用，請稍後再試" });
  }
}
