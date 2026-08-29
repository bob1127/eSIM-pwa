#!/usr/bin/env node
/**
 * E2E：優惠連結夥伴真實測試單（本地 Medusa + mock 藍新 notify → Supabase sync）
 *
 *   node scripts/e2e-referral-order-test.mjs           # 建立 → 付款 → 驗證 → 刪除
 *   node scripts/e2e-referral-order-test.mjs --keep    # 驗證後保留（除錯用）
 *
 * 需要：localhost:9000 backend、.env.local + esim-backend/.env（藍新金鑰）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const TAG = "[E2E-REFERRAL-TEST]";
const REFERRAL_CODE = "jeek";
const PRODUCT_HANDLE = "korea-total-esim"; // 最低價方案之一（約 NT$29）
const keepOrder = process.argv.includes("--keep");

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

loadEnv(path.resolve(root, "../esim-backend/.env"));
loadEnv(path.resolve(root, ".env.local"));

const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const BASE = (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000").replace(/\/$/, "");
const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": KEY,
};

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const orderInfo = {
  name: `${TAG} 旅客`,
  email: `e2e-ref-${Date.now()}@jeko-esim.local`,
  phone: "0912345678",
  address: "eSIM digital delivery (test)",
  city: "Taipei",
  postalCode: "100",
};

function twdAmount(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

async function adminToken() {
  const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
  const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
  const login = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!login.ok) throw new Error(`Medusa admin 登入失敗 ${login.status}`);
  return (await login.json()).token;
}

async function findOrderByEmail(adminH, email) {
  const recent = await (
    await fetch(
      `${BASE}/admin/orders?limit=15&order=-created_at&fields=id,email,total,metadata,payment_status`,
      { headers: adminH },
    )
  ).json();
  return recent.orders?.find((o) => o.email === email) || null;
}

/** 無藍新金鑰時：store API 直接 complete cart（同 newebpay-checkout 內部流程） */
async function completeCartDirectly(cartId, adminH, email) {
  const payColRes = await fetch(`${BASE}/store/payment-collections`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cartId }),
  });
  const payColId = (await payColRes.json()).payment_collection?.id;
  if (!payColId) throw new Error("無法建立 payment-collections");

  await fetch(`${BASE}/store/payment-collections/${payColId}/payment-sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ provider_id: "pp_newebpay_newebpay" }),
  });

  const completeRes = await fetch(`${BASE}/store/carts/${cartId}/complete`, {
    method: "POST",
    headers: { ...headers, "Idempotency-Key": `e2e_referral_${cartId}` },
  });
  const completeData = await completeRes.json().catch(() => ({}));
  if (completeData?.type === "order" && completeData.order?.id) {
    return completeData.order;
  }
  // 409 race：cart 可能已完成，改輪詢 admin orders
  if (completeRes.status === 409 || completeData?.type === "cart") {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 400 + i * 200));
      const order = await findOrderByEmail(adminH, email);
      if (order?.id) return order;
    }
  }
  throw new Error("cart complete 後找不到 Medusa 訂單");
}

async function simulateReferralPaid(orderId, referralCode) {
  const backendRoot = path.resolve(root, "../esim-backend");
  const merchantOrderNo = orderId.replace(/^order_/, "");
  const mock = spawnSync(
    "npx",
    [
      "medusa",
      "exec",
      "./src/scripts/simulate-referral-paid.ts",
      merchantOrderNo,
      referralCode,
    ],
    { cwd: backendRoot, encoding: "utf8", env: process.env, timeout: 120000 },
  );
  if (mock.stdout?.trim()) console.log(mock.stdout.trim());
  if (mock.stderr?.trim()) console.log(mock.stderr.trim());
  if (mock.status !== 0) {
    throw new Error("simulate-referral-paid 失敗 exit " + mock.status);
  }
}

async function cleanup({ supabaseOrderId, medusaOrderId, partnerId, cartId }) {
  console.log("\n🧹 清理測試資料…");
  if (supabaseOrderId) {
    const { error } = await sb.from("orders").delete().eq("id", supabaseOrderId);
    if (error) console.warn("  Supabase orders 刪除:", error.message);
    else console.log("  ✓ 已刪除 Supabase orders #" + supabaseOrderId);
  } else if (medusaOrderId) {
    const { data } = await sb
      .from("orders")
      .delete()
      .eq("medusa_order_id", medusaOrderId)
      .select("id");
    if (data?.length) console.log("  ✓ 已刪除 Supabase orders (by medusa_order_id)");
  }
  if (cartId) {
    await sb.from("referral_cart_links").delete().eq("cart_id", cartId);
  }
  if (partnerId && medusaOrderId) {
    // 刪除測試點擊紀錄（若有）
    await sb
      .from("referral_clicks")
      .delete()
      .eq("partner_id", partnerId)
      .ilike("landing_path", `%${TAG}%`);
  }
  console.log("  （Medusa 訂單 " + medusaOrderId + " 保留在 DB，僅刪 Supabase 分潤列）");
}

async function main() {
  console.log("=== 優惠連結 E2E 測試 ===");
  console.log("Backend:", BASE);
  console.log("Referral code:", REFERRAL_CODE);
  console.log("Keep after test:", keepOrder);

  const { data: partner, error: pErr } = await sb
    .from("partners")
    .select("id, name, referral_code, referral_rate, status, cooperation_model")
    .eq("referral_code", REFERRAL_CODE)
    .eq("cooperation_model", "referral")
    .maybeSingle();
  if (pErr || !partner) throw new Error("找不到 referral 夥伴 " + REFERRAL_CODE);

  console.log(`夥伴 #${partner.id} ${partner.name} · rate=${partner.referral_rate}%`);

  const prodRes = await fetch(
    `${BASE}/store/products?handle=${PRODUCT_HANDLE}&fields=*variants,*variants.prices,*variants.metadata&limit=1`,
    { headers },
  );
  const prod = (await prodRes.json()).products?.[0];
  if (!prod?.variants?.[0]) throw new Error("找不到商品 " + PRODUCT_HANDLE);
  const variant = prod.variants[0];
  const listPrice = twdAmount(variant.prices?.[0]?.amount);
  const unitCost = twdAmount(
    variant.metadata?.cost_price ?? variant.metadata?.b2b_price,
  );
  console.log(`商品 ${prod.title} · 牌價 NT$${listPrice} · 成本 NT$${unitCost || "?"}`);

  const region = (
    await (await fetch(`${BASE}/store/regions`, { headers })).json()
  ).regions.find((r) => r.currency_code === "twd");
  if (!region) throw new Error("找不到 TWD region");

  const cart = (
    await (
      await fetch(`${BASE}/store/carts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ region_id: region.id, email: orderInfo.email }),
      })
    ).json()
  ).cart;

  await fetch(`${BASE}/store/carts/${cart.id}/line-items`, {
    method: "POST",
    headers,
    body: JSON.stringify({ variant_id: variant.id, quantity: 1 }),
  });

  const addr = {
    first_name: orderInfo.name,
    last_name: orderInfo.name,
    address_1: orderInfo.address,
    city: orderInfo.city,
    country_code: "tw",
    postal_code: orderInfo.postalCode,
    phone: orderInfo.phone,
  };

  await fetch(`${BASE}/store/carts/${cart.id}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: orderInfo.email,
      shipping_address: addr,
      billing_address: addr,
      metadata: { jeko_referral_code: REFERRAL_CODE },
    }),
  });

  // 模擬結帳 API 寫入 referral_cart_links
  await sb.from("referral_cart_links").upsert({
    cart_id: cart.id,
    partner_id: partner.id,
    referral_code: REFERRAL_CODE,
  });

  const ship = (
    await (
      await fetch(`${BASE}/store/shipping-options?cart_id=${cart.id}`, {
        headers,
      })
    ).json()
  ).shipping_options?.[0];
  if (!ship) throw new Error("無運費方案");
  await fetch(`${BASE}/store/carts/${cart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: ship.id }),
  });

  const cartReady = (
    await (await fetch(`${BASE}/store/carts/${cart.id}`, { headers })).json()
  ).cart;
  const cartTotal = twdAmount(cartReady.total);
  console.log("1) 購物車", cartReady.id, "total NT$" + cartTotal);

  const token = await adminToken();
  const adminH = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  let order;
  let usedDirectComplete = false;

  const npRes = await fetch(`${BASE}/store/newebpay-checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cart.id, orderInfo }),
  });

  if (npRes.ok) {
    console.log("2) newebpay-checkout OK");
    order = await findOrderByEmail(adminH, orderInfo.email);
  } else {
    const errText = await npRes.text();
    const noNewebpayKeys =
      npRes.status === 503 && errText.includes("藍新金流金鑰");
    if (!noNewebpayKeys) {
      console.error("newebpay-checkout 失敗:", errText.slice(0, 500));
      process.exit(1);
    }
    console.log("2) 本地無藍新金鑰 → 直接 complete cart + simulate-referral-paid");
    order = await completeCartDirectly(cart.id, adminH, orderInfo.email);
    usedDirectComplete = true;

    const orderTotalPre = twdAmount(order.total);
    await fetch(`${BASE}/admin/orders/${order.id}`, {
      method: "POST",
      headers: adminH,
      body: JSON.stringify({
        metadata: {
          ...(order.metadata || {}),
          jeko_referral_code: REFERRAL_CODE,
          newebpay_amount: orderTotalPre,
        },
      }),
    });
  }

  if (!order?.id) throw new Error("找不到剛建立的 Medusa 訂單");
  const orderTotal = twdAmount(order.total);
  const merchantOrderNo = order.id.replace(/^order_/, "");
  console.log("3) Medusa 訂單", order.id, "total NT$" + orderTotal);
  console.log("   metadata.jeko_referral_code =", order.metadata?.jeko_referral_code || REFERRAL_CODE);

  if (usedDirectComplete) {
    await simulateReferralPaid(order.id, REFERRAL_CODE);
    console.log("4) simulate-referral-paid OK");
  } else {
    const mock = spawnSync(
      "node",
      [
        "scripts/mock-newebpay-notify.cjs",
        merchantOrderNo,
        BASE,
        "CREDIT",
        String(orderTotal),
      ],
      { cwd: root, encoding: "utf8", env: process.env },
    );
    console.log("4) mock notify exit", mock.status);
    if (mock.stdout?.trim()) console.log(mock.stdout.trim());
    if (mock.stderr?.trim()) console.log(mock.stderr.trim());
    if (mock.status !== 0) process.exit(1);
  }

  // 等 notify 寫入 Supabase
  let supabaseRow = null;
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await sb
      .from("orders")
      .select(
        "id, partner_id, channel, referral_code, total_amount, b2b_cost, partner_profit, status, medusa_order_id, customer_email, item_details",
      )
      .eq("medusa_order_id", order.id)
      .maybeSingle();
    if (data?.id) {
      supabaseRow = data;
      break;
    }
    console.log(`   等待 Supabase 同步… (${i + 1}/8)`);
  }

  const orderAfter = (
    await (await fetch(`${BASE}/admin/orders/${order.id}`, { headers: adminH })).json()
  ).order;
  const meta = orderAfter?.metadata || {};

  console.log("\n=== 驗證結果 ===");
  console.log("Medusa payment_status:", orderAfter?.payment_status);
  console.log("Medusa referral_partner_profit:", meta.referral_partner_profit);
  console.log("Medusa referral_partner_id:", meta.referral_partner_id);
  console.log("Medusa jeko_referral_code:", meta.jeko_referral_code);

  if (!supabaseRow) {
    console.error("❌ Supabase 未寫入 orders 列");
    process.exit(1);
  }

  console.log("\nSupabase orders #" + supabaseRow.id);
  console.log("  channel:", supabaseRow.channel);
  console.log("  referral_code:", supabaseRow.referral_code);
  console.log("  partner_id:", supabaseRow.partner_id);
  console.log("  total_amount:", supabaseRow.total_amount);
  console.log("  b2b_cost:", supabaseRow.b2b_cost);
  console.log("  partner_profit:", supabaseRow.partner_profit);
  console.log("  status:", supabaseRow.status);

  const checks = [
    [supabaseRow.channel === "referral", "channel = referral"],
    [supabaseRow.partner_id === partner.id, "partner_id 正確"],
    [supabaseRow.referral_code === REFERRAL_CODE, "referral_code 正確"],
    [supabaseRow.status === "completed", "status = completed"],
    [Number(supabaseRow.partner_profit) > 0, "partner_profit > 0"],
    [Number(supabaseRow.total_amount) === orderTotal, "total_amount = 實付"],
    [meta.referral_partner_profit != null, "Medusa metadata 有 referral_partner_profit"],
    [String(meta.referral_partner_id) === String(partner.id), "Medusa metadata partner 一致"],
  ];

  let allOk = true;
  for (const [ok, label] of checks) {
    console.log(ok ? "  ✓" : "  ✗", label);
    if (!ok) allOk = false;
  }

  if (unitCost > 0) {
    const expectedRaw = Math.round((unitCost * Number(partner.referral_rate || 25)) / 100);
    const gross = Math.max(0, orderTotal - unitCost);
    const expected = Math.min(expectedRaw, gross);
    const actual = Number(supabaseRow.partner_profit);
    const profitOk = actual === expected;
    console.log(profitOk ? "  ✓" : "  ✗", `分潤 NT$${actual}（預期約 NT$${expected}）`);
    if (!profitOk) allOk = false;
  }

  if (!allOk) {
    console.error("\n❌ 驗證未通過");
    if (!keepOrder) {
      await cleanup({
        supabaseOrderId: supabaseRow.id,
        medusaOrderId: order.id,
        partnerId: partner.id,
        cartId: cart.id,
      });
    }
    process.exit(1);
  }

  console.log("\n✅ 優惠連結 E2E 測試通過");

  if (!keepOrder) {
    await cleanup({
      supabaseOrderId: supabaseRow.id,
      medusaOrderId: order.id,
      partnerId: partner.id,
      cartId: cart.id,
    });
    console.log("\n測試單已從 Supabase 刪除（夥伴後台不會殘留）。");
  } else {
    console.log("\n--keep：Supabase orders #" + supabaseRow.id + " 已保留");
  }
}

main().catch(async (e) => {
  console.error("\n❌", e.message || e);
  process.exit(1);
});
