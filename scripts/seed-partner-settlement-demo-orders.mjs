#!/usr/bin/env node
/**
 * 為夥伴分潤對帳單注入七月份假訂單（含未付款／退款／取消等）
 *
 *   node scripts/seed-partner-settlement-demo-orders.mjs
 *   node scripts/seed-partner-settlement-demo-orders.mjs --partner jeek --year 2026 --month 7
 *   node scripts/seed-partner-settlement-demo-orders.mjs --clean   # 只刪本 script 標記的假單
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    console.error("無法讀取 .env.local:", e.message);
    process.exit(1);
  }
}

loadEnv();

const args = process.argv.slice(2);
const cleanOnly = args.includes("--clean");
const partnerArg =
  args[args.indexOf("--partner") + 1] && args.includes("--partner")
    ? args[args.indexOf("--partner") + 1]
    : "jeek";
const year = Number(
  args.includes("--year") ? args[args.indexOf("--year") + 1] : 2026,
);
const month = Number(
  args.includes("--month") ? args[args.indexOf("--month") + 1] : 7,
);

const DEMO_TAG = "SETTLEMENT_DEMO_V1";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function dayIso(y, m, d, h = 10, min = 30) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  const hh = String(h).padStart(2, "0");
  const mi = String(min).padStart(2, "0");
  // 以台北時間寫入，再轉 ISO
  return new Date(`${y}-${mm}-${dd}T${hh}:${mi}:00+08:00`).toISOString();
}

function item(name, price, planId, qty = 1) {
  return {
    name,
    productName: name,
    quantity: qty,
    price,
    planId,
  };
}

function buildRows(partnerId, ratePercent) {
  const rate = Number(ratePercent) || 30;
  const profit = (cost) => Math.round(cost * (rate / 100));
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const rows = [
    {
      label: "應付① 已完成",
      customer_email: "demo.traveler01@example.com",
      customer_name: "王小明",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: profit(225),
      status: "completed",
      esim_activation_status: "activated",
      created_at: dayIso(year, month, 3, 9, 12),
      item_details: [item("日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      items: [item("日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      qrcode_data: [{ productName: "日本無限流量", qrcodeUrl: "https://example.com/qr/1", topupId: "DEMO-OK-1" }],
    },
    {
      label: "應付② 已完成（兩張）",
      customer_email: "demo.traveler02@example.com",
      customer_name: "陳旅人",
      total_amount: 978,
      total_price: 978,
      b2b_cost: 614,
      partner_profit: profit(614),
      status: "completed",
      esim_activation_status: "activated",
      created_at: dayIso(year, month, 8, 14, 5),
      item_details: [
        item("日本無限流量 AU(KDDI) · 5天", 489, "Japan-Local-unlimited-5-D1"),
        item("韓國 eSIM 3天", 489, "Korea-unlimited-3-A0"),
      ],
      items: [
        item("日本無限流量 AU(KDDI) · 5天", 489, "Japan-Local-unlimited-5-D1"),
        item("韓國 eSIM 3天", 489, "Korea-unlimited-3-A0"),
      ],
      qrcode_data: [
        { productName: "日本 AU", qrcodeUrl: "https://example.com/qr/2a", topupId: "DEMO-OK-2A" },
        { productName: "韓國", qrcodeUrl: "https://example.com/qr/2b", topupId: "DEMO-OK-2B" },
      ],
    },
    {
      label: "應付③ 已完成未開通（仍應付）",
      customer_email: "demo.traveler03@example.com",
      customer_name: "林未掃",
      total_amount: 469,
      total_price: 469,
      b2b_cost: 307,
      partner_profit: profit(307),
      status: "completed",
      esim_activation_status: "not_activated",
      created_at: dayIso(year, month, 18, 20, 40),
      item_details: [item("日本無限流量 SoftBank / KDDI 10Mbps · 5天", 469, "Japan(T+C)-unlimited-5-A0")],
      items: [item("日本無限流量 SoftBank / KDDI 10Mbps · 5天", 469, "Japan(T+C)-unlimited-5-A0")],
      qrcode_data: [{ productName: "日本 10Mbps", qrcodeUrl: "https://example.com/qr/3", topupId: "DEMO-OK-3" }],
    },
    {
      label: "排除·未付款 pending",
      customer_email: "demo.unpaid@example.com",
      customer_name: "未付款客",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: profit(225),
      status: "pending",
      esim_activation_status: "unknown",
      created_at: dayIso(year, month, 5, 11, 0),
      item_details: [item("【未付款】日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      items: [item("【未付款】日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      qrcode_data: null,
      payment_info: {
        payment_type: "CVS",
        payment_method_label: "超商代碼繳費",
        code_no: "CVS00011227",
        expire_date: `${year}/${String(month).padStart(2, "0")}/10 23:59`,
        amount: 339,
      },
    },
    {
      label: "排除·已退款（completed + refunded_at）",
      customer_email: "demo.refunded@example.com",
      customer_name: "已退款客",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: profit(225),
      status: "completed",
      esim_activation_status: "not_activated",
      refunded_at: dayIso(year, month, 22, 16, 0),
      created_at: dayIso(year, month, 12, 13, 20),
      item_details: [item("【已退款】日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      items: [item("【已退款】日本無限流量 SoftBank / KDDI · 5天", 339, "Japan-unlimited-5-A0")],
      qrcode_data: [{ productName: "已退款", qrcodeUrl: "https://example.com/qr/r1", topupId: "DEMO-REF-1" }],
    },
    {
      label: "排除·status=refunded",
      customer_email: "demo.refunded2@example.com",
      customer_name: "退款狀態客",
      total_amount: 489,
      total_price: 489,
      b2b_cost: 300,
      partner_profit: profit(300),
      status: "refunded",
      esim_activation_status: "unknown",
      refunded_at: dayIso(year, month, 25, 9, 0),
      created_at: dayIso(year, month, 15, 8, 15),
      item_details: [item("【退款狀態】日本 AU · 5天", 489, "Japan-Local-unlimited-5-D1")],
      items: [item("【退款狀態】日本 AU · 5天", 489, "Japan-Local-unlimited-5-D1")],
      qrcode_data: null,
    },
    {
      label: "排除·退款審核中 refund_pending",
      customer_email: "demo.refundpending@example.com",
      customer_name: "退款審核中",
      total_amount: 409,
      total_price: 409,
      b2b_cost: 270,
      partner_profit: profit(270),
      status: "refund_pending",
      esim_activation_status: "not_activated",
      created_at: dayIso(year, month, 20, 17, 45),
      item_details: [item("【退款審核中】日本 SoftBank · 6天", 409, "Japan-unlimited-6-A0")],
      items: [item("【退款審核中】日本 SoftBank · 6天", 409, "Japan-unlimited-6-A0")],
      qrcode_data: [{ productName: "退款審核中", qrcodeUrl: "https://example.com/qr/rp", topupId: "DEMO-RP-1" }],
    },
    {
      label: "排除·已取消 cancelled",
      customer_email: "demo.cancelled@example.com",
      customer_name: "已取消客",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: 0,
      status: "cancelled",
      esim_activation_status: "unknown",
      created_at: dayIso(year, month, 9, 12, 0),
      item_details: [item("【已取消】日本無限流量 · 5天", 339, "Japan-unlimited-5-A0")],
      items: [item("【已取消】日本無限流量 · 5天", 339, "Japan-unlimited-5-A0")],
      qrcode_data: null,
    },
    {
      label: "排除·失敗 failed",
      customer_email: "demo.failed@example.com",
      customer_name: "付款失敗",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: 0,
      status: "failed",
      esim_activation_status: "unknown",
      created_at: dayIso(year, month, 11, 19, 30),
      item_details: [item("【付款失敗】日本無限流量 · 5天", 339, "Japan-unlimited-5-A0")],
      items: [item("【付款失敗】日本無限流量 · 5天", 339, "Japan-unlimited-5-A0")],
      qrcode_data: null,
    },
    {
      label: "跨月·不應出現在本期（次月已完成）",
      customer_email: "demo.nextmonth@example.com",
      customer_name: "次月訂單",
      total_amount: 339,
      total_price: 339,
      b2b_cost: 225,
      partner_profit: profit(225),
      status: "completed",
      esim_activation_status: "activated",
      created_at: dayIso(nextYear, nextMonth, 2, 10, 0),
      item_details: [item("【次月】日本無限流量 · 5天（不應計入本期）", 339, "Japan-unlimited-5-A0")],
      items: [item("【次月】日本無限流量 · 5天（不應計入本期）", 339, "Japan-unlimited-5-A0")],
      qrcode_data: [{ productName: "次月", qrcodeUrl: "https://example.com/qr/nm", topupId: "DEMO-NM-1" }],
    },
  ];

  return rows.map((r) => {
    const { label, ...rest } = r;
    return {
      label,
      row: {
        ...rest,
        partner_id: partnerId,
        store_id: null,
        coupon_id: null,
        payment_info: rest.payment_info || {
          demo: true,
          tag: DEMO_TAG,
          scenario: label,
        },
        // 把標記也寫進 item 方便 clean
        item_details: (rest.item_details || []).map((it) => ({
          ...it,
          _settlement_demo: DEMO_TAG,
          _scenario: label,
        })),
      },
    };
  });
}

async function findPartner() {
  const key = String(partnerArg).trim();
  const { data, error } = await supabase
    .from("partners")
    .select("id, name, email, slug, referral_code, referral_rate, status, cooperation_model")
    .or(
      `referral_code.ilike.${key},slug.ilike.${key},name.ilike.%${key}%,email.ilike.%${key}%`,
    )
    .limit(5);
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error(`找不到夥伴：${key}`);
  return data[0];
}

async function cleanDemoOrders(partnerId) {
  // 以 item_details 內標記或 customer_email demo.* 清理
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_email, item_details, payment_info")
    .eq("partner_id", partnerId)
    .limit(2000);
  if (error) throw new Error(error.message);

  const ids = (orders || [])
    .filter((o) => {
      const email = String(o.customer_email || "");
      if (email.startsWith("demo.") && email.endsWith("@example.com")) return true;
      const details = o.item_details;
      if (Array.isArray(details) && details.some((d) => d?._settlement_demo === DEMO_TAG))
        return true;
      if (o.payment_info?.tag === DEMO_TAG) return true;
      return false;
    })
    .map((o) => o.id);

  if (!ids.length) {
    console.log("（沒有可清理的假訂單）");
    return 0;
  }
  const { error: delErr } = await supabase.from("orders").delete().in("id", ids);
  if (delErr) throw new Error(delErr.message);
  console.log(`🗑 已刪除假訂單 ${ids.length} 筆`);
  return ids.length;
}

async function main() {
  console.log("Supabase:", url);
  const partner = await findPartner();
  console.log(
    `夥伴 #${partner.id} ${partner.name} / ${partner.referral_code || partner.slug} · rate=${partner.referral_rate}%`,
  );

  await cleanDemoOrders(partner.id);
  if (cleanOnly) return;

  const built = buildRows(partner.id, partner.referral_rate);
  let ok = 0;
  let fail = 0;
  for (const { label, row } of built) {
    const { data, error } = await supabase
      .from("orders")
      .insert(row)
      .select("id, status, partner_profit, total_amount, created_at, refunded_at")
      .single();
    if (error) {
      fail += 1;
      console.error(`❌ ${label}: ${error.message}`);
      continue;
    }
    ok += 1;
    console.log(
      `✓ ${label.padEnd(28)} #${String(data.id).slice(0, 8)}  ${data.status.padEnd(14)} 分潤=${data.partner_profit}  ${data.created_at}${data.refunded_at ? "  refunded" : ""}`,
    );
  }

  const payable = built.filter((b) => {
    const s = b.row.status;
    return s === "completed" && !b.row.refunded_at;
  });
  // exclude next month from payable preview
  const payableThisMonth = payable.filter((b) =>
    String(b.row.created_at).startsWith(
      `${year}-${String(month).padStart(2, "0")}`,
    ) || new Date(b.row.created_at).toLocaleString("en-CA", { timeZone: "Asia/Taipei" }).startsWith(`${year}-${String(month).padStart(2, "0")}`),
  );
  const sum = payableThisMonth.reduce((s, b) => s + (b.row.partner_profit || 0), 0);

  console.log("\n======= 完成 =======");
  console.log(`成功 ${ok} / 失敗 ${fail}`);
  console.log(`預期本期應付筆數約 ${payableThisMonth.length}、分潤合計約 NT$ ${sum}`);
  console.log(
    `請到 Boss → 夥伴詳情 → 對帳單選 ${year}/${month} 重新開啟`,
  );
  console.log(`備註應為 JEKO-${year}${String(month).padStart(2, "0")}-${String(partner.referral_code || partner.slug).toUpperCase()}`);
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
