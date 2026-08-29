/**
 * 優惠連結分潤流程靜態＋邏輯驗證（不需 Supabase／Medusa 連線）
 * 執行：node scripts/verify-referral-flow.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeReferralProfit, DEFAULT_REFERRAL_RATE } from "../lib/partnerReferral.js";
import {
  resolveReferralPartnerProfit,
  buildMainSiteSalesReport,
  isPartnerMedusaOrder,
} from "../lib/mainSiteAnalytics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const repoRoot = path.resolve(root, "..");

let passed = 0;
let failed = 0;

function ok(label) {
  passed += 1;
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  failed += 1;
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ""}`);
}

function assert(cond, label, detail) {
  if (cond) ok(label);
  else fail(label, detail);
}

function read(relFromRepo) {
  return fs.readFileSync(path.join(repoRoot, relFromRepo), "utf8");
}

console.log("\n=== 1. 分潤公式（前台 vs 後端 cap 語意）===\n");

const cost = 168;
const sell = 242; // 269 九折
const expectedProfit = 42;
assert(
  computeReferralProfit(cost, DEFAULT_REFERRAL_RATE, sell) === expectedProfit,
  `NT$${sell} 單、成本 ${cost}、25% → 夥伴分潤 NT$${expectedProfit}`,
);

console.log("\n=== 2. 主站分析：優惠連結分潤扣除 ===\n");

const referralOrder = {
  id: "ord_ref_1",
  created_at: new Date().toISOString(),
  payment_status: "captured",
  metadata: {
    jeko_referral_code: "demo",
    referral_partner_profit: 42,
    newebpay_pay_time: new Date().toISOString(),
    newebpay_amount: 242,
  },
  items: [
    {
      product_title: "測試方案",
      quantity: 1,
      unit_price: 242,
      variant: { metadata: { cost_price: 168 } },
    },
  ],
};

assert(
  !isPartnerMedusaOrder(referralOrder),
  "有 jeko_referral_code 但無 partner_id 的單仍算主站 Medusa 訂單（不被 isPartnerMedusaOrder 排除）",
);
assert(
  resolveReferralPartnerProfit(referralOrder) === 42,
  "resolveReferralPartnerProfit 讀到 metadata.referral_partner_profit",
);

const report = buildMainSiteSalesReport([referralOrder], { days: 9999 });
const row = report.orders.find((r) => r.id === "ord_ref_1");
assert(row?.referralProfit === 42, "報表列含 referralProfit");
assert(row?.profit === 242 - 168 - 42, "主站毛利 = 營收 − 成本 − 夥伴分潤");
assert(
  report.kpis.referralProfit === 42,
  "KPI referralProfit 加總正確",
);

console.log("\n=== 3. 後端接線（靜態檢查）===\n");

const notifySrc = read("esim-backend/src/api/newebpay/notify/route.ts");
const confirmSrc = read("esim-backend/src/api/linepay/confirm/route.ts");

assert(
  notifySrc.includes("upsertReferralOrderToSupabase"),
  "newebpay notify 呼叫 upsertReferralOrderToSupabase",
);
assert(
  confirmSrc.includes("upsertReferralOrderToSupabase"),
  "linepay confirm 呼叫 upsertReferralOrderToSupabase",
);
assert(
  notifySrc.includes(
    "!order.metadata?.is_partner_order && order.metadata?.jeko_referral_code",
  ) ||
    notifySrc.includes(
      "!order.metadata?.is_partner_order &&\n      order.metadata?.jeko_referral_code",
    ),
  "newebpay notify：referral 僅在非夥伴店訂單時觸發",
);
assert(
  fs.existsSync(path.join(repoRoot, "esim-backend/src/lib/referralOrderSync.ts")),
  "referralOrderSync.ts 存在",
);
assert(
  fs.existsSync(
    path.join(
      repoRoot,
      "esim-store-front/supabase/migrations/20260828_orders_referral_channel.sql",
    ),
  ),
  "migration 20260828_orders_referral_channel.sql 存在",
);

console.log("\n=== 4. 夥伴後台 UI（referral 隱藏底價）===\n");

const ordersPage = read("esim-store-front/pages/partner/orders.jsx");
const printModal = read("esim-store-front/components/partner/PrintOrdersModal.jsx");
const detailModal = read("esim-store-front/components/partner/OrderDetailModal.jsx");

assert(
  ordersPage.includes('cooperation_model === "referral"') &&
    ordersPage.includes("hideCost={isReferral}"),
  "orders.jsx 依 referral 隱藏底價並傳 hideCost",
);
assert(
  printModal.includes("hideCost") &&
    printModal.includes('hideCost ? [] : ["底價成本"]'),
  "PrintOrdersModal CSV/列印支援 hideCost",
);
assert(
  detailModal.includes("hideCost") && detailModal.includes("底價成本"),
  "OrderDetailModal 支援 hideCost",
);

console.log("\n=== 5. 結算 API 資料來源 ===\n");

const withdrawalsApi = read("esim-store-front/pages/api/partner/withdrawals.js");
assert(
  withdrawalsApi.includes('.from("orders")') &&
    withdrawalsApi.includes("partner_profit"),
  "提領 API 仍從 orders.partner_profit 算快照（referral 寫入後自動可用）",
);

console.log("\n========================================");
console.log(`結果：${passed} 通過，${failed} 失敗`);
console.log("========================================\n");

if (failed > 0) process.exit(1);
