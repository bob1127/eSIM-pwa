#!/usr/bin/env node
/**
 * Local E2E: test product → Medusa cart → newebpay-checkout → mock notify → fulfill + invoice
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

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
const BASE = "http://localhost:9000";
const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": KEY,
};
const orderInfo = {
  name: "E2E Test",
  email: `e2e-${Date.now()}@jeko-esim.local`,
  phone: "0912345678",
  address: "測試路1號",
  city: "台中市",
  postalCode: "400",
  country: "Taiwan",
};

async function main() {
  console.log(
    "ESIM host",
    process.env.ESIM_API_BASE_URL || process.env.MICROESIM_BASE_URL || "(?)",
  );
  console.log("EZPAY_INVOICE_ENABLED", process.env.EZPAY_INVOICE_ENABLED);
  console.log("MEDUSA_BACKEND_URL", process.env.MEDUSA_BACKEND_URL);

  const prod = (
    await (
      await fetch(
        `${BASE}/store/products?handle=microesim-test-global-66&fields=*variants,*variants.prices&limit=1`,
        { headers },
      )
    ).json()
  ).products[0];
  if (!prod) throw new Error("test product not found");
  const variant = prod.variants[0];
  const region = (
    await (await fetch(`${BASE}/store/regions`, { headers })).json()
  ).regions.find((r) => r.currency_code === "twd");

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
    }),
  });
  const ship = (
    await (
      await fetch(`${BASE}/store/shipping-options?cart_id=${cart.id}`, {
        headers,
      })
    ).json()
  ).shipping_options[0];
  await fetch(`${BASE}/store/carts/${cart.id}/shipping-methods`, {
    method: "POST",
    headers,
    body: JSON.stringify({ option_id: ship.id }),
  });
  const cartReady = (
    await (await fetch(`${BASE}/store/carts/${cart.id}`, { headers })).json()
  ).cart;
  console.log("1) cart", cartReady.id, "total", cartReady.total);

  const npRes = await fetch(`${BASE}/store/newebpay-checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({ cart_id: cart.id, orderInfo }),
  });
  const npText = await npRes.text();
  console.log("2) newebpay-checkout", npRes.status);
  if (!npRes.ok) {
    console.log(npText.slice(0, 800));
    process.exit(1);
  }
  const hasForm = /TradeInfo/.test(npText);
  const gw = (/https?:\/\/[^"']+newebpay[^"']*/.exec(npText) || [])[0];
  console.log("   html form", hasForm, "gateway", gw || "(parse fail)");

  const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
  const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";
  const login = await fetch(`${BASE}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = (await login.json()).token;
  const adminH = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const recent = await (
    await fetch(`${BASE}/admin/orders?limit=15&order=-created_at`, {
      headers: adminH,
    })
  ).json();
  const order = recent.orders?.find((o) => o.email === orderInfo.email);
  console.log(
    "3) order",
    order?.id,
    "total",
    order?.total,
    "payment",
    order?.payment_status,
  );
  if (!order) {
    console.log(
      "recent emails",
      recent.orders?.slice(0, 5).map((o) => o.email),
    );
    process.exit(1);
  }
  const merchantOrderNo = order.id.replace(/^order_/, "");
  console.log("   MerchantOrderNo", merchantOrderNo);

  const mock = spawnSync(
    "node",
    ["scripts/mock-newebpay-notify.cjs", merchantOrderNo, BASE, "CREDIT"],
    { cwd: root, encoding: "utf8", env: process.env },
  );
  console.log("4) mock notify exit", mock.status);
  console.log((mock.stdout || "").trim());
  if (mock.stderr) console.log((mock.stderr || "").trim());

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const order2 = (
      await (
        await fetch(`${BASE}/admin/orders/${order.id}`, { headers: adminH })
      ).json()
    ).order;
    const meta = order2?.metadata || {};
    const hasQr = !!meta.esim_qrcodes;
    const invErr = meta.ezpay_invoice_error || null;
    const invNo = meta.ezpay_invoice_number || null;
    const hasInv = !!(invNo || invErr || meta.ezpay_invoice_at);
    console.log(
      `5.${i + 1}) pay=${order2?.payment_status} qr=${hasQr} inv=${hasInv} invNo=${invNo || invErr || "(pending)"}`,
    );
    if (hasQr && (hasInv || i >= 7)) {
      console.log("--- FINAL ---");
      console.log(
        JSON.stringify(
          {
            order_id: order2.id,
            payment_status: order2.payment_status,
            total: order2.total,
            newebpay_pay_time: meta.newebpay_pay_time || null,
            esim_qrcodes_preview:
              typeof meta.esim_qrcodes === "string"
                ? meta.esim_qrcodes.slice(0, 240)
                : meta.esim_qrcodes,
            ezpay_invoice_number: invNo,
            ezpay_invoice_at: meta.ezpay_invoice_at || null,
            ezpay_invoice_error: invErr,
            ezpay_invoice_status: meta.ezpay_invoice_status || null,
          },
          null,
          2,
        ),
      );
      process.exit(hasQr ? 0 : 1);
    }
  }
  console.log("timed out waiting for fulfill/invoice");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
