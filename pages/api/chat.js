import {
  checkRateLimit,
  checkOrigin,
  detectInjection,
  checkTopic,
  isTopicRelevant,
  validatePayload,
  getClientIp,
  stripClientOverrides,
} from "../../lib/chatSecurity";
import { fetchProductKnowledge, fetchProductCards } from "../../lib/chatProducts";
import { fetchArticleKnowledgeByQuery } from "../../lib/chatArticles";

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

【回覆邏輯】
1. 參考「對話歷史」提供連貫的回答。
2. 知識來源優先：若使用者詢問方案、價格、國家上網，優先使用下方【最新商品資料庫】；若使用者詢問安裝、設定、教學、疑難排解，優先使用下方【最新文章知識庫（WordPress）】。禁止臆測或憑印象回答。
3. 專業優先：針對旅行問題提供具體建議（如：日本通關提 Visit Japan Web 的 QR Code）。
4. 若使用者提供截圖或影片，先描述你看到的關鍵畫面（設定頁、錯誤訊息、訊號、QR 等），再逐步說明如何排除。
5. 自然導購：在回答完問題後，才適度附上對應商品的購買連結。
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
5. 除地圖搜尋連結、以及你明確知道的官方網址、商品資料庫提供的購買連結外，不要自行發明任何 http/https 連結。`;

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

async function chatWithGroq({ message, history, systemPrompt }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY");

  const allMessages = [
    { role: "system", content: systemPrompt || BASE_SYSTEM_PROMPT },
    ...normalizeHistory(history),
    { role: "user", content: message },
  ];

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: allMessages,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Groq API 請求失敗");
  }
  return finalizeReply(
    data.choices?.[0]?.message?.content || "暫時無法回答，請稍後再試。🌼"
  );
}

async function chatWithGemini({ message, history, media, advanced, systemPrompt }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const model = advanced
    ? process.env.GEMINI_ADVANCED_MODEL ||
      process.env.GEMINI_VISION_MODEL ||
      "gemini-flash-latest"
    : process.env.GEMINI_VISION_MODEL || "gemini-flash-latest";

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
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      data.error?.message || `Gemini API 請求失敗（${response.status}）`
    );
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("\n");

  return finalizeReply(
    text || "我已收到媒體，但暫時無法判讀，請再描述一下狀況。🌼"
  );
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
    const useVision = Boolean(mediaPayload && (isImage || isVideo));
    // advanced 只由伺服器依「是否為影片」決定，客戶端無法強制升級貴模型
    const useAdvanced = Boolean(isVideo);

    // ── 7. 付費 API 守門（Gemini）────────────────────────────────────────
    // 純圖片無文字視為允許（讓 J寶 看圖判斷）；有文字但明顯無關則拒絕。
    if (useVision) {
      const relevance = isTopicRelevant(msgText);
      if (!relevance.relevant) {
        return res.status(400).json({
          error:
            "J寶 的截圖／影片功能僅用於旅行與 eSIM 安裝問題。請描述你的旅行或 eSIM 狀況後再上傳。🌼",
        });
      }
    }

    // ── 8. 拉取知識庫（商品 + WordPress 文章，皆有快取）────────────────
    const [productKnowledge, articleKnowledge, productCards] = await Promise.all([
      fetchProductKnowledge(msgText),
      fetchArticleKnowledgeByQuery(msgText),
      fetchProductCards(msgText),
    ]);
    const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${productKnowledge}\n\n${articleKnowledge}`;

    let reply;
    let provider;

    if (useVision) {
      reply = await chatWithGemini({
        message: msgText,
        history,
        media: mediaPayload,
        advanced: useAdvanced,
        systemPrompt,
      });
      provider = useAdvanced ? "gemini-advanced" : "gemini-vision";
    } else {
      reply = await chatWithGroq({ message: msgText, history, systemPrompt });
      provider = "groq";
    }

    return res.status(200).json({ reply, provider, productCards });
  } catch (error) {
    console.error("chat api error:", error);
    // 對外不洩漏內部錯誤細節
    return res.status(500).json({ error: "服務暫時不可用，請稍後再試" });
  }
}
