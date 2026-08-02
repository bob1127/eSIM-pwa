/**
 * 為專屬優惠連結夥伴「jeek」(partner 29) 寫入 DEMO 訂單，供儀表板／訂單／結算預覽。
 * 分潤依 referral 規則：成本 × referral_rate（預設 25%）。
 *
 *   node scripts/seed-jeek-referral-demo.mjs
 *   node scripts/seed-jeek-referral-demo.mjs --clear
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PARTNER_KEY = "jeek";
const DEMO_TAG = "[DEMO-REFERRAL]";

function loadEnv() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) throw new Error("缺少 .env.local");
  const env = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, i).trim()] = v;
  }
  return env;
}

function daysAgo(n, hour = 10) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, 15, 0, 0);
  return d.toISOString();
}

function profitFromCost(cost, ratePct) {
  return Math.round((Number(cost) || 0) * (Number(ratePct) || 25) / 100);
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const clearOnly = process.argv.includes("--clear");

const { data: partners, error: pErr } = await sb
  .from("partners")
  .select(
    "id, name, slug, email, status, cooperation_model, referral_code, referral_rate",
  )
  .or(
    `referral_code.ilike.${PARTNER_KEY},slug.ilike.${PARTNER_KEY},name.ilike.%${PARTNER_KEY}%`,
  )
  .limit(5);
if (pErr) throw pErr;
const partner = partners?.[0];
if (!partner) throw new Error(`找不到夥伴 ${PARTNER_KEY}`);
if (partner.cooperation_model !== "referral") {
  console.warn(
    "⚠ cooperation_model =",
    partner.cooperation_model,
    "（仍會寫入 referral 式分潤）",
  );
}

const rate = Number(partner.referral_rate) > 0 ? Number(partner.referral_rate) : 25;
console.log(
  `夥伴 #${partner.id} ${partner.name} / ${partner.referral_code || partner.slug} · rate=${rate}%`,
);

const { data: old } = await sb
  .from("orders")
  .select("id")
  .eq("partner_id", partner.id)
  .ilike("customer_name", `${DEMO_TAG}%`);
if (old?.length) {
  await sb.from("orders").delete().in(
    "id",
    old.map((o) => o.id),
  );
  console.log("cleared", old.length, "demo-referral orders");
}
if (clearOnly) {
  console.log("done (--clear)");
  process.exit(0);
}

/**
 * price = 旅客實付（部分已含九折）
 * cost = 方案成本（referral 分潤基數）
 * profit = cost × rate
 */
const specs = [
  { days: 95, status: "completed", name: "日本 eSIM 5日 無限", price: 339, cost: 225, buyer: "三月旅客A", discounted: false },
  { days: 88, status: "completed", name: "韓國 eSIM 5日 3GB", price: 305, cost: 225, buyer: "三月九折客", discounted: true },
  { days: 72, status: "completed", name: "歐洲 28國 eSIM 10日 10GB", price: 1290, cost: 780, buyer: "四月旅客B", discounted: false },
  { days: 60, status: "completed", name: "日本 eSIM 7日 無限 SoftBank", price: 801, cost: 520, buyer: "四月九折客", discounted: true },
  { days: 48, status: "completed", name: "美國 eSIM 15日 20GB", price: 1590, cost: 980, buyer: "五月旅客C", discounted: false },
  { days: 40, status: "completed", name: "泰國 eSIM 8日 無限", price: 621, cost: 410, buyer: "五月九折客", discounted: true },
  { days: 32, status: "completed", name: "歐洲 eSIM 30日 20GB", price: 2490, cost: 1500, buyer: "六月旅客D", discounted: false },
  { days: 28, status: "completed", name: "日本 eSIM 15日 無限", price: 1701, cost: 1100, buyer: "六月九折客", discounted: true },
  { days: 22, status: "completed", name: "多國組合 eSIM 14日", price: 1690, cost: 980, buyer: "七月旅客E", discounted: false },
  { days: 18, status: "completed", name: "日本 eSIM 10日 無限", price: 1161, cost: 760, buyer: "七月九折客", discounted: true },
  { days: 15, status: "completed", name: "韓國 eSIM 5日 3GB", price: 339, cost: 225, buyer: "七月旅客F", discounted: false },
  { days: 12, status: "completed", name: "歐洲 28國 eSIM 10日 10GB", price: 1161, cost: 780, buyer: "七月旅客G", discounted: true },
  { days: 8, status: "completed", name: "日本 eSIM 7日 無限 SoftBank", price: 890, cost: 520, buyer: "凍結中旅客", discounted: false },
  { days: 4, status: "completed", name: "美國 eSIM 15日 20GB", price: 1431, cost: 980, buyer: "本月九折客", discounted: true },
  { days: 2, status: "completed", name: "日本 eSIM 5日 無限", price: 339, cost: 225, buyer: "本月旅客H", discounted: false },
  { days: 1, status: "pending", name: "韓國 eSIM 5日 3GB", price: 305, cost: 225, buyer: "尚未付款旅客", discounted: true },
  {
    days: 20,
    status: "completed",
    name: "泰國 eSIM 8日 無限",
    price: 690,
    cost: 410,
    buyer: "已退款旅客",
    discounted: false,
    refunded: true,
  },
];

const rows = specs.map((o, idx) => {
  const created = daysAgo(o.days, 8 + (idx % 6));
  const profit = profitFromCost(o.cost, rate);
  return {
    store_id: null,
    partner_id: partner.id,
    customer_name: `${DEMO_TAG} ${o.buyer}`,
    customer_email: `demo.jeek${idx}@example.com`,
    total_amount: o.price,
    total_price: o.price,
    b2b_cost: o.cost,
    partner_profit: o.refunded ? profit : profit,
    status: o.status,
    refunded_at: o.refunded ? daysAgo(Math.max(0, o.days - 2)) : null,
    item_details: [
      {
        name: o.name,
        productName: o.name,
        price: o.price,
        quantity: 1,
        planId: `DEMO-REF-${idx}`,
        _demo_referral: DEMO_TAG,
        discounted: !!o.discounted,
      },
    ],
    items: [{ name: o.name, quantity: 1, planId: `DEMO-REF-${idx}` }],
    payment_info: {
      demo: true,
      tag: DEMO_TAG,
      referral_code: partner.referral_code || partner.slug,
      method: o.status === "pending" ? "atm" : "credit_card",
      payment_method_label: o.status === "pending" ? "ATM 轉帳" : "信用卡",
      coupon: o.discounted ? String(partner.referral_code || "JEEK").toUpperCase() : null,
    },
    esim_activation_status:
      o.status === "completed" && !o.refunded ? "activated" : "unknown",
    created_at: created,
    updated_at: created,
  };
});

const { error } = await sb.from("orders").insert(rows);
if (error) throw error;

await sb.from("partner_bank_accounts").upsert(
  {
    partner_id: partner.id,
    bank_name: "玉山銀行",
    bank_code: "808",
    branch_name: "台北分行",
    account_name: partner.name || "jeek",
    account_number: "987654321098",
    updated_at: new Date().toISOString(),
  },
  { onConflict: "partner_id" },
);

const cutoff = Date.now() - 10 * 86400000;
let avail = 0;
let completedProfit = 0;
let revenue = 0;
for (const r of rows) {
  if (r.status === "completed" || r.status === "pending") {
    revenue += r.total_amount;
  }
  if (r.status !== "completed" || r.refunded_at) continue;
  completedProfit += r.partner_profit;
  if (new Date(r.created_at).getTime() <= cutoff) avail += r.partner_profit;
}

console.log("✅ 已寫入", rows.length, "筆 DEMO-REFERRAL 訂單 + 收款帳戶");
console.log(
  "有效營收約 NT$" +
    revenue.toLocaleString() +
    "・已完成分潤約 NT$" +
    completedProfit.toLocaleString() +
    "・分潤占營收約 " +
    (revenue > 0 ? Math.round((completedProfit / revenue) * 100) : 0) +
    "%",
);
console.log("可提領餘額約 NT$" + avail.toLocaleString() + "（已過 10 日凍結）");
console.log("請重新整理 /partner/dashboard 、/partner/orders 、/partner/settlement");
console.log("報表期間請拉大（例如近 3～6 個月）才看得到多分潤曲線");
console.log("清除：node scripts/seed-jeek-referral-demo.mjs --clear");
