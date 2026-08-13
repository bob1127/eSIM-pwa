/**
 * 更新「中國大陸 eSIM 總量型」：
 * - 標題／文案：總計型 → 總量型
 * - 從 /api/esim/list 同步 rule_desc / speed_desc，並寫入 attributes.speed_rule
 *
 * 用法：
 *   node --env-file=.env.local scripts/update-china-total-product.mjs
 */
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { internalCatalogHeaders } from "./lib/internal-catalog-headers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, "..", ".env.local");
    const env = readFileSync(envPath, "utf8");
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
const HANDLE = "china-total-esim";
const FRONTEND = (
  process.env.ESIM_LIST_BASE ||
  process.env.STOREFRONT_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
/** list 本機常回空；test-list 有完整 rule_desc / speed */
const ESIM_LIST_PATH =
  process.env.ESIM_LIST_PATH || "/api/esim/test-list";
const BATCH_SIZE = 15;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function extractSpeedLabel(...texts) {
  const blob = texts
    .filter((t) => t != null && String(t).trim())
    .map(String)
    .join(" ");
  if (!blob) return "";
  let m = blob.match(
    /(?:speed\s*(?:of\s*4g[,，]?\s*)?speed\s*between|between|約)?\s*(\d+)\s*[~～\-–—到至]\s*(\d+)\s*Mbps/i,
  );
  if (m) return `約 ${m[1]}–${m[2]} Mbps`;
  m = blob.match(/(\d+)\s*Mbps/i);
  if (m) return `約 ${m[1]} Mbps`;
  m = blob.match(/unlimited\s+(\d+)\s*kbps/i);
  if (m) return `高速用完後降速至 ${m[1]} kbps`;
  m = blob.match(/(\d+)\s*kbps/i);
  if (m) return `${m[1]} kbps`;
  return "";
}

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

async function main() {
  const token = await login();
  const listRes = await fetch(
    `${MEDUSA_URL}/admin/products?handle=${HANDLE}&limit=1&fields=*variants,*metadata`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const product = (await listRes.json()).products?.[0];
  if (!product) throw new Error(`product ${HANDLE} not found`);

  const listUrl = `${FRONTEND}${ESIM_LIST_PATH}`;
  console.log("fetch plans", listUrl);
  const plansRes = await fetch(listUrl, { headers: internalCatalogHeaders() });
  if (!plansRes.ok) throw new Error(`esim list ${plansRes.status}`);
  const plans = (await plansRes.json()).result || [];
  console.log("plans loaded", plans.length);
  const bySku = new Map(
    plans.map((p) => [String(p.channel_dataplan_name || p.name || ""), p]),
  );

  const meta = { ...(product.metadata || {}) };
  meta.carrier_specs_by_carrier = {
    ...(meta.carrier_specs_by_carrier || {}),
    中國移動: {
      ...(meta.carrier_specs_by_carrier?.["中國移動"] || {}),
      ip_type: "香港IP",
      route_type: "漫遊",
      network: "4G/5G",
      speed_rule: "高速用完後降速至 128 kbps",
      apps: "熱點分享,Gemini",
    },
    "GPT + TikTok": {
      ...(meta.carrier_specs_by_carrier?.["GPT + TikTok"] ||
        meta.carrier_specs_by_carrier?.["中國聯通 GPT + TikTok (CUCC)"] ||
        meta.carrier_specs_by_carrier?.["中國移動 GPT + TikTok"] ||
        {}),
      ip_type: "新加坡IP",
      route_type: "漫遊",
      network: "CUCC 4G/5G",
        speed_rule: "流量用完即斷網（實際速度依當地網路）",
        apps: "熱點分享,ChatGPT,TikTok",
      },
      中國聯通: {
        ...(meta.carrier_specs_by_carrier?.["中國聯通"] || {}),
        ip_type: "新加坡IP",
        route_type: "漫遊",
        network: "4G/5G",
        speed_rule: "高速用完後降速至 128 kbps",
        apps: "熱點分享,ChatGPT,TikTok",
      },
    };
    // 移除舊電信選項 key，避免前台殘留
    for (const k of [
      "中國移動 GPT + TikTok",
      "中國聯通 GPT + TikTok (CMCC)",
      "中國聯通 GPT + TikTok (CUCC)",
    ]) {
      if (meta.carrier_specs_by_carrier?.[k]) {
        delete meta.carrier_specs_by_carrier[k];
      }
    }
    meta.key_features_by_carrier = {
      中國移動: ["總量型", "熱點分享", "4G / 5G", "高速用完後降速至 128 kbps"],
      "GPT + TikTok": [
        "總量型",
        "支援 TikTok",
        "支援 ChatGPT",
        "用完斷網",
        "4G / 5G",
      ],
      中國聯通: [
        "總量型",
        "支援 TikTok",
        "支援 ChatGPT",
        "4G / 5G",
        "高速用完後降速至 128 kbps",
      ],
    };
    for (const k of [
      "中國移動 GPT + TikTok",
      "中國聯通 GPT + TikTok (CMCC)",
      "中國聯通 GPT + TikTok (CUCC)",
    ]) {
      if (meta.key_features_by_carrier?.[k]) {
        delete meta.key_features_by_carrier[k];
      }
    }
    meta.subtitle_by_carrier = {
      中國移動: "總量型・高速用完後降速至 128 kbps",
      "GPT + TikTok": "總量型・流量用完即斷網・支援 TikTok 與 ChatGPT",
      中國聯通: "總量型・高速用完後降速至 128 kbps",
    };
  for (const k of [
    "中國移動 GPT + TikTok",
    "中國聯通 GPT + TikTok (CMCC)",
    "中國聯通 GPT + TikTok (CUCC)",
  ]) {
    if (meta.subtitle_by_carrier?.[k]) {
      delete meta.subtitle_by_carrier[k];
    }
  }
  meta.hot_sale_telecoms = ["GPT + TikTok", "中國聯通"];
  meta.carrier_profit_by_carrier = {
    ...(meta.carrier_profit_by_carrier || {}),
    "GPT + TikTok": 50,
  };
  for (const k of [
    "中國移動 GPT + TikTok",
    "中國聯通 GPT + TikTok (CMCC)",
    "中國聯通 GPT + TikTok (CUCC)",
  ]) {
    if (meta.carrier_profit_by_carrier?.[k] != null) {
      delete meta.carrier_profit_by_carrier[k];
    }
  }
  meta.overview_notices_by_carrier = {
    ...(meta.overview_notices_by_carrier || {}),
    中國移動: {
      fup_notice:
        "總量型：高速流量用完後降速至 128 kbps（可持續使用）；不支援 GPT／TikTok（香港 IP）",
      activation_notice: "建議抵達中國後再安裝／啟用 eSIM",
    },
  };

  const upd = await fetch(`${MEDUSA_URL}/admin/products/${product.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "中國大陸 eSIM 總量型",
      subtitle: "總量型用量方案・依電信商速度與 App 支援不同",
      description: String(product.description || "").replace(/總計型/g, "總量型"),
      metadata: meta,
    }),
  });
  if (!upd.ok) throw new Error(await upd.text());
  console.log("product → 中國大陸 eSIM 總量型");

  let withSpeed = 0;
  let matchedApi = 0;
  const updates = [];
  for (const v of product.variants || []) {
    const api = bySku.get(v.sku);
    const m = { ...(v.metadata || {}) };
    const attrs = {
      ...(typeof m.attributes === "object" && m.attributes
        ? m.attributes
        : {}),
    };
    if (api) {
      matchedApi++;
      m.rule_desc = api.rule_desc || m.rule_desc || "";
      m.speed_desc = api.speed_desc || api.special_desc || m.speed_desc || "";
      if (api.networks) m.networks = api.networks;
    }
    const extracted = extractSpeedLabel(
      attrs.speed_rule,
      m.speed_desc,
      m.rule_desc,
    );
    if (extracted) {
      attrs.speed_rule = extracted;
      withSpeed++;
    }
    if (attrs.network) {
      attrs.network = String(attrs.network)
        .replace(/5G 極速/g, "4G / 5G")
        .replace(/5G\/4G/g, "4G/5G");
    }
    m.attributes = attrs;
    updates.push({ id: v.id, sku: v.sku, metadata: m });
  }

  let ok = 0;
  let fail = 0;
  for (const [bi, batch] of chunk(updates, BATCH_SIZE).entries()) {
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${product.id}/variants/batch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          update: batch.map(({ id, metadata }) => ({ id, metadata })),
        }),
      },
    );
    if (!res.ok) {
      fail += batch.length;
      console.log(
        `batch ${bi + 1} fail`,
        (await res.text()).slice(0, 200),
      );
    } else {
      ok += batch.length;
      console.log(`batch ${bi + 1}/${Math.ceil(updates.length / BATCH_SIZE)} ok ${batch.length}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        variants: updates.length,
        patched_ok: ok,
        patched_fail: fail,
        matched_api: matchedApi,
        with_numeric_speed: withSpeed,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
