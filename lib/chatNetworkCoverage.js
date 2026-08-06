/**
 * chatNetworkCoverage.js
 * 原生 eSIM 重點國家收訊／熱點涵蓋 → J寶 知識庫
 * 資料來源：lib/networkCoverageCountries.js（與商品頁同一份）
 */

import { NETWORK_COVERAGE_COUNTRIES } from "./networkCoverageCountries";

const PROMPT_BUDGET = 3200;

const COVERAGE_INTENT_RE =
  /收訊|覆蓋|涵蓋|熱點圖|訊號|無訊號|收不到|訊號差|網路品質|覆蓋圖|涵蓋圖|n[Pp]erf|哪裡沒訊號|偏遠.*(?:收|網|訊)|山區.*(?:收|網|訊)|滑雪.*(?:收|網|訊)|離島.*(?:收|網|訊)|室內.*(?:收|網|訊)|電信商.*(?:覆蓋|收訊|訊號)|原生.*(?:卡|eSIM|esim)|哪個電信.*(?:好|穩|強)/i;

const CARRIER_HINT_RE =
  /docomo|ドコモ|softbank|軟銀|\bau\b|kddi|sk\s*telecom|\bskt\b|\bkt\b|lg\s*u\+|中國移動|中国移动|中國聯通|中国联通|中國電信|中国电信|ais|truemove|true\s*move|\bdtac\b|viettel|vinaphone|mobifone/i;

/**
 * @param {string} queryText
 * @returns {import("./networkCoverageCountries").CoverageCountryConfig[]}
 */
function pickCoverageCountries(queryText = "") {
  const q = String(queryText || "").trim();
  if (!q) return [];

  const matched = Object.values(NETWORK_COVERAGE_COUNTRIES).filter((c) =>
    c.namePattern.test(q)
  );
  if (matched.length) return matched;

  // 問覆蓋／訊號／電信商但未點名國家 → 提供全部重點國家摘要
  if (COVERAGE_INTENT_RE.test(q) || CARRIER_HINT_RE.test(q)) {
    return Object.values(NETWORK_COVERAGE_COUNTRIES);
  }
  return [];
}

/**
 * @param {import("./networkCoverageCountries").CoverageCountryConfig} country
 * @param {{ compact?: boolean }} opts
 */
function formatCountryBlock(country, { compact = false } = {}) {
  const lines = [
    `▸ ${country.nameZh}（${country.code}）原生 eSIM 收訊參考`,
    compact ? `  摘要：${country.promptBody}` : `  說明：${country.intro}`,
    `  全國熱點圖：${country.nperfUrl}`,
  ];

  for (const c of country.carriers || []) {
    lines.push(
      `  - ${c.name}｜${c.strength}｜${c.note}｜地圖：${c.mapUrl}`
    );
  }

  for (const link of country.compareLinks || []) {
    if (link.id === "nperf") continue; // 已列全國熱點圖
    lines.push(`  - ${link.title}：${link.href}`);
  }

  lines.push(
    `  提醒：實際以商品標示電信商為準；偏遠／山區／室內收訊可能較差。`
  );
  return lines.join("\n");
}

/**
 * 依問題回傳收訊／熱點涵蓋知識（無可答則空字串）
 * @param {string} queryText
 */
export function fetchNetworkCoverageKnowledge(queryText = "") {
  const q = String(queryText || "").trim();
  if (!q) return "";

  const hasCountry = Object.values(NETWORK_COVERAGE_COUNTRIES).some((c) =>
    c.namePattern.test(q)
  );
  const hardIntent = COVERAGE_INTENT_RE.test(q) || CARRIER_HINT_RE.test(q);
  const softIntent =
    /(?:好不好用|穩不穩|會不會斷|能不能用|有沒有訊號|收訊如何|網路如何)/i.test(
      q
    );

  // 僅點名國家買方案、未問收訊 → 不塞（省 token）
  if (!hardIntent && !(hasCountry && softIntent)) return "";

  const countries = pickCoverageCountries(q);
  if (!countries.length) return "";

  const compact = countries.length > 2;
  const header = [
    "【原生 eSIM 收訊／熱點涵蓋｜Jeko 官方整理】",
    "回答收訊、覆蓋、熱點圖、電信商訊號時，必須依下列資料作答，並可附上列出的地圖網址；禁止捏造未列出的連結。",
    "此為參考資訊（官方圖／nPerf 群眾實測），非保證每位旅客實際體驗。",
  ].join("\n");

  const lines = [header];
  let used = header.length;

  for (const country of countries) {
    const block = formatCountryBlock(country, { compact });
    if (used + block.length + 2 > PROMPT_BUDGET) break;
    lines.push(block);
    used += block.length + 2;
  }

  return lines.join("\n\n");
}

export function hasNetworkCoverageKnowledge(queryText = "") {
  return Boolean(fetchNetworkCoverageKnowledge(queryText));
}
