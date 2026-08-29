#!/usr/bin/env node
/**
 * 診斷：主站可售商品數 vs 有個別分潤 metadata 的商品數
 *   node scripts/check-product-terms-catalog.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(root, ".env.local"));

const backendUrl = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
if (!key) {
  console.error("缺少 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
  process.exit(1);
}

const headers = { "x-publishable-api-key": key };
let offset = 0;
const limit = 50;
const all = [];

while (true) {
  const q = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    fields: "id,title,+metadata",
  });
  const res = await fetch(`${backendUrl}/store/products?${q}`, { headers });
  const data = await res.json();
  if (!res.ok) {
    console.error("Medusa error", res.status, data);
    process.exit(1);
  }
  const batch = data.products || [];
  all.push(...batch);
  if (batch.length < limit) break;
  offset += limit;
}

const visible = all.filter((p) => {
  const v = p?.metadata?.visibility;
  if (!v) return true;
  return v !== "partner_only" && v !== "internal";
});

const withCustomRate = visible.filter(
  (p) => p.metadata?.carrier_partner_rate_by_carrier,
);

console.log("Medusa backend:", backendUrl);
console.log("主站可售商品:", visible.length);
console.log("有個別分潤 metadata（舊版 API 只會顯示這些）:", withCustomRate.length);
console.log("");
console.log(
  "預期新版 /api/partner/product-terms 的 product_count =",
  visible.length,
);
if (withCustomRate.length < visible.length) {
  console.log(
    `其餘 ${visible.length - withCustomRate.length} 筆應顯示「預設」分潤／折扣。`,
  );
}
