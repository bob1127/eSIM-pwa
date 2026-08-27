/**
 * 為 line-oa/jeko_esim_line_ai_faq*.csv 回覆加上日式顏文字 + 結尾 🌼🌻
 * 用法：node scripts/patch-line-oa-faq-tone.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OA_DIR = path.join(__dirname, "../line-oa");

const FOOTER_CS =
  "若以上資訊還沒有解決您的問題，請稍候片刻，Jeko 客服人員會親自回覆您 (´∀｀*)ゞ 🌼🌻";
const SIGNATURE = " 🌼🌻";

function parseCsvRecords(text) {
  const records = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    if (text[i] === "\n" || text[i] === "\r") {
      i++;
      continue;
    }
    const readField = () => {
      if (text[i] === '"') {
        i++;
        let field = "";
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        return field;
      }
      let field = "";
      while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
        field += text[i];
        i++;
      }
      return field;
    };

    const keywords = readField();
    if (i < len && text[i] === ",") i++;
    const reply = readField();
    if (keywords.trim() === "常見問答範例" || !keywords.trim()) {
      while (i < len && text[i] !== "\n") i++;
      continue;
    }
    records.push({ keywords, reply });
    while (i < len && text[i] !== "\n") i++;
  }
  return records;
}

function escapeCsvField(s) {
  return `"${String(s).replace(/"/g, '""')}"`;
}

function pickTone(keywords, reply) {
  const k = keywords.toLowerCase();
  const r = reply;

  if (/謝謝|感謝|thanks|thank you|收到了|^ok$/i.test(k)) {
    return { open: "(*´▽`*)", mid: null, cs: true };
  }
  if (/不行|不能|無法|刪掉|重複掃|多人用/i.test(k + r)) {
    return { open: "(；´д｀)ゞ", mid: null, cs: true };
  }
  if (/連不上|掃不到|失敗|沒收到|寫錯|故障|不能用/i.test(k)) {
    return { open: "(´；ω；`)", mid: "(・ω・)ノ", cs: true };
  }
  if (/熱點|分享|tethering|給家人/i.test(k)) {
    return { open: "o(^▽^)o", mid: "(๑•̀ㅂ•́)و✧", cs: true };
  }
  if (/安裝|怎麼|如何|教學|設定|SM-DP|QR/i.test(k)) {
    return { open: "(・ω・)ノ", mid: "୧(๑•̀⌄•́๑)૭", cs: true };
  }
  if (/日本|韓國|泰國|香港|馬來|歐洲|多國|價格|買|方案|吃到飽|流量/i.test(k)) {
    return { open: "٩(●˙▿˙●)۶", mid: "(｡•̀ᴗ-)✧", cs: true };
  }
  if (/你好|hi|hello|哈囉|第一次|剛加入/i.test(k)) {
    return { open: "٩(●˙▿˙●)۶", mid: null, cs: false };
  }
  return { open: "(｡•̀ᴗ-)✧", mid: null, cs: true };
}

function alreadyStyled(reply) {
  return /🌼|🌻|٩\(|o\(\^▽\^\)o|\(\\*´▽`\*\)|\(；´д｀\)/.test(reply);
}

function patchReply(keywords, reply) {
  if (alreadyStyled(reply)) return reply;

  let body = reply.trim();
  const tone = pickTone(keywords, body);

  // 開頭：旅伴您好～ → 旅伴您好～ {kaomoji}
  if (/^旅伴您好[～~]?/.test(body)) {
    body = body.replace(/^旅伴您好([～~])?/, `旅伴您好$1 ${tone.open}`);
  } else if (/^不客氣/.test(body)) {
    body = body.replace(/^不客氣/, `不客氣 ${tone.open}`);
  }

  // 結尾：已有客服句則只加花朵；否則加完整 footer
  const hasCsLine = /我要找客服|客服人員|轉人工|親自回覆/.test(body);
  if (hasCsLine && !body.endsWith(SIGNATURE.trim())) {
    body = body.replace(/[。\.]?$/, "") + SIGNATURE;
  } else if (tone.cs && !hasCsLine) {
    body = `${body}\n\n${FOOTER_CS}`;
  } else if (!body.endsWith("🌻") && !body.endsWith("🌼")) {
    body = `${body}${SIGNATURE}`;
  }

  return body;
}

function serializeRecords(records) {
  const lines = ['\ufeff常見問答範例,回覆訊息'];
  for (const { keywords, reply } of records) {
    lines.push(`${escapeCsvField(keywords)},${escapeCsvField(reply)}`);
  }
  return lines.join("\n") + "\n";
}

function patchFile(filename) {
  const filePath = path.join(OA_DIR, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\ufeff/, "");
  const records = parseCsvRecords(raw);
  const patched = records.map((r) => ({
    keywords: r.keywords,
    reply: patchReply(r.keywords, r.reply),
  }));
  const out =
    filename.includes("utf8_bom") || filename.includes("bom")
      ? serializeRecords(patched)
      : serializeRecords(patched).replace(/^\ufeff/, "");
  fs.writeFileSync(filePath, out, "utf8");
  console.log(`patched ${filename}: ${patched.length} rows`);
}

patchFile("jeko_esim_line_ai_faq_utf8_bom.csv");
patchFile("jeko_esim_line_ai_faq.csv");
