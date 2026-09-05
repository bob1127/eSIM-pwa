/**
 * 緊急補發：藍新已扣款但 notify 405 漏接
 * 用法：node scripts/recover-newebpay-missed.mjs
 */
const fs = require("fs");
const path = require("path");

function loadEnv(p) {
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const root = path.join(__dirname, "..");
const env = {
  ...loadEnv(path.join(root, ".env")),
  ...loadEnv(path.join(root, ".env.local")),
};

const MEDUSA = "http://localhost:9000";
const FULFILL = "http://localhost:3000";
const ORDER_NO = "01M1RCBE7ADC9PG6FRFZ92WDQH";
const ORDER_ID = `order_${ORDER_NO}`;
const TRADE_NO = "28090516535487709";
const PAY_TIME = "2026-09-05 16:53:54"; // from NewebPay notify failure mail / TradeNo prefix
const AMOUNT = 759;

async function main() {
  const secret = env.FULFILLMENT_INTERNAL_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("缺 FULFILLMENT_INTERNAL_SECRET");
  }

  const authRes = await fetch(`${MEDUSA}/auth/user/emailpass`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: env.MEDUSA_ADMIN_EMAIL,
      password: env.MEDUSA_ADMIN_PASSWORD,
    }),
  });
  const auth = await authRes.json();
  if (!auth.token) throw new Error(`Medusa auth failed: ${authRes.status}`);
  const h = {
    authorization: `Bearer ${auth.token}`,
    "content-type": "application/json",
  };

  const orderRes = await fetch(
    `${MEDUSA}/admin/orders/${ORDER_ID}?fields=+metadata,+email,*items,*payment_collections,*payment_collections.payments,*payment_collections.payment_sessions`,
    { headers: h },
  );
  const orderBody = await orderRes.json();
  const order = orderBody.order;
  if (!order) throw new Error("order not found");

  console.log("[1] order", {
    id: order.id,
    email: order.email,
    status: order.status,
    payment_status: order.payment_status,
    hasQr: !!order.metadata?.esim_qrcodes,
    invoice: order.metadata?.ezpay_invoice_number || null,
  });

  // Capture if needed
  const payment = order.payment_collections?.[0]?.payments?.[0];
  if (payment?.id && !payment.captured_at) {
    console.log("[2] capturing payment", payment.id);
    const cap = await fetch(`${MEDUSA}/admin/payments/${payment.id}/capture`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({}),
    });
    const capText = await cap.text();
    console.log("[2] capture", cap.status, capText.slice(0, 300));
  } else {
    console.log("[2] skip capture", {
      paymentId: payment?.id,
      captured_at: payment?.captured_at,
    });
  }

  // Patch payment metadata
  console.log("[3] patch newebpay paid metadata");
  const meta = {
    ...(order.metadata || {}),
    newebpay_merchant_order_no: ORDER_NO,
    newebpay_payment_type: "CREDIT",
    newebpay_trade_no: TRADE_NO,
    newebpay_pay_time: PAY_TIME,
    newebpay_amount: AMOUNT,
    newebpay_notify_recovered_at: new Date().toISOString(),
    newebpay_notify_recover_note: "manual recover after Vercel 405 on notify URL",
  };
  const upd = await fetch(`${MEDUSA}/admin/orders/${ORDER_ID}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ metadata: meta }),
  });
  // Medusa v2 may use POST or POST with different body - try alternatives
  let updText = await upd.text();
  console.log("[3a] POST update", upd.status, updText.slice(0, 200));
  if (!upd.ok) {
    const upd2 = await fetch(`${MEDUSA}/admin/orders/${ORDER_ID}`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        additional_data: {},
        metadata: meta,
      }),
    });
    updText = await upd2.text();
    console.log("[3b] retry", upd2.status, updText.slice(0, 200));
  }

  // Refresh order for items
  const fresh = (
    await (
      await fetch(
        `${MEDUSA}/admin/orders/${ORDER_ID}?fields=+metadata,+email,*items`,
        { headers: h },
      )
    ).json()
  ).order;

  const lineItems = (fresh.items || []).map((it) => {
    const qty = Math.max(1, Math.round(Number(it.quantity) || 1));
    const unit =
      typeof it.unit_price === "number"
        ? Math.round(it.unit_price)
        : Math.round(AMOUNT / qty);
    const varMeta = it.variant?.metadata || it.metadata || {};
    return {
      name: it.product_title || it.title || "eSIM",
      sku: it.variant_sku || varMeta.plan_id || "",
      planId:
        varMeta.plan_id ||
        it.metadata?.esim_plan_id ||
        it.metadata?.plan_id ||
        "",
      quantity: qty,
      unit_price: unit,
    };
  });
  console.log("[4] lineItems", lineItems);

  const fh = {
    "Content-Type": "application/json",
    "X-Fulfillment-Secret": secret,
  };

  // Fulfill
  if (fresh.metadata?.esim_qrcodes) {
    console.log("[5] already has QR, skip fulfill");
  } else {
    console.log("[5] fulfill-order…");
    const fulfillRes = await fetch(`${FULFILL}/api/internal/fulfill-order`, {
      method: "POST",
      headers: fh,
      body: JSON.stringify({
        orderId: ORDER_ID,
        email: fresh.email,
        items: lineItems.map((it) => ({
          name: it.name,
          sku: it.sku,
          planId: it.planId,
          quantity: it.quantity,
        })),
      }),
    });
    const fulfillRaw = await fulfillRes.text();
    let fulfillData = {};
    try {
      fulfillData = fulfillRaw ? JSON.parse(fulfillRaw) : {};
    } catch {
      fulfillData = { message: fulfillRaw.slice(0, 500) };
    }
    console.log("[5] fulfill", fulfillRes.status, {
      success: fulfillData.success,
      qrCount: Array.isArray(fulfillData.qrcodes)
        ? fulfillData.qrcodes.length
        : 0,
      message: fulfillData.message || null,
    });
    if (
      !fulfillRes.ok ||
      !Array.isArray(fulfillData.qrcodes) ||
      !fulfillData.qrcodes.length
    ) {
      throw new Error(
        `fulfill failed: ${fulfillData.message || fulfillRaw.slice(0, 400)}`,
      );
    }

    const qrcodes = fulfillData.qrcodes.map((q) => ({
      ...q,
      name: q?.name || "eSIM",
      src:
        String(q?.src || "").startsWith("http") ||
        String(q?.src || "").startsWith("data:image/")
          ? q.src
          : q?.src
            ? `data:image/png;base64,${q.src}`
            : q.src,
    }));

    // Write QR back via admin — try order edit endpoint used elsewhere
    await patchOrderMetadata(h, ORDER_ID, {
      ...meta,
      esim_qrcodes: JSON.stringify(qrcodes),
      fulfillment_status: "fulfilled",
      fulfillment_error: "",
      esim_fulfill_at: new Date().toISOString(),
    });
    console.log("[5] QR written to order metadata, count=", qrcodes.length);
    console.log(
      "[5] QR summary",
      qrcodes.map((q) => ({
        name: q.name,
        iccid: q.iccid || null,
        topupId: q.topupId || q.topup_id || null,
        hasSrc: !!q.src,
      })),
    );
  }

  // Invoice
  const afterFulfill = (
    await (
      await fetch(
        `${MEDUSA}/admin/orders/${ORDER_ID}?fields=+metadata,+email`,
        { headers: h },
      )
    ).json()
  ).order;

  if (afterFulfill.metadata?.ezpay_invoice_number) {
    console.log("[6] invoice exists", afterFulfill.metadata.ezpay_invoice_number);
  } else {
    console.log("[6] issue-invoice…");
    const invoiceRes = await fetch(`${FULFILL}/api/internal/issue-invoice`, {
      method: "POST",
      headers: fh,
      body: JSON.stringify({
        orderId: ORDER_ID,
        orderNo: ORDER_NO.slice(0, 20),
        email: afterFulfill.email,
        amount: AMOUNT,
        items: lineItems.map((it) => ({
          name: it.name,
          qty: it.quantity || 1,
          price: it.unit_price,
        })),
      }),
    });
    const invoiceData = await invoiceRes.json().catch(() => ({}));
    console.log("[6] invoice", invoiceRes.status, invoiceData);
    if (invoiceRes.ok && invoiceData?.success && invoiceData?.invoiceNumber) {
      await patchOrderMetadata(h, ORDER_ID, {
        ...(afterFulfill.metadata || {}),
        ezpay_invoice_number: invoiceData.invoiceNumber,
        ezpay_invoice_random: invoiceData.randomNum || "",
        ezpay_invoice_at: invoiceData.createTime || new Date().toISOString(),
      });
    }
  }

  // Admin LINE / email notify
  console.log("[7] notify-admin-order…");
  const notifyRes = await fetch(`${FULFILL}/api/internal/notify-admin-order`, {
    method: "POST",
    headers: fh,
    body: JSON.stringify({
      orderId: ORDER_ID,
      email: afterFulfill.email,
      amount: AMOUNT,
      paymentProvider: "newebpay",
      payTime: PAY_TIME,
      tradeNo: TRADE_NO,
      items: lineItems.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
    }),
  });
  const notifyData = await notifyRes.json().catch(() => ({}));
  console.log("[7] notify", notifyRes.status, notifyData);

  const final = (
    await (
      await fetch(
        `${MEDUSA}/admin/orders/${ORDER_ID}?fields=+metadata,+email,*payment_collections,*payment_collections.payments`,
        { headers: h },
      )
    ).json()
  ).order;
  const fm = final.metadata || {};
  let qrs = fm.esim_qrcodes;
  if (typeof qrs === "string") {
    try {
      qrs = JSON.parse(qrs);
    } catch {}
  }
  console.log("\n=== FINAL ===");
  console.log(
    JSON.stringify(
      {
        id: final.id,
        email: final.email,
        status: final.status,
        payment_status: final.payment_status,
        captured:
          final.payment_collections?.[0]?.payments?.[0]?.captured_at || null,
        pay_time: fm.newebpay_pay_time || null,
        trade_no: fm.newebpay_trade_no || null,
        invoice: fm.ezpay_invoice_number || null,
        qr_count: Array.isArray(qrs) ? qrs.length : 0,
        qrs: Array.isArray(qrs)
          ? qrs.map((q) => ({
              name: q.name,
              iccid: q.iccid || null,
              topupId: q.topupId || q.topup_id || null,
              hasSrc: !!q.src,
            }))
          : null,
      },
      null,
      2,
    ),
  );
}

async function patchOrderMetadata(h, orderId, metadata) {
  // Medusa 2 admin update order metadata
  const attempts = [
    { method: "POST", body: { metadata } },
    {
      method: "POST",
      url: `${MEDUSA}/admin/orders/${orderId}`,
      body: { metadata },
    },
  ];

  // Prefer workflow endpoint if available
  let res = await fetch(`${MEDUSA}/admin/orders/${orderId}`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ metadata }),
  });
  let text = await res.text();
  if (res.ok) {
    console.log("[meta] POST ok");
    return;
  }
  console.log("[meta] POST failed", res.status, text.slice(0, 180));

  // Fallback: create order edit / use updates via custom - try PUT
  res = await fetch(`${MEDUSA}/admin/orders/${orderId}`, {
    method: "PUT",
    headers: h,
    body: JSON.stringify({ metadata }),
  });
  text = await res.text();
  console.log("[meta] PUT", res.status, text.slice(0, 180));
  if (!res.ok) {
    // Last resort: hit a tiny local script through store route if exists
    throw new Error(`無法寫入 order metadata: ${res.status} ${text.slice(0, 200)}`);
  }
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
