/**
 * 空庫後重建 JEKO Medusa 基礎：Sales Channel、TWD Region、分類、Publishable Key
 * 並把舊硬編碼 sc_/pcat_ ID 批次替換成新 ID（create-*-product.mjs）。
 *
 * 用法：
 *   MEDUSA_ADMIN_EMAIL=admin@esim.com MEDUSA_ADMIN_PASSWORD=12345678 \
 *     node scripts/bootstrap-jeko-store.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvLocal() {
  try {
    const envPath = path.join(ROOT, ".env.local");
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
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
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "admin@esim.com";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "12345678";

/** 舊 ID → 分類 handle（腳本註解／硬編碼對照） */
const OLD_CATEGORY_MAP = {
  pcat_01KZJNBV5DAJTWWG22KSHC7FTN: "japan",
  pcat_01KZJNBVGMVYJ9W659MWQB1E3Q: "korea",
  pcat_01KZJNBY9TVVRMVJ2YY7E679HM: "malaysia",
  pcat_01KZJNBXJX5EFQD5H7YSEXRWK1: "tailand", // 歷史 typo
  pcat_01KZJNBXZCA6X5PRVYMW5ZAZ0F: "singapore",
  pcat_01KZJNBYMN524P29B285E6XFF5: "vietnam",
  pcat_01KZJNBVVHY3ZHNJ4MPS9ZZVFG: "china",
  pcat_01KZJNBW76333EH5XBG62QJEHW: "kongkong",
  pcat_01KZJNBWGZ6FH1B2DRGNFMNMT3: "hongkong",
};

const CATEGORY_DEFS = [
  { handle: "japan", name: "日本", rank: 1 },
  { handle: "korea", name: "韓國", rank: 2 },
  { handle: "china", name: "中國", rank: 3 },
  { handle: "kongkong", name: "中港澳", rank: 4 },
  { handle: "hongkong", name: "香港", rank: 5 },
  { handle: "taiwan", name: "台灣", rank: 6 },
  { handle: "thailand", name: "泰國", rank: 7 },
  { handle: "tailand", name: "泰國", rank: 7 }, // 相容舊 handle
  { handle: "singapore", name: "新加坡", rank: 8 },
  { handle: "malaysia", name: "馬來西亞", rank: 9 },
  { handle: "vietnam", name: "越南", rank: 10 },
  { handle: "canada", name: "加拿大", rank: 11 },
  { handle: "australia", name: "澳洲", rank: 12 },
  { handle: "anz", name: "紐澳", rank: 13 },
  { handle: "new-zealand", name: "紐西蘭", rank: 14 },
  { handle: "france", name: "法國", rank: 15 },
  { handle: "turkey", name: "土耳其", rank: 16 },
];

const OLD_SALES_CHANNEL_ID = "sc_01KZJM34JQVWJHHKP9SRQY1EDN";

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    throw new Error(
      `登入失敗 ${res.status}: ${data.message || JSON.stringify(data)}`,
    );
  }
  return data.token;
}

async function api(token, method, pathName, body) {
  const res = await fetch(`${MEDUSA_URL}${pathName}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data.message || data.raw || text;
    throw new Error(`${method} ${pathName} → ${res.status}: ${msg}`);
  }
  return data;
}

async function ensureSalesChannel(token) {
  const list = await api(token, "GET", "/admin/sales-channels?limit=50");
  const existing = (list.sales_channels || []).find(
    (s) => s.name === "Default Sales Channel" || s.name === "JEKO Store",
  );
  if (existing) {
    console.log("✓ sales_channel", existing.id, existing.name);
    return existing;
  }
  const created = await api(token, "POST", "/admin/sales-channels", {
    name: "Default Sales Channel",
    description: "JEKO eSIM storefront",
  });
  console.log("✓ sales_channel created", created.sales_channel.id);
  return created.sales_channel;
}

async function ensureRegion(token) {
  const list = await api(token, "GET", "/admin/regions?limit=50");
  const existing = (list.regions || []).find(
    (r) =>
      String(r.currency_code || "").toLowerCase() === "twd" ||
      r.name === "Taiwan",
  );
  if (existing) {
    console.log("✓ region", existing.id, existing.currency_code);
    return existing;
  }
  const created = await api(token, "POST", "/admin/regions", {
    name: "Taiwan",
    currency_code: "twd",
    countries: ["tw"],
    payment_providers: ["pp_system_default"],
  });
  console.log("✓ region created", created.region.id);
  return created.region;
}

async function ensureStoreTwd(token) {
  try {
    const store = await api(token, "GET", "/admin/stores");
    const s = store.stores?.[0] || store.store;
    if (!s?.id) return;
    await api(token, "POST", `/admin/stores/${s.id}`, {
      supported_currencies: [
        { currency_code: "twd", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    });
    console.log("✓ store default currency twd");
  } catch (e) {
    console.warn("⚠️ store currency:", e.message);
  }
}

async function ensureCategories(token) {
  const list = await api(
    token,
    "GET",
    "/admin/product-categories?limit=100&include_descendants_tree=true",
  );
  const byHandle = new Map(
    (list.product_categories || []).map((c) => [c.handle, c]),
  );
  const out = {};
  for (const def of CATEGORY_DEFS) {
    if (byHandle.has(def.handle)) {
      out[def.handle] = byHandle.get(def.handle);
      console.log("✓ category", def.handle, out[def.handle].id);
      continue;
    }
    const created = await api(token, "POST", "/admin/product-categories", {
      name: def.name,
      handle: def.handle,
      is_active: true,
      is_internal: false,
      metadata: { rank: def.rank },
    });
    out[def.handle] = created.product_category;
    byHandle.set(def.handle, created.product_category);
    console.log("✓ category created", def.handle, out[def.handle].id);
  }
  return out;
}

async function ensurePublishableKey(token, salesChannelId) {
  const list = await api(token, "GET", "/admin/api-keys?limit=50&type=publishable");
  let key = (list.api_keys || []).find((k) =>
    String(k.title || "").includes("Webshop"),
  );
  if (!key) {
    key = (list.api_keys || [])[0];
  }
  if (!key) {
    const created = await api(token, "POST", "/admin/api-keys", {
      title: "Webshop",
      type: "publishable",
    });
    key = created.api_key;
    console.log("✓ publishable key created", key.id);
  } else {
    console.log("✓ publishable key", key.id, key.title);
  }

  // link sales channel
  try {
    await api(token, "POST", `/admin/api-keys/${key.id}/sales-channels`, {
      add: [salesChannelId],
    });
    console.log("✓ linked sales channel to publishable key");
  } catch (e) {
    // Medusa v2 may use different payload
    try {
      await api(token, "POST", `/admin/api-keys/${key.id}/sales-channels`, {
        sales_channel_ids: [salesChannelId],
      });
      console.log("✓ linked sales channel (alt payload)");
    } catch (e2) {
      console.warn("⚠️ link sales channel:", e2.message);
    }
  }

  // token / redacted — create response may include token once
  return key;
}

function upsertEnvLocal(updates) {
  const envPath = path.join(ROOT, ".env.local");
  let text = "";
  try {
    text = fs.readFileSync(envPath, "utf8");
  } catch {
    text = "";
  }
  const lines = text ? text.split("\n") : [];
  const seen = new Set();
  const out = lines.map((line) => {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) return line;
    const k = line.split("=", 1)[0];
    if (k in updates) {
      seen.add(k);
      return `${k}=${updates[k]}`;
    }
    return line;
  });
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}=${v}`);
  }
  fs.writeFileSync(envPath, out.join("\n").replace(/\n*$/, "\n"));
  console.log("✓ updated .env.local keys:", Object.keys(updates).join(", "));
}

function patchCreateScripts(salesChannelId, categoriesByHandle) {
  const idMap = {
    [OLD_SALES_CHANNEL_ID]: salesChannelId,
  };
  for (const [oldId, handle] of Object.entries(OLD_CATEGORY_MAP)) {
    const cat = categoriesByHandle[handle];
    if (cat?.id) idMap[oldId] = cat.id;
  }

  const scriptsDir = path.join(ROOT, "scripts");
  const files = fs
    .readdirSync(scriptsDir)
    .filter((f) => f.endsWith(".mjs"));
  let filesTouched = 0;
  let replacements = 0;
  for (const file of files) {
    const fp = path.join(scriptsDir, file);
    let src = fs.readFileSync(fp, "utf8");
    let next = src;
    for (const [from, to] of Object.entries(idMap)) {
      if (!from || !to || from === to) continue;
      const before = next;
      next = next.split(from).join(to);
      if (next !== before) {
        replacements += (before.split(from).length - 1);
      }
    }
    if (next !== src) {
      fs.writeFileSync(fp, next);
      filesTouched += 1;
      console.log("✓ patched", file);
    }
  }
  console.log(
    `✓ script patch done: ${filesTouched} files, ${replacements} replacements`,
  );
  return idMap;
}

async function main() {
  console.log("Medusa:", MEDUSA_URL);
  console.log("Admin:", EMAIL);
  const token = await login();
  const sc = await ensureSalesChannel(token);
  const region = await ensureRegion(token);
  await ensureStoreTwd(token);
  const cats = await ensureCategories(token);
  const pubKey = await ensurePublishableKey(token, sc.id);

  const idMap = patchCreateScripts(sc.id, cats);

  const outPath = path.join(ROOT, "scripts", ".medusa-jeko-ids.json");
  const payload = {
    medusaUrl: MEDUSA_URL,
    salesChannelId: sc.id,
    regionId: region.id,
    publishableKeyId: pubKey.id,
    publishableKeyToken: pubKey.token || null,
    categories: Object.fromEntries(
      Object.entries(cats).map(([h, c]) => [h, c.id]),
    ),
    idMap,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("✓ wrote", outPath);

  const envUpdates = {
    MEDUSA_ADMIN_EMAIL: EMAIL,
    MEDUSA_ADMIN_PASSWORD: PASSWORD,
  };
  if (pubKey.token) {
    envUpdates.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = pubKey.token;
  }
  upsertEnvLocal(envUpdates);

  if (!pubKey.token) {
    console.log(
      "\n⚠️ API key token 只在「新建當下」回傳一次。若這把 key 是舊的，請到 Admin → Settings → Publishable API Keys 複製 token，寫入 .env.local 的 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY。",
    );
  }

  console.log("\n下一步：");
  console.log("  HKD_TO_TWD=4.5 node scripts/create-japan-total-product.mjs --rebuild");
  console.log("  # …其餘 create-*-product.mjs");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
