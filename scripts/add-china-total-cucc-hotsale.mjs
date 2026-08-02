/**
 * 總量型：HOT SALE 加上 中國聯通
 *   node scripts/add-china-total-cucc-hotsale.mjs
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
  } catch {}
}
loadEnvLocal();

const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const login = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json());
if (!login.token) throw new Error("login fail");

const { products } = await fetch(
  `${MEDUSA_URL}/admin/products?handle=china-total-esim&limit=1&fields=*metadata`,
  { headers: { Authorization: `Bearer ${login.token}` } },
).then((r) => r.json());
const p = products?.[0];
if (!p) throw new Error("product not found");

const meta = { ...(p.metadata || {}) };
meta.hot_sale_telecoms = ["GPT + TikTok", "中國聯通"];
console.log("updating hot_sale_telecoms =>", meta.hot_sale_telecoms);

const res = await fetch(`${MEDUSA_URL}/admin/products/${p.id}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${login.token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ metadata: meta }),
});
const text = await res.text();
if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 400)}`);
console.log("✅ done");
