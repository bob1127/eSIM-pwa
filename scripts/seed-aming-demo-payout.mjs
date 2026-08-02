/**
 * 為「阿明的世界」(partner 26 / store 5) 寫入 DEMO 訂單與收款帳戶，供預覽結算／提領。
 *
 *   node scripts/seed-aming-demo-payout.mjs
 *   node scripts/seed-aming-demo-payout.mjs --clear   # 只清除 DEMO
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const PARTNER_ID = 26;
const STORE_ID = 5;
const DEMO_TAG = "[DEMO-PAYOUT]";

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
    )
      v = v.slice(1, -1);
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

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const clearOnly = process.argv.includes("--clear");

const { data: old } = await sb
  .from("orders")
  .select("id")
  .eq("partner_id", PARTNER_ID)
  .ilike("customer_name", `${DEMO_TAG}%`);
if (old?.length) {
  await sb.from("orders").delete().in(
    "id",
    old.map((o) => o.id),
  );
  console.log("cleared", old.length, "demo orders");
}
if (clearOnly) {
  console.log("done (--clear)");
  process.exit(0);
}

const rows = [
  { days: 35, status: "completed", name: "日本 eSIM 15日 無限", price: 1890, cost: 1100, profit: 720, buyer: "高分潤A" },
  { days: 30, status: "completed", name: "歐洲 eSIM 30日 20GB", price: 2490, cost: 1500, profit: 890, buyer: "高分潤B" },
  { days: 28, status: "completed", name: "日本 eSIM 7日 無限 SoftBank", price: 890, cost: 520, profit: 345, buyer: "王小明" },
  { days: 25, status: "completed", name: "多國組合 eSIM 14日", price: 1690, cost: 980, profit: 640, buyer: "高分潤C" },
  { days: 22, status: "completed", name: "歐洲 28國 eSIM 10日 10GB", price: 1290, cost: 780, profit: 474, buyer: "陳美玲" },
  { days: 18, status: "completed", name: "美國 eSIM 15日 20GB", price: 1590, cost: 980, profit: 565, buyer: "林大同" },
  { days: 16, status: "completed", name: "日本 eSIM 10日 無限", price: 1290, cost: 760, profit: 480, buyer: "高分潤D" },
  { days: 15, status: "completed", name: "韓國 eSIM 5日 3GB", price: 490, cost: 280, profit: 196, buyer: "黃雅婷" },
  { days: 12, status: "completed", name: "泰國 eSIM 8日 無限", price: 690, cost: 410, profit: 261, buyer: "張志豪" },
  { days: 5, status: "completed", name: "日本 eSIM 7日 無限 SoftBank", price: 890, cost: 520, profit: 345, buyer: "凍結中旅客" },
  { days: 2, status: "completed", name: "歐洲 28國 eSIM 10日 10GB", price: 1290, cost: 780, profit: 474, buyer: "新單旅客" },
  { days: 1, status: "pending", name: "韓國 eSIM 5日 3GB", price: 490, cost: 280, profit: 196, buyer: "尚未付款旅客" },
  {
    days: 20,
    status: "completed",
    name: "泰國 eSIM 8日 無限",
    price: 690,
    cost: 410,
    profit: 261,
    buyer: "已退款旅客",
    refunded: true,
  },
].map((o, idx) => {
  const created = daysAgo(o.days, 8 + (idx % 6));
  return {
    store_id: STORE_ID,
    partner_id: PARTNER_ID,
    customer_name: `${DEMO_TAG} ${o.buyer}`,
    customer_email: `demo.aming${idx}@example.com`,
    total_amount: o.price,
    total_price: o.price,
    b2b_cost: o.cost,
    partner_profit: o.profit,
    status: o.status,
    refunded_at: o.refunded ? daysAgo(o.days - 2) : null,
    item_details: [
      {
        name: o.name,
        productName: o.name,
        price: o.price,
        quantity: 1,
        planId: `DEMO-${idx}`,
      },
    ],
    items: [{ name: o.name, quantity: 1, planId: `DEMO-${idx}` }],
    payment_info:
      o.status === "pending"
        ? { method: "atm" }
        : { method: "credit_card" },
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
    partner_id: PARTNER_ID,
    bank_name: "國泰世華銀行",
    bank_code: "013",
    branch_name: "大里分行",
    account_name: "唐松測試夥伴",
    account_number: "123456789012",
    updated_at: new Date().toISOString(),
  },
  { onConflict: "partner_id" },
);

const cutoff = Date.now() - 10 * 86400000;
let avail = 0;
for (const r of rows) {
  if (r.status !== "completed" || r.refunded_at) continue;
  if (new Date(r.created_at).getTime() <= cutoff) avail += r.partner_profit;
}
console.log("✅ 已寫入", rows.length, "筆 DEMO 訂單 + 收款帳戶");
console.log("可提領餘額約 NT$" + avail.toLocaleString());
console.log("請重新整理 /partner/orders 與 /partner/settlement");
console.log("清除：node scripts/seed-aming-demo-payout.mjs --clear");
