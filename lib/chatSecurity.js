/**
 * chatSecurity.js
 * 多層資安防護，保護 /api/chat 不被濫用／刷爆 API 額度。
 *
 * 防護層：
 * 1. Origin/Referer 來源驗證 — 只接受自己網域的請求
 * 2. IP 頻率限制（in-memory）— 每 IP 每分鐘 / 每小時上限
 * 3. Payload 大小與結構驗證 — 防止超大 body 爆炸
 * 4. Prompt Injection 偵測 — 攔截角色覆寫 / 越獄嘗試
 * 5. 主題守衛 — 拒絕明顯與 eSIM/旅行無關的高成本請求
 * 6. 敏感媒體類型過濾 — 只接受圖片 / 允許清單影片格式
 *
 * 【重要】CHAT_* 限流參數只讀伺服器端 process.env（不可 NEXT_PUBLIC_），
 * 一律忽略 req.body / query 的任何覆寫嘗試。
 */

// ── 1. 伺服器專用限流常數（防竄改）────────────────────────────────────────

/**
 * 只從伺服器環境變數讀取；若有人誤設 NEXT_PUBLIC_CHAT_* 也一律忽略。
 * 並 clamp 到安全區間，避免被改成 999999 形同關閉防護。
 */
function readServerInt(name, fallback, min, max) {
  // 明確拒絕公開前綴變數被誤用
  if (process.env[`NEXT_PUBLIC_${name}`]) {
    console.warn(
      `[chatSecurity] 忽略 NEXT_PUBLIC_${name}（限流參數不可公開暴露）`
    );
  }
  const raw = process.env[name];
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const ALLOWED_ORIGINS = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jeko-esim.com.tw";
  const origins = [raw.replace(/\/$/, "")];
  origins.push("http://localhost:3000", "http://localhost:3001");
  return origins;
})();

/** 每 IP 每分鐘上限：1–30，預設 15（僅伺服器 env） */
const RATE_PER_MIN = readServerInt("CHAT_RATE_PER_MIN", 15, 1, 30);
/** 每 IP 每小時上限：10–200，預設 80（僅伺服器 env） */
const RATE_PER_HOUR = readServerInt("CHAT_RATE_PER_HOUR", 80, 10, 200);
/** 訊息字數上限：100–2000，預設 800（僅伺服器 env） */
const MAX_MSG_CHARS = readServerInt("CHAT_MAX_MSG_CHARS", 800, 100, 2000);
/** 對話歷史最多幾則（雙向合計）— 固定，不可由客戶端覆寫 */
const MAX_HISTORY_ITEMS = 20;
/** base64 圖片最大字元（約 4MB）*/
const MAX_IMAGE_B64_CHARS = 5_500_000;
/** base64 影片最大字元（約 10MB）*/
const MAX_VIDEO_B64_CHARS = 13_500_000;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm", "video/x-m4v",
]);

/**
 * 從 req.body 剔除任何嘗試竄改安全參數的欄位。
 * 客戶端傳 rate / limit / advanced 等一律無效。
 */
function stripClientOverrides(body) {
  if (!body || typeof body !== "object") return {};
  const {
    message,
    history,
    image,
    video,
    media,
    // 以下欄位一律丟棄，不可由客戶端控制：
    // advanced, rate, rateLimit, CHAT_RATE_PER_MIN, CHAT_RATE_PER_HOUR,
    // CHAT_MAX_MSG_CHARS, maxTokens, model, system, provider ...
    ..._ignored
  } = body;

  if (Object.keys(_ignored).length > 0 && process.env.NODE_ENV === "development") {
    // 開發時可觀察竄改嘗試；正式環境不回傳細節
  }

  return { message, history, image, video, media };
}

// ── 2. 內存頻率限制器 ──────────────────────────────────────────────────────
// Vercel Serverless 每個 function instance 各自管一塊 Map，
// 不如 Redis 精準，但足以擋絕大多數濫用者。

/** @type {Map<string, { min: number[]; hour: number[] }>} */
const _store = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 分鐘清一次過期條目

/** 定期清除過期條目，避免 Map 無限增長 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const minAgo = now - 60_000;
    const hourAgo = now - 3_600_000;
    for (const [ip, rec] of _store.entries()) {
      rec.min = rec.min.filter((t) => t > minAgo);
      rec.hour = rec.hour.filter((t) => t > hourAgo);
      if (!rec.min.length && !rec.hour.length) _store.delete(ip);
    }
  }, CLEANUP_INTERVAL);
}

/**
 * 檢查並記錄 IP 請求。
 * @returns {{ blocked: boolean; retryAfter?: number; reason?: string }}
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const minAgo = now - 60_000;
  const hourAgo = now - 3_600_000;

  if (!_store.has(ip)) _store.set(ip, { min: [], hour: [] });
  const rec = _store.get(ip);

  // 清掉過期時間戳
  rec.min = rec.min.filter((t) => t > minAgo);
  rec.hour = rec.hour.filter((t) => t > hourAgo);

  if (rec.min.length >= RATE_PER_MIN) {
    const retryAfter = Math.ceil((rec.min[0] + 60_000 - now) / 1000);
    return { blocked: true, retryAfter, reason: "rate_min" };
  }
  if (rec.hour.length >= RATE_PER_HOUR) {
    const retryAfter = Math.ceil((rec.hour[0] + 3_600_000 - now) / 1000);
    return { blocked: true, retryAfter, reason: "rate_hour" };
  }

  rec.min.push(now);
  rec.hour.push(now);
  return { blocked: false };
}

// ── 3. 來源驗證 ───────────────────────────────────────────────────────────

function checkOrigin(req) {
  // 若在開發模式，放行所有請求
  if (process.env.NODE_ENV === "development") return true;

  const origin = req.headers["origin"] || "";
  const referer = req.headers["referer"] || req.headers["referrer"] || "";

  const isAllowedOrigin = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  const isAllowedReferer = ALLOWED_ORIGINS.some((o) => referer.startsWith(o));

  return isAllowedOrigin || isAllowedReferer;
}

// ── 4. Prompt Injection 偵測 ──────────────────────────────────────────────

const INJECTION_PATTERNS = [
  // 角色覆寫
  /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i,
  /forget\s+(everything|all|your\s+(instructions?|rules?))/i,
  /you\s+are\s+now\s+(a|an|DAN|jailbreak|free)/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(DAN|GPT|unrestricted)/i,
  /pretend\s+(you\s+are|to\s+be)\s+.{0,30}(no\s+rules|no\s+limit|unlimited)/i,
  // System prompt 暴力覆蓋
  /^system\s*[:：]/im,
  /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|system\|>/i,
  /###\s*new\s+instructions/i,
  // 中文越獄
  /忽略\s*前面的|忘記\s*(所有|你的)\s*(指令|規則|限制)/,
  /現在\s*你\s*是.{0,20}(沒有限制|無限制|可以說任何)/,
  /扮演\s*(一個|一位).{0,20}(沒有限制|不受限)/,
  /你的\s*真實\s*(身份|模型)\s*是/,
  // API key 釣魚
  /api.?key|secret.?key|access.?token/i,
  /GROQ_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY/i,
  // 環境變數洩漏
  /process\.env|process\[.env.\]/i,
];

/**
 * 偵測 Prompt Injection。
 * @returns {{ detected: boolean; pattern?: string }}
 */
function detectInjection(text) {
  if (!text || typeof text !== "string") return { detected: false };
  for (const re of INJECTION_PATTERNS) {
    if (re.test(text)) {
      return { detected: true, pattern: re.source.slice(0, 40) };
    }
  }
  return { detected: false };
}

// ── 5a. 程式碼片段偵測 ────────────────────────────────────────────────────
// 偵測訊息主體本身就是程式碼（而非問旅行問題），避免浪費免費/付費 token。

/** 程式碼特徵：語法符號佔比高、或包含典型語句 */
const CODE_SYNTAX_RE = [
  // 函式呼叫 / 變數宣告
  /\b(function|const|let|var|return|import|export|require|class|async|await|void|typeof|instanceof)\b/,
  // 括號、分號密集組合
  /[(){};]{3,}/,
  // 箭頭函式
  /=>/,
  // 常見程式片段模式
  /\b\w+\s*\(.*\)\s*[{;]/,
  // setTimeout / clearTimeout / Promise / console 等 Web API
  /\b(setTimeout|clearTimeout|setInterval|clearInterval|Promise|console\.|document\.|window\.|addEventListener|querySelector|fetch\()\b/,
  // Python / shell
  /\bdef\s+\w+\s*\(|import\s+\w+(\s+as\s+\w+)?|pip\s+install|npm\s+(install|run)\b/,
  // SQL
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|DROP TABLE)\b/i,
  // Markdown 程式碼塊
  /```[\w\s]*\n/,
];

/**
 * 偵測訊息是否主要為程式碼片段。
 * @param {string} text
 * @returns {{ isCode: boolean; reason?: string }}
 */
function detectCode(text) {
  if (!text || typeof text !== "string") return { isCode: false };
  const trimmed = text.trim();
  // 若訊息很短（< 6 字），直接跑 pattern
  for (const re of CODE_SYNTAX_RE) {
    if (re.test(trimmed)) {
      return { isCode: true, reason: re.source.slice(0, 50) };
    }
  }
  // 額外：高密度非 CJK 特殊字元比例
  const specialChars = (trimmed.match(/[(){}[\];=><!/\\|+\-*%&^~`@#]/g) || []).length;
  const ratio = specialChars / Math.max(trimmed.length, 1);
  if (trimmed.length > 10 && ratio > 0.15) {
    return { isCode: true, reason: `special_char_ratio=${ratio.toFixed(2)}` };
  }
  return { isCode: false };
}

// ── 5b. 旅行相關正向關鍵字（付費 API 守門）───────────────────────────────
// 有圖／影片時，若訊息文字明顯不含旅行脈絡，拒絕送付費模型。

const TRAVEL_KEYWORDS = [
  // eSIM / 網路
  /esim|eSIM|上網|網路|訊號|SIM|網卡|漫遊|流量|4G|5G|收訊|覆蓋|涵蓋|熱點圖|nPerf/i,
  // 旅行
  /旅行|旅遊|出國|出發|行程|景點|住宿|飯店|機票|護照|簽證|海關|通關/,
  /travel|trip|tour|hotel|flight|passport|visa|customs|itinerary/i,
  // 國家 / 地區
  /日本|韓國|歐洲|美國|泰國|香港|澳門|台灣|台北|東京|首爾|大阪|京都|福岡|沖繩/,
  /Japan|Korea|Europe|Thailand|Hongkong|Bangkok|Osaka|Tokyo|Seoul/i,
  // 安裝 / 設定 (eSIM 相關)
  /安裝|設定|啟用|QR|ICCID|APN|設備|手機|iPhone|Android|操作/,
  /install|setup|activate|enable|device|phone|scan/i,
  // 付款 / 購買 / 訂單
  /購買|訂單|付款|退款|方案|價格/,
  // 地圖
  /地圖|map|google\s*map|位置|導航/i,
];

/**
 * 判斷訊息是否包含旅行 / eSIM 脈絡。
 * 付費 API（有媒體）呼叫前使用。
 * @param {string} text 可為空字串（有圖無文字的情況視為通過）
 * @returns {{ relevant: boolean }}
 */
function isTopicRelevant(text) {
  // 純圖片／影片、沒有文字補充 → 允許（使用者就是要讓 J寶 看圖）
  if (!text || !text.trim()) return { relevant: true };
  for (const re of TRAVEL_KEYWORDS) {
    if (re.test(text)) return { relevant: true };
  }
  return { relevant: false };
}

// ── 5c. 主題守衛（任何 API 呼叫前使用）──────────────────────────────────

const OFF_TOPIC_HARD_BLOCK = [
  // 程式碼生成（要求撰寫完整程式）
  /寫\s*(一個|完整的|一段)\s*(程式|code|script|shell|python|js|函式|function)/i,
  /幫我\s*寫\s*(完整|完全)?\s*(程式|代碼|code|腳本)/i,
  /write\s+(a\s+)?(full|complete|working)?\s*(code|script|program|function)/i,
  // 毫不相關的作業 / 報告
  /幫我\s*(寫|完成)\s*(作業|報告|論文|essay)/,
  /write\s+(my\s+)?(homework|essay|thesis|report)/i,
  // 法律/醫療高風險
  /怎麼\s*(製作|合成|製造)\s*(炸藥|毒品|武器|病毒)/,
  /how\s+to\s+(make|synthesize|build)\s+(bomb|explosive|drug|virus)/i,
];

/**
 * 主題守衛：適用所有 API。
 * @returns {{ blocked: boolean; reason?: string }}
 */
function checkTopic(message) {
  if (!message || typeof message !== "string") return { blocked: false };
  const text = message.trim();

  // 硬封鎖清單
  for (const re of OFF_TOPIC_HARD_BLOCK) {
    if (re.test(text)) return { blocked: true, reason: "off_topic" };
  }

  // 程式碼片段偵測（任何 API 都省下 token）
  const codeResult = detectCode(text);
  if (codeResult.isCode) {
    return { blocked: true, reason: "code_snippet" };
  }

  return { blocked: false };
}

// ── 6. Payload 驗證 ───────────────────────────────────────────────────────

/**
 * 驗證請求 body 的結構與大小。
 * @returns {{ valid: boolean; error?: string }}
 */
function validatePayload({ message, history, image, video, media }) {
  // 訊息長度
  if (message && typeof message === "string" && message.length > MAX_MSG_CHARS) {
    return { valid: false, error: `訊息太長（上限 ${MAX_MSG_CHARS} 字）` };
  }

  // 歷史筆數
  if (Array.isArray(history) && history.length > MAX_HISTORY_ITEMS) {
    return { valid: false, error: "對話歷史過長" };
  }

  // 媒體大小與類型
  for (const [field, maxChars, allowedTypes] of [
    ["image", MAX_IMAGE_B64_CHARS, ALLOWED_IMAGE_TYPES],
    ["media", MAX_IMAGE_B64_CHARS, new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES])],
    ["video", MAX_VIDEO_B64_CHARS, ALLOWED_VIDEO_TYPES],
  ]) {
    const raw = { image, video, media }[field];
    if (!raw) continue;
    if (typeof raw !== "string") return { valid: false, error: `${field} 格式錯誤` };
    if (raw.length > maxChars) return { valid: false, error: `${field} 檔案過大` };

    // 解析 MIME type
    const mimeMatch = raw.match(/^data:([^;]+);base64,/);
    if (!mimeMatch) return { valid: false, error: `${field} 非合法 data URL` };
    const mime = mimeMatch[1].toLowerCase();
    if (!allowedTypes.has(mime)) {
      return { valid: false, error: `不支援的媒體格式：${mime}` };
    }
  }

  return { valid: true };
}

// ── 7. IP 擷取工具 ────────────────────────────────────────────────────────

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

// ── 匯出 ──────────────────────────────────────────────────────────────────

module.exports = {
  checkRateLimit,
  checkOrigin,
  detectInjection,
  detectCode,
  checkTopic,
  isTopicRelevant,
  validatePayload,
  getClientIp,
  stripClientOverrides,
  LIMITS: Object.freeze({
    RATE_PER_MIN,
    RATE_PER_HOUR,
    MAX_MSG_CHARS,
    MAX_HISTORY_ITEMS,
  }),
};
