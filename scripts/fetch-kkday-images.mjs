/**
 * KKday 商品圖片抓取腳本
 * 執行: node scripts/fetch-kkday-images.mjs
 * 輸出: public/data/kkday-images.json
 *
 * 使用真實 Chrome 繞過 CloudFront 封鎖，抓取每個商品的圖片 URL
 */

import puppeteer from "puppeteer";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public", "data");
const OUTPUT_FILE = join(OUTPUT_DIR, "kkday-images.json");

// ─── 所有商品清單 ───────────────────────────────────────────
const PRODUCTS = [
  // 日本
  { id: "jp-usj",       url: "https://www.kkday.com/zh-tw/product/2247-universal-studios-japan-ticket-osaka" },
  { id: "jp-shibuya-sky", url: "https://www.kkday.com/zh-tw/product/133300-shibuya-sky-observatory-e-ticket-tokyo" },
  { id: "jp-tokyo-pass", url: "https://www.kkday.com/zh-tw/product/269798" },
  { id: "jp-disney",    url: "https://www.kkday.com/zh-tw/product/19252-tokyo-disney-resort-disneyland-disneysea" },
  { id: "jp-city-pass", url: "https://www.kkday.com/zh-tw/product/279586" },
  { id: "jp-jr-pass",   url: "https://www.kkday.com/zh-tw/product/20291-all-japan-rail-pass-with-delivery-to-taiwan-hong-kong-south-korea-singapore" },
  { id: "jp-haruka",    url: "https://www.kkday.com/zh-tw/product/18940-kansai-airport-haruka-ticket-japan" },
  { id: "jp-osaka-pass", url: "https://www.kkday.com/zh-tw/product/12156-osaka-amazing-pass-e-ticket-japan" },
  { id: "jp-skyliner",  url: "https://www.kkday.com/zh-tw/product/7913-keisei-skyliner-narita-airport-express-ticket" },
  { id: "jp-odaiba",    url: "https://www.kkday.com/zh-tw/product/164762" },
  // 韓國
  { id: "kr-tmoney",    url: "https://www.kkday.com/zh-tw/product/149765" },
  { id: "kr-seoul-busan-ktx", url: "https://www.kkday.com/zh-tw/product/536336" },
  { id: "kr-korail-pass", url: "https://www.kkday.com/zh-tw/product/2930-korea-ktx-train-discounted-korail-day-pass" },
  { id: "kr-everland",  url: "https://www.kkday.com/zh-tw/product/2914-everland-theme-park-admission-ticket-korea" },
  { id: "kr-busan-pass", url: "https://www.kkday.com/zh-tw/product/138477-visit-busan-pass-discount-free-attractions" },
  { id: "kr-namsan",    url: "https://www.kkday.com/zh-tw/product/285983" },
  { id: "kr-lotte-world", url: "https://www.kkday.com/zh-tw/product/2948-lotte-world-ticket-seoul-korea" },
  { id: "kr-gyeongbok", url: "https://www.kkday.com/zh-tw/product/11731-gyeongbokgung-palace-seohwa-hanbok-rental-seoul-south-korea" },
  { id: "kr-nami-island", url: "https://www.kkday.com/zh-tw/product/133956-nami-island-petite-france-village-korea" },
  { id: "kr-jeju-funpass", url: "https://www.kkday.com/zh-tw/product/573131" },
];

// ─── 從頁面抽取圖片 ────────────────────────────────────────
async function extractImages(page, productId) {
  return await page.evaluate(() => {
    const results = [];

    // 1. og:image (最精準)
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg?.content) results.push(ogImg.content);

    // 2. KKday 商品輪播圖 (各種可能的選擇器)
    const selectors = [
      // 輪播圖 img
      '.product-gallery img',
      '.gallery-slider img',
      '.swiper-slide img',
      '[class*="gallery"] img',
      '[class*="Gallery"] img',
      '[class*="carousel"] img',
      '[class*="Carousel"] img',
      // KKday Nuxt 特定
      '.kk-product-gallery__image',
      '.product-photos img',
      '.product-image img',
      // 任何 image.kkday.com 圖片
    ];

    for (const sel of selectors) {
      const imgs = document.querySelectorAll(sel);
      imgs.forEach(img => {
        const src = img.src || img.dataset?.src || img.dataset?.lazySrc;
        if (src && src.includes('kkday.com') && !results.includes(src)) {
          results.push(src);
        }
      });
      if (results.length >= 4) break;
    }

    // 3. 掃描所有 image.kkday.com 圖片
    if (results.length < 2) {
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.dataset?.src;
        if (src && src.includes('image.kkday.com') && !results.includes(src)) {
          // 過濾掉 icon、logo 等小圖
          if (!src.includes('icon') && !src.includes('logo') && !src.includes('badge')) {
            results.push(src);
          }
        }
      });
    }

    // 4. 從 JSON-LD 取圖
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        const imgs = data?.image || data?.photo || [];
        (Array.isArray(imgs) ? imgs : [imgs]).forEach(i => {
          const url = typeof i === 'string' ? i : i?.url;
          if (url && url.startsWith('http') && !results.includes(url)) results.push(url);
        });
      } catch {}
    });

    return [...new Set(results)].slice(0, 5);
  });
}

// ─── 主程序 ───────────────────────────────────────────────
async function main() {
  console.log("🚀 啟動 Puppeteer...");

  const browser = await puppeteer.launch({
    headless: false,         // 設 false 可看到瀏覽器（除錯用）
    defaultViewport: { width: 1280, height: 800 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--lang=zh-TW",
    ],
  });

  const results = {};

  // 讀取已有的結果（支援斷點續跑）
  if (existsSync(OUTPUT_FILE)) {
    const { readFileSync } = await import("fs");
    const existing = JSON.parse(readFileSync(OUTPUT_FILE, "utf-8"));
    Object.assign(results, existing);
    console.log(`📂 載入已有結果 ${Object.keys(results).length} 筆`);
  }

  for (const product of PRODUCTS) {
    if (results[product.id]?.length > 0) {
      console.log(`⏭️  跳過（已有資料）: ${product.id}`);
      continue;
    }

    console.log(`\n🔍 抓取: ${product.id} — ${product.url}`);
    const page = await browser.newPage();

    try {
      // 設定語系和正常瀏覽器 Headers
      await page.setExtraHTTPHeaders({
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );

      await page.goto(product.url, { waitUntil: "networkidle2", timeout: 30000 });

      // 等待圖片載入
      await new Promise(r => setTimeout(r, 3000));

      const images = await extractImages(page, product.id);
      results[product.id] = images;

      console.log(`  ✅ 找到 ${images.length} 張圖`);
      images.forEach((img, i) => console.log(`     ${i + 1}. ${img.substring(0, 80)}...`));

      // 即時儲存（防止中途中斷丟資料）
      if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");

    } catch (err) {
      console.error(`  ❌ 錯誤: ${err.message}`);
      results[product.id] = [];
    } finally {
      await page.close();
    }

    // 避免頻繁請求被封
    await new Promise(r => setTimeout(r, 2000));
  }

  await browser.close();

  // 最終輸出
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), "utf-8");

  const successCount = Object.values(results).filter(v => v.length > 0).length;
  console.log(`\n✅ 完成！成功: ${successCount}/${PRODUCTS.length}`);
  console.log(`📁 輸出: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
