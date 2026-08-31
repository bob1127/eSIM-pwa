/**
 * daily-jp 熱銷標籤 → 只標 IIJ Docomo、SoftBank（Android 手動 APN）
 *
 *   node scripts/patch-japan-daily-hot-sale.mjs
 *   node scripts/patch-japan-daily-hot-sale.mjs --dry-run
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
const HANDLE = "daily-jp";
const DRY = process.argv.includes("--dry-run");

const HOT_SALE = [
  "IIJ Docomo（注意：需手動設定 APN）",
  "SoftBank（注意：Android 通常需手動 APN）",
];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`登入失敗 ${res.status}`);
  return data.token;
}

async function admin(token, path, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.message || data.error || `${path} ${res.status}`);
  }
  return data;
}

async function main() {
  console.log(`🔥 daily-jp hot_sale_telecoms →\n   ${HOT_SALE.join("\n   ")}`);
  if (DRY) {
    console.log("（dry-run，未寫入）");
    return;
  }

  const token = await login();
  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,metadata`,
  );
  const product = products?.[0];
  if (!product) throw new Error(`找不到 handle=${HANDLE}`);

  const prev = product.metadata?.hot_sale_telecoms || [];
  console.log("原 hot_sale:", prev);

  // 勿 POST 整包 metadata（daily-jp 欄位大會 500）；只 patch hot_sale_telecoms
  await admin(
    token,
    `/admin/products/${product.id}?fields=id,metadata`,
    {
      method: "POST",
      body: JSON.stringify({
        metadata: { hot_sale_telecoms: HOT_SALE },
      }),
    },
  );

  const verify = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=id,title,metadata`,
  );
  const after = verify.products?.[0]?.metadata?.hot_sale_telecoms || [];
  console.log("新 hot_sale:", after);

  console.log(`✅ 已更新 ${product.title} (${product.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
