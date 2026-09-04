/**
 * 批次為商品掛上「商品類型」（扁平：虛擬商品 / 實體商品）
 *
 * 規則：
 * - 系列 handle=esim 或標題／handle 含 esim → 虛擬商品
 * - 系列 handle=physical|accessories|product（實體系列）或標題像配件 → 實體商品
 *
 * 用法：
 *   node scripts/assign-product-types.mjs
 *   node scripts/assign-product-types.mjs --dry-run
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
const DRY = process.argv.includes("--dry-run");

const VIRTUAL_TYPE_TITLES = ["虛擬商品", "virtual", "esim", "數位商品"];
const PHYSICAL_TYPE_TITLES = ["實體商品", "實體產品", "physical", "配件"];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  const token = data.token || data.access_token;
  if (!token) throw new Error(`登入失敗: ${JSON.stringify(data)}`);
  return token;
}

async function admin(token, pathName, opts = {}) {
  const res = await fetch(`${MEDUSA_URL}${pathName}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `${opts.method || "GET"} ${pathName} → ${res.status}: ${JSON.stringify(data)}`,
    );
  }
  return data;
}

function matchType(types, titles) {
  const lower = titles.map((t) => t.toLowerCase());
  return (
    types.find((t) => lower.includes(String(t.value || "").toLowerCase())) ||
    types.find((t) =>
      lower.some((x) => String(t.value || "").toLowerCase().includes(x)),
    ) ||
    null
  );
}

function isEsimProduct(p) {
  const col = String(p.collection?.handle || p.collection?.title || "").toLowerCase();
  const handle = String(p.handle || "").toLowerCase();
  const title = String(p.title || "").toLowerCase();
  if (col === "esim" || col.includes("esim")) return true;
  if (handle.includes("esim") || title.includes("esim")) return true;
  if (/吃到飽|總量型|每日型/.test(title)) return true;
  return false;
}

function isPhysicalProduct(p) {
  const col = String(p.collection?.handle || p.collection?.title || "").toLowerCase();
  const handle = String(p.handle || "").toLowerCase();
  const title = String(p.title || "").toLowerCase();
  if (["physical", "accessories", "product", "實體商品"].some((x) => col === x || col.includes(x))) {
    return true;
  }
  if (/usb|cable|線|轉接|配件|charger|充電/.test(`${handle} ${title}`)) {
    return true;
  }
  return false;
}

async function listAllProducts(token) {
  const out = [];
  let offset = 0;
  const limit = 50;
  for (;;) {
    const data = await admin(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,handle,type_id,*type,*collection`,
    );
    const batch = data.products || [];
    out.push(...batch);
    if (batch.length < limit) break;
    offset += limit;
  }
  return out;
}

async function main() {
  console.log(DRY ? "🔍 dry-run（不會寫入）" : "✍️  將寫入商品類型…");
  const token = await login();

  const typesData = await admin(token, "/admin/product-types?limit=50");
  const types = typesData.product_types || [];
  console.log(
    "商品類型:",
    types.map((t) => `${t.value} (${t.id})`).join(", ") || "(無)",
  );

  const virtualType = matchType(types, VIRTUAL_TYPE_TITLES);
  const physicalType = matchType(types, PHYSICAL_TYPE_TITLES);
  if (!virtualType) {
    throw new Error('找不到類型「虛擬商品」，請先在設定 → 商品類型建立');
  }
  if (!physicalType) {
    throw new Error('找不到類型「實體商品」，請先在設定 → 商品類型建立');
  }
  console.log(`虛擬 → ${virtualType.value} (${virtualType.id})`);
  console.log(`實體 → ${physicalType.value} (${physicalType.id})`);

  const products = await listAllProducts(token);
  console.log(`共 ${products.length} 個商品`);

  let nVirtual = 0;
  let nPhysical = 0;
  let nSkip = 0;
  let nAlready = 0;

  for (const p of products) {
    let target = null;
    let kind = "";
    if (isEsimProduct(p)) {
      target = virtualType;
      kind = "虛擬";
    } else if (isPhysicalProduct(p)) {
      target = physicalType;
      kind = "實體";
    } else {
      // 預設：有國家分類／變體很多的當虛擬；其餘跳過
      if (isEsimProduct(p) === false && /-(unlimited|daily|total)-esim/i.test(p.handle || "")) {
        target = virtualType;
        kind = "虛擬";
      } else {
        nSkip++;
        console.log(`  ⏭  略過（無法判定）: ${p.title} [${p.handle}]`);
        continue;
      }
    }

    if (p.type_id === target.id) {
      nAlready++;
      continue;
    }

    console.log(
      `  ${kind}: ${p.title} ← ${p.type?.value || "(無)"} → ${target.value}`,
    );
    if (!DRY) {
      await admin(token, `/admin/products/${p.id}`, {
        method: "POST",
        body: JSON.stringify({ type_id: target.id }),
      });
    }
    if (kind === "虛擬") nVirtual++;
    else nPhysical++;
  }

  console.log("\n完成");
  console.log(`  設為虛擬: ${nVirtual}`);
  console.log(`  設為實體: ${nPhysical}`);
  console.log(`  已正確: ${nAlready}`);
  console.log(`  略過: ${nSkip}`);
  if (DRY) console.log("（dry-run，未實際寫入；拿掉 --dry-run 再跑一次）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
