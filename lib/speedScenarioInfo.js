/**
 * 降速／FUP 速率說明（供商品頁點擊 popup）
 * ids: 10mbps | 5mbps | 128kbps | 256kbps
 */

export const SPEED_SCENARIO_IDS = ["10mbps", "5mbps", "128kbps", "256kbps"];

/** @typedef {'10mbps'|'5mbps'|'128kbps'|'256kbps'} SpeedScenarioId */

/** @type {Record<SpeedScenarioId, {
 *   label: string,
 *   headline: string,
 *   summary: string,
 *   good: string[],
 *  ok: string[],
 *   limited: string[],
 *   note: string,
 * }>} */
export const SPEED_SCENARIOS = {
  "10mbps": {
    label: "約 10 Mbps",
    headline: "旅遊日常大多夠用",
    summary:
      "公平使用政策下的「約 10Mbps 吃到飽」等級。測速常見約 7～12 Mbps，不一定剛好顯示 10.0。比斷網或 128kbps 好很多，但不如不限速高速方案暢快。",
    good: [
      "Google Maps／Grab 導航與叫車",
      "LINE／WhatsApp／訊息與語音通話",
      "一般網頁、搜尋、即時翻譯",
      "ChatGPT 等文字／輕量工具",
    ],
    ok: [
      "YouTube／短影音約 720p（多數情況可看）",
      "單人熱點給相機或筆電輕量使用",
      "視訊會議（畫面可能偏糊，視網路而定）",
    ],
    limited: [
      "穩定 1080p／4K 影音串流",
      "多人同時熱點看片、上傳大檔",
      "重度雲端同步、大型遊戲下載",
    ],
    note: "實際速度依訊號、室內／地下室與當下擁塞而定，僅供參考。",
  },
  "5mbps": {
    label: "約 5 Mbps",
    headline: "輕度上網、偏保守",
    summary:
      "「5Mbps 續航」等級：高速額度用完後仍可持續使用，但速度明顯低於 10Mbps。適合以傳訊、導航為主，不太適合長時間高畫質影音。",
    good: [
      "導航、叫車、傳訊",
      "查地圖、訂餐廳、輕量網頁",
      "文字為主的 App（LINE、郵件）",
    ],
    ok: [
      "低畫質／自動畫質影音（可能緩衝）",
      "單人熱點短暫分享",
      "語音通話為主的視訊（畫面可能卡）",
    ],
    limited: [
      "舒適觀看 720p 以上影音",
      "多人熱點同時使用",
      "大檔上傳、直播",
    ],
    note: "實際速度依訊號與擁塞而定；測速可能略高或略低於 5Mbps。僅供參考。",
  },
  "128kbps": {
    label: "約 128 kbps",
    headline: "僅能應付基本傳訊",
    summary:
      "高速流量用完後的常見降速等級（約 0.1 Mbps）。幾乎無法順暢看片或即時導航，請把高速額度留給白天移動與查路。",
    good: [
      "收發文字訊息（LINE／WhatsApp）",
      "極輕量文字網頁（可能仍偏慢）",
    ],
    ok: [
      "偶爾載入簡易頁面",
      "接收小圖（需耐心等待）",
    ],
    limited: [
      "Google Maps 即時導航／路況",
      "任何影音、短影音、直播",
      "熱點分享、視訊通話、大圖／相簿同步",
    ],
    note: "測速通常只會看到約 0.1Mbps 等級。若行程用量大，請改選吃到飽或更高流量方案。",
  },
  "256kbps": {
    label: "約 256 kbps",
    headline: "比 128kbps 略好，仍偏慢",
    summary:
      "降速後約 0.25 Mbps。傳訊與極簡網頁比 128kbps 稍順一點，但影音與即時導航仍不建議依賴。",
    good: [
      "文字訊息、語音訊息",
      "簡易文字網頁、郵件",
    ],
    ok: [
      "偶爾開地圖靜態查詢（即時導航仍吃力）",
      "小圖載入（偏慢）",
    ],
    limited: [
      "順暢即時導航與路況",
      "影音串流、短影音",
      "熱點多人使用、視訊會議",
    ],
    note: "仍屬「保底連線」等級，請勿當成一般上網速度。僅供參考。",
  },
};

/**
 * @param {string} raw
 * @returns {SpeedScenarioId | null}
 */
export function resolveSpeedScenarioId(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  if (/(?:^|[^\d])10\s*[Mm]bps/.test(` ${s}`)) return "10mbps";
  if (/(?:^|[^\d])5\s*[Mm]bps/.test(` ${s}`)) return "5mbps";
  if (/(?:^|[^\d])256\s*[Kk]bps/.test(` ${s}`)) return "256kbps";
  if (/(?:^|[^\d])128\s*[Kk]bps/.test(` ${s}`)) return "128kbps";
  return null;
}

/** 捕捉前導字元，避免 15Mbps 誤判成 5Mbps */
const SPEED_MENTION_RE =
  /(^|[^\d])(10\s*[Mm]bps|5\s*[Mm]bps|256\s*[Kk]bps|128\s*[Kk]bps)/g;

/**
 * 將純文字拆成一般文字與可點擊速率片段
 * @param {string} text
 * @returns {{ text: string, id: SpeedScenarioId | null }[]}
 */
export function splitSpeedMentions(text) {
  const input = String(text || "");
  if (!input) return [];
  const parts = [];
  let last = 0;
  SPEED_MENTION_RE.lastIndex = 0;
  let m;
  while ((m = SPEED_MENTION_RE.exec(input))) {
    const prefix = m[1] || "";
    const token = m[2];
    const tokenStart = m.index + prefix.length;
    if (tokenStart > last) {
      parts.push({ text: input.slice(last, tokenStart), id: null });
    }
    parts.push({ text: token, id: resolveSpeedScenarioId(token) });
    last = tokenStart + token.length;
  }
  if (last < input.length) parts.push({ text: input.slice(last), id: null });
  return parts.length ? parts : [{ text: input, id: null }];
}

const SPEED_BTN_CLASS =
  "speed-info-trigger inline underline decoration-dotted underline-offset-2 font-semibold cursor-pointer hover:opacity-80 bg-transparent border-0 p-0 m-0 align-baseline";

/**
 * 在已產出的 HTML 中，把速率文字包成可點擊 button（避開標籤屬性）
 * @param {string} html
 */
export function wrapSpeedMentionsInHtml(html, btnClass = SPEED_BTN_CLASS) {
  const raw = String(html || "");
  if (!raw) return "";
  return raw.replace(/(<[^>]+>)|([^<]+)/g, (full, tag, text) => {
    if (tag) return tag;
    SPEED_MENTION_RE.lastIndex = 0;
    return String(text).replace(SPEED_MENTION_RE, (_m, prefix, token) => {
      const id = resolveSpeedScenarioId(token);
      if (!id) return `${prefix}${token}`;
      return `${prefix}<button type="button" class="${btnClass}" data-speed-id="${id}" aria-label="查看 ${token} 使用場景說明">${token}</button>`;
    });
  });
}

export { SPEED_BTN_CLASS };
