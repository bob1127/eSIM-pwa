#!/usr/bin/env node
/**
 * 將 content/product-faq/*.js 內容推送至 Medusa metadata（常見問題）
 *
 * 用法：
 *   node scripts/push-carrier-faq-content.mjs jp-softbank-kddi
 *
 * 環境變數：
 *   PRODUCT_HANDLE（預設 daily-jp）
 *   CARRIER（預設 SoftBank / KDDI）
 *   NEXT_PUBLIC_MEDUSA_BACKEND_URL
 *   PRODUCT_CONTENT_ADMIN_SECRET
 *   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
 */
import { JP_SOFTBANK_KDDI_FAQ_CONTENT_HTML } from "../content/product-faq/jp-softbank-kddi.js";

const CONTENT_MAP = {
  "jp-softbank-kddi": JP_SOFTBANK_KDDI_FAQ_CONTENT_HTML,
};

const slug = process.argv[2] || "jp-softbank-kddi";
const html = CONTENT_MAP[slug];

if (!html) {
  console.error(`未知內容 slug: ${slug}，可用: ${Object.keys(CONTENT_MAP).join(", ")}`);
  process.exit(1);
}

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const SECRET = process.env.PRODUCT_CONTENT_ADMIN_SECRET || "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || "daily-jp";
const CARRIER = process.env.CARRIER || "SoftBank / KDDI";

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
      contentType: "faq",
      updatedBy: "push-carrier-faq-content.mjs",
    }),
  });

  const result = await pushRes.json();
  if (!pushRes.ok) {
    console.error("推送失敗:", result);
    process.exit(1);
  }

  console.log(`✅ 已更新 ${PRODUCT_HANDLE} / ${CARRIER} 常見問題（${html.length} 字元）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
