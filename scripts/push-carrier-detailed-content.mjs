#!/usr/bin/env node
/**
 * 將 content/product-detailed/*.js 內容推送至 Medusa metadata
 *
 * 用法：
 *   node scripts/push-carrier-detailed-content.mjs au-kddi
 *   node scripts/push-carrier-detailed-content.mjs china-daily-cmcc
 *
 * 環境變數：
 *   PRODUCT_HANDLE / CARRIER（可覆寫 CONTENT_MAP 預設）
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL
 *   PRODUCT_CONTENT_ADMIN_SECRET
 *   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AU_KDDI_DETAILED_CONTENT_HTML } from "../content/product-detailed/au-kddi.js";
import { CHINA_DAILY_CMCC_DETAILED_CONTENT_HTML } from "../content/product-detailed/china-daily.js";

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

const CONTENT_MAP = {
  "au-kddi": {
    html: AU_KDDI_DETAILED_CONTENT_HTML,
    handle: "japan-unlimited-esim",
    carrier: "AU(KDDI)",
  },
  "china-daily-cmcc": {
    html: CHINA_DAILY_CMCC_DETAILED_CONTENT_HTML,
    handle: "china-daily-esim",
    carrier: "中國移動",
  },
};

const slug = process.argv[2] || "au-kddi";
const entry = CONTENT_MAP[slug];

if (!entry) {
  console.error(
    `未知內容 slug: ${slug}，可用: ${Object.keys(CONTENT_MAP).join(", ")}`,
  );
  process.exit(1);
}

const html = entry.html;
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || entry.handle;
const CARRIER = process.env.CARRIER || entry.carrier;

async function main() {
  if (!SECRET || SECRET.length < 16) {
    console.error("請設定 PRODUCT_CONTENT_ADMIN_SECRET");
    process.exit(1);
  }
  if (!PUBLISHABLE_KEY) {
    console.error("請設定 NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY");
    process.exit(1);
  }

  const listRes = await fetch(
    `${MEDUSA_URL}/store/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&fields=id,handle`,
    {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
    },
  );
  const listData = await listRes.json();
  const product = listData.products?.[0];
  if (!product?.id) {
    console.error(`找不到商品 handle=${PRODUCT_HANDLE}`);
    process.exit(1);
  }

  const pushRes = await fetch(`${MEDUSA_URL}/store/internal/product-content`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Product-Admin-Secret": SECRET,
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      productId: product.id,
      carrier: CARRIER,
      html,
      contentType: "detailed",
      updatedBy: "push-carrier-detailed-content.mjs",
    }),
  });

  const result = await pushRes.json();
  if (!pushRes.ok) {
    console.error("推送失敗:", result);
    process.exit(1);
  }

  console.log(
    `✅ 已更新 ${PRODUCT_HANDLE} / ${CARRIER}（${html.length} 字元）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
