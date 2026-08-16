/**
 * 把當地電信公司介紹寫進重點特色（不重建變體）
 * 英國／奧地利／土耳其／紐西蘭／紐澳／澳洲／加拿大
 *
 * 用法：
 *   node scripts/patch-carrier-intro-key-features.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ukUnlimited10MbpsKeyFeaturesByCarrier,
  ukUnlimitedFupKeyFeaturesByCarrier,
  ukTotalKeyFeaturesByCarrier,
  ukDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/uk-key-features.js";
import {
  atUnlimited36KeyFeaturesByCarrier,
  atUnlimited32KeyFeaturesByCarrier,
  atDaily41KeyFeaturesByCarrier,
  atDaily32KeyFeaturesByCarrier,
  atTotalKeyFeaturesByCarrier,
} from "../content/product-detailed/austria-key-features.js";
import {
  chUnlimited34KeyFeaturesByCarrier,
  chUnlimited41KeyFeaturesByCarrier,
  chTotalKeyFeaturesByCarrier,
  chDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/switzerland-key-features.js";
import {
  itUnlimited32KeyFeaturesByCarrier,
  itUnlimited41KeyFeaturesByCarrier,
  itTotalKeyFeaturesByCarrier,
  itDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/italy-key-features.js";
import {
  esUnlimited32KeyFeaturesByCarrier,
  esTotalKeyFeaturesByCarrier,
  esDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/spain-key-features.js";
import {
  trUnlimitedKeyFeaturesByCarrier,
  trTotalKeyFeaturesByCarrier,
  trDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/turkey-key-features.js";
import {
  nzUnlimitedKeyFeaturesByCarrier,
  nzTotalKeyFeaturesByCarrier,
  nzDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/new-zealand-key-features.js";
import { anzUnlimitedKeyFeaturesByCarrier } from "../content/product-detailed/anz-key-features.js";
import {
  australiaUnlimitedKeyFeaturesByCarrier,
  australiaTotalKeyFeaturesByCarrier,
  australiaDailyKeyFeaturesByCarrier,
} from "../content/product-detailed/australia-key-features.js";
import {
  canadaTotalKeyFeaturesByCarrier,
  canadaDailyKeyFeaturesByCarrier,
  canadaUnlimitedKeyFeaturesByCarrier,
} from "../content/product-detailed/canada-key-features.js";
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

const PATCHES = [
  {
    handle: "uk-unlimited-esim",
    key_features_by_carrier: {
      ...ukUnlimited10MbpsKeyFeaturesByCarrier(),
      ...ukUnlimitedFupKeyFeaturesByCarrier(),
    },
  },
  {
    handle: "uk-total-esim",
    key_features_by_carrier: ukTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "uk-daily-esim",
    key_features_by_carrier: ukDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "austria-unlimited-esim",
    key_features_by_carrier: {
      ...atUnlimited36KeyFeaturesByCarrier(),
      ...atUnlimited32KeyFeaturesByCarrier(),
    },
  },
  {
    handle: "switzerland-unlimited-esim",
    key_features_by_carrier: {
      ...chUnlimited34KeyFeaturesByCarrier(),
      ...chUnlimited41KeyFeaturesByCarrier(),
    },
  },
  {
    handle: "switzerland-total-esim",
    key_features_by_carrier: chTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "switzerland-daily-esim",
    key_features_by_carrier: chDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "italy-unlimited-esim",
    key_features_by_carrier: {
      ...itUnlimited32KeyFeaturesByCarrier(),
      ...itUnlimited41KeyFeaturesByCarrier(),
    },
  },
  {
    handle: "italy-total-esim",
    key_features_by_carrier: itTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "italy-daily-esim",
    key_features_by_carrier: itDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "spain-unlimited-esim",
    key_features_by_carrier: esUnlimited32KeyFeaturesByCarrier(),
  },
  {
    handle: "spain-total-esim",
    key_features_by_carrier: esTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "spain-daily-esim",
    key_features_by_carrier: esDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "austria-daily-esim",
    key_features_by_carrier: {
      ...atDaily41KeyFeaturesByCarrier(),
      ...atDaily32KeyFeaturesByCarrier(),
    },
  },
  {
    handle: "austria-total-esim",
    key_features_by_carrier: atTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "turkey-unlimited-esim",
    key_features_by_carrier: trUnlimitedKeyFeaturesByCarrier(),
  },
  {
    handle: "turkey-total-esim",
    key_features_by_carrier: trTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "turkey-daily-esim",
    key_features_by_carrier: trDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "new-zealand-unlimited-esim",
    key_features_by_carrier: nzUnlimitedKeyFeaturesByCarrier(),
  },
  {
    handle: "new-zealand-total-esim",
    key_features_by_carrier: nzTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "new-zealand-daily-esim",
    key_features_by_carrier: nzDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "anz-unlimited-esim",
    key_features_by_carrier: anzUnlimitedKeyFeaturesByCarrier(),
  },
  {
    handle: "australia-unlimited-esim",
    key_features_by_carrier: australiaUnlimitedKeyFeaturesByCarrier(),
  },
  {
    handle: "australia-total-esim",
    key_features_by_carrier: australiaTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "australia-daily-esim",
    key_features_by_carrier: australiaDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "canada-total-esim",
    key_features_by_carrier: canadaTotalKeyFeaturesByCarrier(),
  },
  {
    handle: "canada-daily-esim",
    key_features_by_carrier: canadaDailyKeyFeaturesByCarrier(),
  },
  {
    handle: "canada-unlimited-esim",
    key_features_by_carrier: canadaUnlimitedKeyFeaturesByCarrier(),
  },
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
    out[carrier] = {
      bullets: (entry.bullets || []).map(String),
      actual_experience: String(
        entry.actual_experience || entry.actualExperience || "",
      ),
    };
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
    parseKeyFeaturesByCarrier(meta.key_features_by_carrier);
    meta.key_features_by_carrier = toMetaObject(patch.key_features_by_carrier);
    await admin(token, `/admin/products/${product.id}`, {
      method: "POST",
      body: JSON.stringify({ metadata: meta }),
    });
    console.log(
      `✅ ${patch.handle} → ${Object.keys(meta.key_features_by_carrier).length} 電信`,
    );
  }
  console.log("\n完成。重新整理商品頁即可看到當地電信介紹。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
