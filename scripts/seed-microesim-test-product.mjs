/**
 * 將 MicroeSIM 測試可購買方案寫入 Medusa 商品目錄
 * Global 66-Total1GB-7-A0
 * channel_dataplan_id: b1a926e1-d770-4e03-804e-c527b9397eb9
 */
const MEDUSA_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/$/, "");
const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

const HANDLE = "microesim-test-global-66";
const PLAN_ID = "b1a926e1-d770-4e03-804e-c527b9397eb9";
const SKU = "Global 66-Total1GB-7-A0";
const COST_HKD = 13.88;
const HKD_TO_TWD = Number(process.env.HKD_TO_TWD || 4.1);
const RETAIL_TWD = Number(process.env.ESIM_TEST_RETAIL_TWD || 5); // 小額真金流測試用，正式再改回公式價

const SALES_CHANNEL_ID = "sc_01KPJKQCG9X3ZGDM5156KFW8HD";
/** 掛在日本分類（首頁主要入口）；全球方案也會出現在商品列表 */
const CATEGORY_IDS = [
  "pcat_01KPJN0F8RYEENWHMS7D5WT7QR", // japan
  "pcat_01KW4FPRB879RVH7SQT35SZQJ4", // us-ca
];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error(`登入失敗: ${data.message || res.status}`);
  }
  return data.token;
}

async function admin(token, path, options = {}) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${path}] 非 JSON: ${text.slice(0, 300)}`);
  }
  if (!res.ok) {
    throw new Error(
      `[${path}] ${res.status}: ${data.message || JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return data;
}

async function main() {
  console.log("🔐 登入…", EMAIL, "@", MEDUSA_URL);
  const token = await login();

  const { products } = await admin(
    token,
    `/admin/products?handle=${encodeURIComponent(HANDLE)}&limit=1&fields=*variants,*categories`,
  );
  let product = products?.[0];

  const payloadBase = {
    title: "【測試購買】全球66國 eSIM 1GB / 7天",
    subtitle: "MicroeSIM 測試環境專用方案",
    handle: HANDLE,
    description:
      "供應商測試帳號可購買方案（Global 66-Total1GB-7-A0）。僅供串接／購買流程驗證，非正式販售商品。",
    status: "published",
    discountable: true,
    thumbnail:
      process.env.ESIM_TEST_PRODUCT_THUMB ||
      "https://esim-backend-eight.vercel.app/static/1776598094641-sim-japan.png",
    images: [
      {
        url:
          process.env.ESIM_TEST_PRODUCT_THUMB ||
          "https://esim-backend-eight.vercel.app/static/1776598094641-sim-japan.png",
      },
    ],
    metadata: {
      type: "esim",
      microesim_test: true,
      test_plan: true,
      channel_dataplan_id: PLAN_ID,
    },
    options: [
      { title: "使用天數", values: ["7天"] },
      { title: "電信商", values: ["Global / 自動切換"] },
      { title: "數據量", values: ["總量1GB"] },
    ],
    sales_channels: [{ id: SALES_CHANNEL_ID }],
    categories: CATEGORY_IDS.map((id) => ({ id })),
  };

  const variantPayload = {
    title: "全球66國 1GB / 7天",
    sku: SKU,
    manage_inventory: false,
    allow_backorder: false,
    options: {
      使用天數: "7天",
      電信商: "Global / 自動切換",
      數據量: "總量1GB",
    },
    prices: [{ currency_code: "twd", amount: RETAIL_TWD }],
    metadata: {
      plan_id: PLAN_ID,
      type: "esim",
      carrier: "Global / 自動切換",
      data: "總量1GB",
      days: "7",
      cost_hkd: String(COST_HKD),
      apn: "cmlink",
      microesim_test: true,
    },
  };

  if (!product) {
    console.log("🆕 建立商品…");
    const created = await admin(token, "/admin/products", {
      method: "POST",
      body: JSON.stringify({
        ...payloadBase,
        variants: [variantPayload],
      }),
    });
    product = created.product;
    console.log("✅ 已建立", product.id, product.handle);
  } else {
    console.log("♻️ 更新既有商品", product.id);
    await admin(token, `/admin/products/${product.id}`, {
      method: "POST",
      body: JSON.stringify({
        title: payloadBase.title,
        subtitle: payloadBase.subtitle,
        description: payloadBase.description,
        status: "published",
        discountable: true,
        thumbnail: payloadBase.thumbnail,
        images: payloadBase.images,
        metadata: payloadBase.metadata,
        options: payloadBase.options,
        sales_channels: payloadBase.sales_channels,
        categories: payloadBase.categories,
      }),
    });

    const oldIds = (product.variants || []).map((v) => v.id).filter(Boolean);
    if (oldIds.length) {
      await admin(token, `/admin/products/${product.id}/variants/batch`, {
        method: "POST",
        body: JSON.stringify({ delete: oldIds }),
      });
    }
    await admin(token, `/admin/products/${product.id}/variants/batch`, {
      method: "POST",
      body: JSON.stringify({ create: [variantPayload] }),
    });
    console.log("✅ 已更新變體與價格 NT$", RETAIL_TWD);
  }

  console.log("\n======= 完成 =======");
  console.log(`前台: /product/japan/${HANDLE}`);
  console.log(`也在: /product/us-ca/${HANDLE}`);
  console.log(`plan_id: ${PLAN_ID}`);
  console.log(`售價: NT$ ${RETAIL_TWD}`);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
