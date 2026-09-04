/**
 * chat_logs 寫入／FAQ 掃描共用過濾
 * 略過：preset／quick、問候、過短碎片、規劃表單題、裝置型號關鍵字
 */
import { isAiChatQuickButtonQuestion } from "./aiChatPresets";

export function isQuickOrPresetProvider(provider) {
  const p = String(provider || "")
    .trim()
    .toLowerCase();
  return p === "preset" || p === "quick";
}

/** 純裝置型號／型號關鍵字（例：iPhone 15pro），非完整問題 */
export function isDeviceModelOnlyQuestion(content) {
  const t = String(content || "").trim();
  if (!t || t.length > 40) return false;
  if (
    /^(iphone|ipad|ipod|pixel|galaxy|samsung|xiaomi|redmi|oppo|vivo|huawei|sony|asus|rog|nothing)\b[\w\s.+-]{0,28}$/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/^(小米|紅米|華為|三星|索尼|蘋果)[\w\s\d.+-]{0,20}$/u.test(t)) return true;
  return false;
}

/** 過短、像點選／關鍵字碎片（無問句結構） */
export function isKeywordFragmentQuestion(content) {
  const t = String(content || "").trim();
  const hasCue =
    /[?？]|嗎|呢|怎麼|如何|什麼|為何|為什麼|能不能|可不可以|是否|哪[裡裏個天]|有沒有|多久|幾天|怎辦|怎麼辦|失敗|錯誤|沒訊號|連不上|打不開|收不到|要怎|裝不了|開不了|用不了/.test(
      t,
    );
  if (hasCue) return false;
  return t.length < 18;
}

/** 使用者訊息是否為無效／低價值（不寫入 DB、不進 FAQ） */
export function isNoiseUserMessage(content, provider) {
  const t = String(content || "").trim();
  if (t.length < 4) return true;
  if (t.length > 500) return true;
  if (isQuickOrPresetProvider(provider)) return true;
  if (/^(嗨|你好|您好|hi|hello|hey|在嗎|哈囉)[!！.。\s]*$/i.test(t)) return true;
  if (t.includes("先選你想了解的服務") || t.includes("嗨！我是 J寶")) return true;
  if (
    t.includes("請幫我推薦適合的 eSIM") ||
    t.includes("【eSIM專推】") ||
    (t.includes("旅遊地點：") && t.includes("使用習慣："))
  ) {
    return true;
  }
  if (isAiChatQuickButtonQuestion(t)) return true;
  if (isDeviceModelOnlyQuestion(t)) return true;
  if (isKeywordFragmentQuestion(t)) return true;
  return false;
}

export function isUsableAiAnswer(content) {
  const t = String(content || "").trim();
  if (t.length < 12) return false;
  if (t.includes("超出我的服務範圍")) return false;
  if (t.includes("服務暫時不可用")) return false;
  if (/^🤖/.test(t)) return false;
  if (/^您使用的是\s/.test(t)) return false;
  if (/^安裝 eSIM 時遇到問題嗎/.test(t)) return false;
  return true;
}

/**
 * 過濾即將寫入 chat_logs 的訊息列。
 * - preset／quick 整對略過
 * - noise 使用者訊息略過，同批緊接的 AI 回覆一併略過
 * - agent（真人）一律保留
 *
 * @param {Array<{ role?: string, content?: string, provider?: string }>} messages
 */
export function filterChatLogMessagesForPersist(messages = []) {
  const list = Array.isArray(messages) ? messages : [];
  const out = [];

  for (let i = 0; i < list.length; i += 1) {
    const m = list[i];
    if (!m?.role || m.content == null || String(m.content).trim() === "") {
      continue;
    }

    const role = ["user", "ai", "agent"].includes(m.role) ? m.role : "user";
    const provider = m.provider || null;

    if (role === "agent") {
      out.push({ ...m, role });
      continue;
    }

    if (isQuickOrPresetProvider(provider)) continue;

    if (role === "user") {
      if (isNoiseUserMessage(m.content, provider)) continue;
      out.push({ ...m, role });
      continue;
    }

    // ai：若前一則原始訊息是被略過的 user，則此回覆也不存
    if (role === "ai") {
      const prev = list[i - 1];
      if (
        prev?.role === "user" &&
        (isQuickOrPresetProvider(prev.provider) ||
          isNoiseUserMessage(prev.content, prev.provider))
      ) {
        continue;
      }
      if (!isUsableAiAnswer(m.content) && String(m.content).trim().length < 12) {
        continue;
      }
      out.push({ ...m, role });
    }
  }

  return out;
}

/** 預設保留天數（可用 CHAT_LOGS_TTL_DAYS 覆寫，範圍 14～365） */
export function getChatLogsTtlDays() {
  const n = Number(process.env.CHAT_LOGS_TTL_DAYS || 90);
  if (!Number.isFinite(n)) return 90;
  return Math.min(365, Math.max(14, Math.floor(n)));
}
