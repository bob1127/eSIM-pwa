const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios"); // 建議使用 axios 處理更穩定

// 🔐 預設接測試環境；正式抓方案清單請改 .env
const ACCOUNT = process.env.ESIM_ACCOUNT || "test_account_9999";
const SECRET = process.env.ESIM_SECRET || "7119968f9ff07654ga485487822g";
const SALT_HEX = process.env.ESIM_SALT || "c38ab89bd01537b3915848d689090e56";
const BASE_URL = process.env.ESIM_BASE_URL || "https://test.microesim.com";

// --- 簽章生成工具 (MicroEsim 規格) ---
function signHeaders() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto.pbkdf2Sync(
    SECRET,
    Buffer.from(SALT_HEX, "hex"),
    1024,
    32,
    "sha256"
  ).toString("hex");
  const dataToSign = ACCOUNT + nonce + timestamp;
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey, "utf8"))
    .update(dataToSign)
    .digest("hex");
  return { timestamp, nonce, signature };
}

async function main() {
  console.log("📡 正在從 MicroEsim 抓取最新方案清單...");
  
  const { timestamp, nonce, signature } = signHeaders();
  
  try {
    const res = await axios.get(`${BASE_URL}/allesim/v1/esimDataplanList`, {
      headers: {
        "Content-Type": "application/json",
        "MICROESIM-ACCOUNT": ACCOUNT,
        "MICROESIM-NONCE": nonce,
        "MICROESIM-TIMESTAMP": timestamp,
        "MICROESIM-SIGN": signature,
      },
      timeout: 20000
    });

    const plans = res.data?.result || [];
    if (plans.length === 0) throw new Error("供應商回傳清單為空");

    const map = {};

    for (const p of plans) {
      // 🚀 優化 Key 生成邏輯：
      // 1. 如果有 location (SKU 代碼)，優先使用它
      // 2. 如果沒有，才使用名稱並清理字元
      const rawName = p.location || p.channel_dataplan_name;
      
      if (rawName && p.channel_dataplan_id) {
        const cleanedKey = rawName
          .trim()
          .replace(/\u200B/g, "") // 移除零寬空格
          .replace(/\s+/g, "-")    // 將空格換成 -
          .replace(/-+/g, "-");    // 合併多個 -
        
        // 存入對照表 (Key 為清理後的名稱, Value 為供應商真實 ID)
        map[cleanedKey] = p.channel_dataplan_id;
      }
    }

    const content =
      "// ⚠️ 自動生成，勿手動編輯\n" +
      "const PLAN_ID_MAP: Record<string, string> = " +
      JSON.stringify(map, null, 2) +
      ";\n\nexport default PLAN_ID_MAP;\n";

    fs.writeFileSync("lib/esim/planMap.ts", content);
    console.log(`✅ 已成功同步 ${Object.keys(map).length} 個方案至 lib/esim/planMap.ts`);
    
  } catch (error) {
    console.error("❌ 同步失敗:", error.response?.data || error.message);
  }
}

main();