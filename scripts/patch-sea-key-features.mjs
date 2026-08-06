/**
 * 更新馬來西亞／新加坡／泰國／香港／日本（10Mbps）商品的
 * key_features_by_carrier（含實際體驗），不重建變體。
 *
 * 用法：
 *   node scripts/patch-sea-key-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  umobileKeyFeatures,
  maxisCelcomDigiKeyFeatures,
} from "../content/product-detailed/malaysia-key-features.js";
import {
  singtelKeyFeatures,
  m1StarhubKeyFeatures,
} from "../content/product-detailed/singapore-key-features.js";
import {
  truemoveHKeyFeatures,
  trueDtacKeyFeatures,
  aisKeyFeatures,
  trueLocalTotalKeyFeatures,
} from "../content/product-detailed/thailand-key-features.js";
import { parseKeyFeaturesByCarrier } from "../lib/productKeyFeatures.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const env = fs.readFileSync(envPath, "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const EXP_128_HK =
  "高速額度內：市區測速常見可到數十 Mbps（視訊號而定）。高速用完後降速至約 128kbps，測速通常只有約 0.1Mbps 等級——傳訊息／輕量網頁勉強可以，影音與即時導航會明顯困難。請依額度規劃用量。僅供參考。";

const EXP_10MBPS_HK =
  "每日約 1GB 高速內：香港市區 4G／5G 測速常見可到數十 Mbps 以上。進入約 10Mbps 吃到飽後，測速多半落在約 7～12Mbps。導航、傳訊、網頁通常沒問題；720p 影音多半可看。僅供參考。";

const PATCHES = [
  {
    handle: "malaysia-unlimited-esim",
    replace: true,
    key_features_by_carrier: {
      "UMobile 5G 當地": umobileKeyFeatures("unlimited"),
      "Maxis / Celcom / Digi": maxisCelcomDigiKeyFeatures("unlimited"),
    },
  },
  {
    handle: "malaysia-daily-esim",
    replace: true,
    key_features_by_carrier: {
      "UMobile 5G 當地": umobileKeyFeatures("daily"),
      "Maxis / Celcom / Digi": maxisCelcomDigiKeyFeatures("daily"),
    },
  },
  {
    handle: "malaysia-total-esim",
    replace: true,
    key_features_by_carrier: {
      "UMobile 5G 當地": umobileKeyFeatures("total"),
      "Maxis / Celcom / Digi": maxisCelcomDigiKeyFeatures("total"),
    },
  },
  {
    handle: "singapore-unlimited-esim",
    replace: true,
    key_features_by_carrier: {
      Singtel: singtelKeyFeatures("unlimited"),
    },
  },
  {
    handle: "singapore-daily-esim",
    replace: true,
    key_features_by_carrier: {
      "M1 / Starhub": m1StarhubKeyFeatures("daily"),
    },
  },
  {
    handle: "singapore-total-esim",
    replace: true,
    key_features_by_carrier: {
      "M1 / Starhub": m1StarhubKeyFeatures("total"),
    },
  },
  {
    handle: "thailand-unlimited-esim",
    replace: true,
    key_features_by_carrier: {
      "Truemove H 當地號碼": truemoveHKeyFeatures(),
      "TRRE 電信": trueDtacKeyFeatures(),
    },
  },
  {
    handle: "thailand-total-esim",
    replace: true,
    key_features_by_carrier: {
      AIS: aisKeyFeatures(),
      TRUE: trueLocalTotalKeyFeatures(),
    },
  },
  {
    handle: "hongkong-unlimited-esim",
    replace: true,
    key_features_by_carrier: {
      "CSL / China Telecom HK": {
        bullets: [
          "CSL 與 China Telecom HK 是香港主流電信品牌，覆蓋港島、九龍、新界與主要旅遊熱點。本方案為香港 IP 吃到飽，適合短途出差與觀光。",
          "**為什麼選擇 CSL／中國電信香港吃到飽？**",
          "**香港 IP**：走當地網路節點，造訪本地網站與 App 體驗較接近在地用戶。",
          "**每日約 1GB 高速後約 10Mbps 吃到飽**：高速用完後可持續上網，不必擔心突然斷網。",
          "**支援熱點與常用 App**：熱點分享、ChatGPT、TikTok、Gemini 等皆可使用。",
        ],
        actual_experience: EXP_10MBPS_HK,
      },
    },
  },
  {
    handle: "hongkong-daily-esim",
    replace: true,
    key_features_by_carrier: {
      "CSL / SmarTone": {
        bullets: [
          "CSL 與 SmarTone 雙網漫遊，適合依天數與每日流量規劃用量的旅客。",
          "**每日高速額度**：依方案提供每日高速，用完後降速約 128kbps 可持續使用。",
          "**支援熱點與常用 App**：熱點、ChatGPT、TikTok、Gemini。",
        ],
        actual_experience: EXP_128_HK,
      },
    },
  },
  {
    handle: "hongkong-total-esim",
    replace: true,
    key_features_by_carrier: {
      "CSL / SmarTone": {
        bullets: [
          "CSL 與 SmarTone 雙網總量型，依天數與總流量選購。",
          "**總量高速額度**：高速用完後降速約 128kbps 可持續使用。",
          "**支援熱點與常用 App**：熱點、ChatGPT、TikTok、Gemini。",
        ],
        actual_experience: EXP_128_HK,
      },
    },
  },
  // japan-unlimited-esim：metadata 過大，admin API 更新易逾時／500，請於前台管理員編輯「重點特色」手動補 SoftBank 10Mbps 實際體驗
];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, apiPath, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${apiPath}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${apiPath}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return data;
}

function toMetaObject(map) {
  const out = {};
  for (const [carrier, entry] of Object.entries(map)) {
    if (Array.isArray(entry)) {
      out[carrier] = {
        bullets: entry.map(String),
        actual_experience: "",
      };
    } else {
      out[carrier] = {
        bullets: (entry.bullets || []).map(String),
        actual_experience: String(
          entry.actual_experience || entry.actualExperience || "",
        ),
      };
    }
  }
  return out;
}

async function main() {
  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  for (const patch of PATCHES) {
    const { products } = await admin(
      token,
      `/admin/products?handle=${encodeURIComponent(patch.handle)}&limit=1`,
    );
    const product = products?.[0];
    if (!product) {
      console.warn(`⚠️ 找不到 ${patch.handle}，略過`);
      continue;
    }
    const meta = { ...(product.metadata || {}) };
    const existing = parseKeyFeaturesByCarrier(meta.key_features_by_carrier) || {};

    let next;
    if (patch.replace) {
      next = toMetaObject(patch.key_features_by_carrier);
    } else {
      next = toMetaObject({
        ...Object.fromEntries(
          Object.entries(existing).map(([k, v]) => [
            k,
            {
              bullets: v.bullets || [],
              actual_experience: v.actualExperience || "",
            },
          ]),
        ),
        ...patch.merge,
      });
    }

    meta.key_features_by_carrier = next;
    await admin(token, `/admin/products/${product.id}`, {
      method: "POST",
      body: JSON.stringify({ metadata: meta }),
    });

    const withExp = Object.entries(next).filter(
      ([, v]) => v.actual_experience?.trim(),
    ).length;
    console.log(
      `✅ ${patch.handle} → ${Object.keys(next).length} 電信（含實際體驗 ${withExp}）`,
    );
  }
  console.log("\n完成。重新整理商品頁，展開「重點特色」即可看到實際體驗。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
