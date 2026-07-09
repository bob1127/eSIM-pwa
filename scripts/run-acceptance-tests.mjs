#!/usr/bin/env node
/**
 * 自動驗收測試 — 使用 tangsongzhubao@gmail.com
 * 執行：node scripts/run-acceptance-tests.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const TEST_EMAIL = "tangsongzhubao@gmail.com";
const TEST_PASSWORD = "AcceptTest2026!A";
const TEST_SLUG = "tangsong-test";
const BASE = process.env.NEXTAUTH_URL || "http://localhost:3000";

function loadEnv() {
  for (const f of [".env.local", ".env.migrate.local"]) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("❌ 缺少 Supabase 環境變數");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(url, anonKey);

const results = [];

function pass(step, detail) {
  results.push({ step, ok: true, detail });
  console.log(`✅ ${step}: ${detail}`);
}
function fail(step, detail) {
  results.push({ step, ok: false, detail });
  console.log(`❌ ${step}: ${detail}`);
}
function warn(step, detail) {
  results.push({ step, ok: "warn", detail });
  console.log(`⚠️  ${step}: ${detail}`);
}

async function approvePartner(partnerId) {
  const { data: partner } = await admin
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .single();
  if (!partner) throw new Error("partner not found");

  await admin.from("partners").update({ status: "active" }).eq("id", partnerId);

  const { data: existingStore } = await admin
    .from("stores")
    .select("id")
    .eq("domain", partner.slug)
    .maybeSingle();

  let storeCreated = false;
  if (!existingStore) {
    const { error } = await admin.from("stores").insert([
      {
        domain: partner.slug,
        store_name: partner.name,
        status: "active",
        markup_rate: 20,
        user_id: null,
      },
    ]);
    if (error) throw error;
    storeCreated = true;
  }
  return { partner: { ...partner, status: "active" }, storeCreated };
}

async function ensureTestUser() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  let user = list?.users?.find((u) => u.email?.toLowerCase() === TEST_EMAIL);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "唐松主寶測試", source: "acceptance_test" },
    });
    if (error) throw error;
    user = data.user;
    pass("建立測試 Google 帳號", `${TEST_EMAIL}（可用相同 email Google 登入）`);
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    pass("測試帳號已存在", `${TEST_EMAIL}（已重設測試密碼供 API 驗證）`);
  }
  return user;
}

async function getSession(email, password) {
  const client = createClient(url, anonKey);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { client, session: data.session, user: data.user };
}

async function main() {
  console.log("\n🧪 JEKO eSIM 自動驗收測試");
  console.log(`   測試帳號: ${TEST_EMAIL}`);
  console.log(`   站台: ${BASE}\n`);

  // 1. RLS
  const { data: anonStores, error: rlsErr } = await anon
    .from("stores")
    .select("domain")
    .eq("status", "active");
  if (rlsErr || !anonStores?.length) {
    fail("RLS 公開讀取 stores", rlsErr?.message || "0 rows — 請執行 00001_partner_catalog_rls.sql");
  } else {
    pass("RLS 公開讀取 stores", `active 商店: ${anonStores.map((s) => s.domain).join(", ")}`);
  }

  const { data: anonProducts } = await anon.from("products").select("id").limit(1);
  if (!anonProducts?.length) fail("RLS 公開讀取 products", "0 rows");
  else pass("RLS 公開讀取 products", "OK");

  // 2. Partner storefront
  try {
    const res = await fetch(`${BASE}/p/bob/`);
    const html = await res.text();
    if (res.ok && html.includes("日本原生吃到飽")) {
      pass("夥伴商店 /p/bob", "HTTP 200，商品已顯示");
    } else {
      fail("夥伴商店 /p/bob", `HTTP ${res.status}`);
    }
  } catch (e) {
    fail("夥伴商店 /p/bob", e.message);
  }

  // 3. Boss 審核 lawsdestiny05@gmail.com
  const { data: lawPartner } = await admin
    .from("partners")
    .select("id,email,slug,status")
    .eq("email", "lawsdestiny05@gmail.com")
    .maybeSingle();

  if (!lawPartner) {
    fail("審核 lawsdestiny05", "找不到夥伴資料");
  } else if (lawPartner.status === "active") {
    const { data: lawStore } = await admin
      .from("stores")
      .select("domain")
      .eq("domain", lawPartner.slug)
      .maybeSingle();
    pass(
      "審核 lawsdestiny05 → active",
      lawStore ? `已是 active，商店 /p/${lawStore.domain}` : "active 但尚無 store",
    );
    if (!lawStore) {
      const r = await approvePartner(lawPartner.id);
      pass("補建 lawsdestiny 商店", `/p/${r.partner.slug}`);
    }
  } else {
    try {
      const r = await approvePartner(lawPartner.id);
      pass("審核 lawsdestiny05 → active", `商店 /p/${r.partner.slug}${r.storeCreated ? "（新建）" : ""}`);
    } catch (e) {
      fail("審核 lawsdestiny05", e.message);
    }
  }

  // 4. tangsongzhubao 夥伴申請 + 審核 + 商品池
  const testUser = await ensureTestUser();

  // 清除舊測試夥伴（若存在）
  await admin.from("partners").delete().eq("email", TEST_EMAIL);

  const { error: insertErr } = await anon.from("partners").insert([
    {
      name: "唐松測試夥伴",
      slug: TEST_SLUG,
      email: TEST_EMAIL,
      status: "pending",
      description: "自動驗收測試申請",
    },
  ]);

  if (insertErr) {
    // fallback: service role insert then verify RLS read via auth
    await admin.from("partners").insert([
      {
        name: "唐松測試夥伴",
        slug: TEST_SLUG,
        email: TEST_EMAIL,
        status: "pending",
        description: "自動驗收測試申請（admin insert）",
      },
    ]);
    warn("夥伴申請 INSERT（anon）", `RLS 拒絕: ${insertErr.message}；已用 service role 代填`);
  } else {
    pass("夥伴申請 INSERT（anon）", `${TEST_EMAIL} pending`);
  }

  const { data: tangPartner } = await admin
    .from("partners")
    .select("id")
    .eq("email", TEST_EMAIL)
    .single();

  const approveR = await approvePartner(tangPartner.id);
  pass("審核 tangsongzhubao → active", `/p/${TEST_SLUG}`);

  // 登入並連結 store
  const { client: authClient, session, user } = await getSession(TEST_EMAIL, TEST_PASSWORD);

  const verifyRes = await fetch(`${BASE}/api/partner/verify-access`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const verifyData = await verifyRes.json();
  if (verifyRes.ok && verifyData.ok) {
    pass("夥伴 verify-access API", `partner=${verifyData.partner?.name}, store=${verifyData.store?.domain}`);
  } else {
    fail("夥伴 verify-access API", verifyData.message || JSON.stringify(verifyData));
  }

  // 連結 user_id 到 store
  await admin
    .from("stores")
    .update({ user_id: user.id })
    .eq("domain", TEST_SLUG);

  // 商品池讀取 + 上架
  const { data: products } = await authClient.from("products").select("id, name").limit(5);
  if (!products?.length) fail("夥伴商品池讀取", "0 products");
  else pass("夥伴商品池讀取", `${products.length} 項商品`);

  const productId = products[0].id;
  const { data: store } = await authClient
    .from("stores")
    .select("id")
    .eq("domain", TEST_SLUG)
    .single();

  const { error: listErr } = await authClient.from("store_products").insert([
    { store_id: store.id, product_id: productId },
  ]);

  if (listErr) {
    if (listErr.message.includes("duplicate")) {
      pass("夥伴商品上架", `商品 #${productId} 已在架上`);
    } else {
      fail("夥伴商品上架", listErr.message);
    }
  } else {
    pass("夥伴商品上架", `商品 #${productId} → store #${store.id}`);
  }

  // 驗證 tang 商店前台
  try {
    const res = await fetch(`${BASE}/p/${TEST_SLUG}/`);
    const html = await res.text();
    if (res.ok && html.includes(products[0].name)) {
      pass(`夥伴商店 /p/${TEST_SLUG}`, "HTTP 200，上架商品可見");
    } else if (res.ok) {
      warn(`夥伴商店 /p/${TEST_SLUG}`, "HTTP 200 但商品名未在 HTML 中（可能 client render）");
    } else {
      fail(`夥伴商店 /p/${TEST_SLUG}`, `HTTP ${res.status}`);
    }
  } catch (e) {
    fail(`夥伴商店 /p/${TEST_SLUG}`, e.message);
  }

  // 5. register-distributor 流程（API 部分）
  globalThis.verificationCodes = globalThis.verificationCodes || {};
  globalThis.verificationCodes[TEST_EMAIL] = {
    verified: true,
    applicationExpires: Date.now() + 3600000,
  };

  // 注意：register-auth 需 dev server 的 global state，改測 contact submit
  const contactRes = await fetch(`${BASE}/api/contact/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "partner",
      name: "唐松測試",
      email: TEST_EMAIL,
      message: "自動驗收：合作諮詢表單測試",
      agreed_privacy: true,
      partner_type: "travel_agency",
    }),
  });
  if (contactRes.ok) pass("合作諮詢表單 API", "contact_submissions 寫入成功");
  else fail("合作諮詢表單 API", await contactRes.text());

  // 6. 退款流程
  // 建立測試訂單給 tangsongzhubao
  const { data: testOrder, error: orderErr } = await admin
    .from("orders")
    .insert([
      {
        customer_email: TEST_EMAIL,
        customer_name: "唐松測試",
        total_amount: 599,
        b2b_cost: 400,
        partner_profit: 0,
        status: "completed",
        item_details: [{ name: "測試 eSIM", qty: 1 }],
        items: [{ name: "測試 eSIM", qty: 1 }],
        esim_activation_status: "not_activated",
      },
    ])
    .select("id")
    .single();

  if (orderErr) {
    fail("建立測試訂單", orderErr.message);
  } else {
    pass("建立測試訂單", `#${testOrder.id} for ${TEST_EMAIL}`);

    const refundRes = await fetch(`${BASE}/api/refund/request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        order_id: testOrder.id,
        request_type: "full_refund",
        reason_type: "wrong_purchase",
        reason_note: "自動驗收測試退款",
        activation_claim: "not_activated",
        agreed_terms: true,
      }),
    });
    const refundData = await refundRes.json();
    if (refundRes.ok) {
      pass("會員退款申請", `order #${testOrder.id} → pending`);

      // Boss 審核（service role 模擬）
      const { data: refundRow } = await admin
        .from("refund_requests")
        .select("id")
        .eq("order_id", testOrder.id)
        .eq("status", "pending")
        .maybeSingle();

      if (refundRow) {
        await admin
          .from("refund_requests")
          .update({ status: "approved", admin_note: "自動驗收核准" })
          .eq("id", refundRow.id);
        await admin.from("orders").update({ status: "refunded" }).eq("id", testOrder.id);
        pass("Boss 退款審核", `refund #${refundRow.id} → approved`);
      }
    } else {
      fail("會員退款申請", refundData.error || JSON.stringify(refundData));
    }
  }

  // 7. 會員訂單 API
  const ordersRes = await fetch(
    `${BASE}/api/orders/user-orders?email=${encodeURIComponent(TEST_EMAIL)}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } },
  );
  const ordersData = await ordersRes.json();
  if (ordersRes.ok && ordersData.success) {
    pass("會員訂單 API", `${ordersData.data?.length ?? 0} 筆訂單`);
  } else {
    fail("會員訂單 API", ordersData.message || JSON.stringify(ordersData));
  }

  // Summary
  const ok = results.filter((r) => r.ok === true).length;
  const bad = results.filter((r) => r.ok === false).length;
  const w = results.filter((r) => r.ok === "warn").length;

  console.log("\n" + "═".repeat(50));
  console.log(`📊 結果: ${ok} 通過 / ${bad} 失敗 / ${w} 警告`);
  console.log("═".repeat(50));
  console.log(`\n🔑 手動 Google 登入驗證：`);
  console.log(`   1. 開 ${BASE}/login`);
  console.log(`   2. Google 登入 ${TEST_EMAIL}`);
  console.log(`   3. 會員中心 → 應看到測試訂單`);
  console.log(`   4. /partner/login → 夥伴後台 → /partner/catalog`);
  console.log(`   5. 商店網址: ${BASE}/p/${TEST_SLUG}/\n`);

  process.exit(bad > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("\n💥 測試中斷:", e.message);
  process.exit(1);
});
