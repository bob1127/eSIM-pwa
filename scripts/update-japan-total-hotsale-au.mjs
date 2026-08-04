/**
 * 日本總量型：
 *   1) hot_sale_telecoms → ["AU(KDDI)", "KDDI / SoftBank"]
 *   2) 電信商選項「KDDI」→「AU(KDDI)」（變體 + metadata keys）
 *
 *   node scripts/update-japan-total-hotsale-au.mjs
 *   node scripts/update-japan-total-hotsale-au.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    headersTimeout: 10 * 60 * 1000,
    bodyTimeout: 10 * 60 * 1000,
    connectTimeout: 60 * 1000,
  }),
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnvLocal() {
  try {
    const env = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
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
      )
        v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}
loadEnvLocal();

const DRY = process.argv.includes("--dry-run");
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "japan-total-esim";
const OLD = "KDDI";
const NEW = "AU(KDDI)";
const HOT = ["AU(KDDI)", "KDDI / SoftBank"];
const BATCH = 30;

function renameCarrierKeys(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  if (!(OLD in obj)) return obj;
  const next = { ...obj };
  next[NEW] = next[OLD];
  delete next[OLD];
  return next;
}

function rewriteCarrierText(s) {
  if (typeof s !== "string") return s;
  // 先保護「KDDI / SoftBank」，避免被改成 AU(KDDI)
  const DUAL = "KDDI / SoftBank";
  const TOKEN = "__DUAL_TELECOM__";
  let out = s.split(DUAL).join(TOKEN);
  out = out
    .replaceAll("IIJ(DOCOMO)・KDDI・", "IIJ(DOCOMO)・AU(KDDI)・")
    .replaceAll("、KDDI 原生", "、AU(KDDI) 原生")
    .replaceAll("・KDDI・", "・AU(KDDI)・")
    .replaceAll("KDDI (au)", "AU(KDDI)")
    .replace(/(^|[^/(A-Za-z])KDDI(?!\s*\/)/g, "$1AU(KDDI)");
  return out.split(TOKEN).join(DUAL);
}

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(`login fail: ${res.status}`);
  return data.token;
}

async function admin(token, p, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${p}] non-JSON ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${p}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 400)}`,
    );
  }
  return data;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function getTelecom(v) {
  const fromOpt = (v.options || []).find(
    (o) => o.option?.title === "電信商" || o.title === "電信商",
  );
  if (fromOpt?.value) return fromOpt.value;
  return (
    v.metadata?.attributes?.telecom ||
    v.metadata?.carrier ||
    ""
  );
}

const token = await login();
const { products } = await admin(
  token,
  `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*variants.options,*variants.options.option,*options,*metadata`,
);
const product = products?.[0];
if (!product) throw new Error("product not found");

const meta = { ...(product.metadata || {}) };
meta.hot_sale_telecoms = HOT;
meta.carrier_profit_by_carrier = renameCarrierKeys(meta.carrier_profit_by_carrier);
meta.subtitle_by_carrier = renameCarrierKeys(meta.subtitle_by_carrier);
meta.carrier_specs_by_carrier = renameCarrierKeys(meta.carrier_specs_by_carrier);
meta.key_features_by_carrier = renameCarrierKeys(meta.key_features_by_carrier);
meta.overview_notices_by_carrier = renameCarrierKeys(
  meta.overview_notices_by_carrier,
);

if (meta.subtitle_by_carrier?.[NEW]) {
  meta.subtitle_by_carrier[NEW] = String(meta.subtitle_by_carrier[NEW]).replace(
    /KDDI 原生/,
    "AU(KDDI) 原生",
  );
}
if (meta.carrier_specs_by_carrier?.[NEW]) {
  const spec = { ...meta.carrier_specs_by_carrier[NEW] };
  if (spec.network) spec.network = "AU(KDDI) 4G/5G";
  meta.carrier_specs_by_carrier[NEW] = spec;
}
if (Array.isArray(meta.key_features_by_carrier?.[NEW])) {
  meta.key_features_by_carrier[NEW] = meta.key_features_by_carrier[NEW].map(
    (x) => (x === "KDDI" ? "AU(KDDI)" : x),
  );
}
if (meta.overview_notices_by_carrier?.[NEW]?.fup_notice) {
  meta.overview_notices_by_carrier[NEW] = {
    ...meta.overview_notices_by_carrier[NEW],
    fup_notice: String(
      meta.overview_notices_by_carrier[NEW].fup_notice,
    ).replace(/KDDI \(au\)/, "AU(KDDI)"),
  };
}

meta.seo_title = rewriteCarrierText(meta.seo_title || "");
meta.seo_description = rewriteCarrierText(meta.seo_description || "");
meta.seo_keywords = String(meta.seo_keywords || "").replace(
  /,KDDI,/,
  ",AU,KDDI,",
);

const subtitle = rewriteCarrierText(product.subtitle || "");
const description = rewriteCarrierText(product.description || "");

const telecomOpt = (product.options || []).find((o) => o.title === "電信商");
const optionValues = (telecomOpt?.values || []).map((v) =>
  v.value === OLD ? NEW : v.value,
);
if (!optionValues.includes(NEW) && optionValues.includes(OLD)) {
  /* mapped above */
}
const uniqueTelecoms = [
  ...new Set(
    optionValues.length ? optionValues : ["IIJ(DOCOMO)", NEW, "KDDI / SoftBank"],
  ),
];

console.log("hot_sale_telecoms =>", meta.hot_sale_telecoms);
console.log("電信商選項 =>", uniqueTelecoms.join(" | "));
console.log("subtitle =>", subtitle);

const variants = product.variants || [];
const toUpdate = [];
for (const v of variants) {
  const telecom = getTelecom(v);
  if (telecom !== OLD) continue;
  const opts = {};
  for (const o of v.options || []) {
    const title = o.option?.title || o.title;
    if (!title) continue;
    opts[title] = title === "電信商" ? NEW : o.value;
  }
  if (!opts["電信商"]) opts["電信商"] = NEW;
  const md = { ...(v.metadata || {}) };
  if (md.carrier === OLD) md.carrier = NEW;
  if (md.attributes && typeof md.attributes === "object") {
    md.attributes = {
      ...md.attributes,
      telecom: NEW,
      network: "AU(KDDI) 4G/5G",
    };
  }
  const title = String(v.title || "").replace(/^KDDI ·/, "AU(KDDI) ·");
  toUpdate.push({
    id: v.id,
    title,
    options: opts,
    metadata: md,
  });
}

console.log(`需改名變體: ${toUpdate.length} / ${variants.length}`);

if (DRY) {
  console.log("[dry-run] skip write");
  process.exit(0);
}

await admin(token, `/admin/products/${product.id}`, {
  method: "POST",
  body: JSON.stringify({
    subtitle,
    description,
    metadata: meta,
    options: [
      ...(product.options || [])
        .filter((o) => o.title !== "電信商")
        .map((o) => ({
          title: o.title,
          values: (o.values || []).map((x) => x.value),
        })),
      { title: "電信商", values: uniqueTelecoms },
    ],
  }),
});
console.log("✅ product metadata / options updated");

for (const [i, batch] of chunk(toUpdate, BATCH).entries()) {
  await admin(token, `/admin/products/${product.id}/variants/batch`, {
    method: "POST",
    body: JSON.stringify({ update: batch }),
  });
  console.log(`  ~ batch ${i + 1}: ${batch.length} variants renamed`);
}

console.log("✅ done");
