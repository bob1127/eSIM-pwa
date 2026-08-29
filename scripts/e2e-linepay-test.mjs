#!/usr/bin/env node
/**
 * Local E2E: cart → LINE Pay v4 request (mock) → confirm → fulfill + invoice
 *
 * Assumptions:
 * - esim-backend is reachable at http://localhost:9000
 * - We use a local stub for LINE Pay (POST /v4/payments/request, /v4/payments/{id}/confirm)
 * - fulfill/invoice is triggered by calling esim-backend POST /linepay/confirm
 *   which calls esim-store-front internal APIs at FULFILLMENT_INTERNAL_URL.
 *
 * To avoid unexpected invoice cost, we only proceed when cartReady.total == TARGET_TOTAL (default 5).
 */
import fs from "fs"
import path from "path"
import crypto from "crypto"
import http from "http"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")

function loadEnv(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 0) continue
    const k = t.slice(0, i)
    let v = t.slice(i + 1)
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (!process.env[k]) process.env[k] = v
  }
}

loadEnv(path.resolve(root, "../esim-backend/.env"))
loadEnv(path.resolve(root, ".env.local"))

const BASE = process.env.MEDUSA_BASE_URL || "http://localhost:9000"
const STUB_PORT = Number(process.env.LINEPAY_STUB_PORT || 4100)
const TARGET_TOTAL = Number(process.env.LINEPAY_TARGET_TOTAL || 5)
const PRODUCT_HANDLE = process.env.LINEPAY_TEST_PRODUCT_HANDLE || "microesim-test-global-66"

const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
if (!MEDUSA_PUBLISHABLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY (check esim-store-front/.env.local)")
}

const MEDUSA_ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "info@bluelink.com.tw"
const MEDUSA_ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "bluelink_KB76qUcdEd6"

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
}

const orderInfo = {
  name: "E2E LINE Pay Test",
  email: `e2e-linepay-${Date.now()}@jeko-esim.local`,
  phone: "0912345678",
  address: "測試路1號",
  city: "台中市",
  postalCode: "400",
  country: "Taiwan",
}

const addr = {
  first_name: orderInfo.name,
  last_name: orderInfo.name,
  address_1: orderInfo.address,
  city: orderInfo.city,
  country_code: "tw",
  postal_code: orderInfo.postalCode,
  phone: orderInfo.phone,
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function startLinePayMockServer() {
  const server = http.createServer((req, res) => {
    let body = ""
    req.on("data", (chunk) => {
      body += String(chunk)
    })
    req.on("end", () => {
      const url = new URL(req.url || "/", `http://localhost:${STUB_PORT}`)
      res.setHeader("Content-Type", "application/json")

      const send = (code, payload) => {
        res.statusCode = code
        res.end(JSON.stringify(payload))
      }

      if (req.method === "POST" && url.pathname === "/v4/payments/request") {
        // Backend needs: lineData.info.transactionId, info.paymentUrl.web, info.paymentAccessToken
        const transactionId = `tx_mock_${crypto.randomUUID()}`
        return send(200, {
          returnCode: "0000",
          returnMessage: "success",
          info: {
            transactionId,
            paymentUrl: { web: "http://mock.local/linepay/approve" },
            paymentAccessToken: `tok_${crypto.randomUUID()}`,
          },
          raw: body,
        })
      }

      if (req.method === "POST" && /^\/v4\/payments\/[^/]+\/confirm$/.test(url.pathname)) {
        return send(200, {
          returnCode: "0000",
          returnMessage: "success",
          raw: body,
        })
      }

      return send(404, { returnCode: "9999", message: "not mocked" })
    })
  })

  return new Promise((resolve) => {
    server.listen(STUB_PORT, () => resolve(server))
  })
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}: ${JSON.stringify(data).slice(0, 400)}`)
  }
  return data
}

async function run() {
  console.log("[e2e-linepay] Starting LINE Pay stub on port", STUB_PORT)
  const stubServer = await startLinePayMockServer()

  try {
    console.log("[e2e-linepay] Fetch product", PRODUCT_HANDLE)
    const prodRes = await fetchJson(
      `${BASE}/store/products?handle=${encodeURIComponent(PRODUCT_HANDLE)}&fields=*variants,*variants.prices&limit=1`,
      { headers }
    )
    const prod = prodRes.products?.[0]
    if (!prod) throw new Error(`test product not found: ${PRODUCT_HANDLE}`)

    const variants = Array.isArray(prod.variants) ? prod.variants : []
    if (!variants.length) throw new Error("product has no variants")

    const regionRes = await fetchJson(`${BASE}/store/regions`, { headers })
    const region = regionRes.regions?.find((r) => r.currency_code === "twd")
    if (!region) throw new Error("TWD region not found")

    let picked = null
    let pickedCart = null

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]
      console.log(`[e2e-linepay] Try variant ${i + 1}/${variants.length}`, {
        id: variant.id,
      })

      // 1) cart
      const cartRes = await fetchJson(`${BASE}/store/carts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ region_id: region.id, email: orderInfo.email }),
      })
      const cart = cartRes.cart

      // 2) line item
      await fetchJson(`${BASE}/store/carts/${cart.id}/line-items`, {
        method: "POST",
        headers,
        body: JSON.stringify({ variant_id: variant.id, quantity: 1 }),
      })

      // 3) addresses
      await fetchJson(`${BASE}/store/carts/${cart.id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: orderInfo.email,
          shipping_address: addr,
          billing_address: addr,
        }),
      })

      // 4) shipping
      const shipOptions = await fetchJson(
        `${BASE}/store/shipping-options?cart_id=${cart.id}`,
        { headers }
      )
      const ship = shipOptions.shipping_options?.[0]

      // Some digital products (or local test products) might not have shipping options.
      // In that case, we can still proceed to compute cart total and checkout.
      if (ship?.id) {
        await fetchJson(`${BASE}/store/carts/${cart.id}/shipping-methods`, {
          method: "POST",
          headers,
          body: JSON.stringify({ option_id: ship.id }),
        })
      } else {
        console.log("[e2e-linepay] shipping_options empty, skip shipping-methods")
      }

      // 5) cart ready
      const cartReady = (await fetchJson(`${BASE}/store/carts/${cart.id}`, { headers })).cart
      const total = Number(cartReady.total ?? 0)
      console.log(`[e2e-linepay] cart total=${total}`)

      if (Math.round(total) === TARGET_TOTAL) {
        picked = variant
        pickedCart = cartReady
        break
      }
    }

    if (!pickedCart) {
      throw new Error(
        `Cannot find a variant that makes cart total == ${TARGET_TOTAL}. Checked ${variants.length} variants.`
      )
    }

    console.log("[e2e-linepay] Picked cart", pickedCart.id, "total", pickedCart.total)

    // LINE Pay checkout (backend creates medusa order + calls /v4/payments/request mock)
    const checkoutRes = await fetch(`${BASE}/store/linepay-checkout`, {
      method: "POST",
      headers,
      body: JSON.stringify({ cart_id: pickedCart.id, orderInfo }),
    })

    const checkoutData = await checkoutRes.json().catch(() => ({}))
    if (!checkoutRes.ok || !checkoutData?.success) {
      throw new Error(
        `linepay-checkout failed: HTTP ${checkoutRes.status} ${JSON.stringify(checkoutData).slice(0, 500)}`
      )
    }

    const { transactionId, orderNo, orderId, paymentUrl } = checkoutData
    console.log("[e2e-linepay] checkout OK", { transactionId, orderNo, orderId, paymentUrl })

    // confirm (calls /v4/payments/{transactionId}/confirm mock + triggers fulfill/invoice)
    const confirmRes = await fetch(`${BASE}/linepay/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-e2e-debug": "1",
      },
      body: JSON.stringify({ transactionId, orderNo }),
    })
    const confirmData = await confirmRes.json().catch(() => ({}))
    console.log("[e2e-linepay] confirm HTTP", confirmRes.status, confirmData)
    if (!confirmRes.ok || !confirmData?.success) {
      throw new Error("linepay-confirm failed (see logs above)")
    }

    // Admin login
    const loginRes = await fetch(`${BASE}/auth/user/emailpass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: MEDUSA_ADMIN_EMAIL, password: MEDUSA_ADMIN_PASSWORD }),
    })
    const loginData = await loginRes.json()
    const token = loginData?.token
    if (!token) throw new Error(`Medusa admin login failed: ${JSON.stringify(loginData).slice(0, 300)}`)

    const adminH = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }

    // Poll until fulfill + invoice metadata appear
    const targetOrderId = orderId
    for (let i = 0; i < 12; i++) {
      await sleep(2000)
      const recent = await fetchJson(`${BASE}/admin/orders?limit=15&order=-created_at`, { headers: adminH })
      const order = (recent.orders || []).find((o) => o.id === targetOrderId) || null
      const meta = order?.metadata || {}

      const hasQr = !!meta.esim_qrcodes
      const invOk = !!(meta.ezpay_invoice_number || meta.ezpay_invoice_at || meta.ezpay_invoice_error)
      const payOk = !!meta.linepay_pay_time

      console.log(
        `[e2e-linepay] wait ${i + 1}/12 payment=${payOk} qr=${hasQr} invoice=${invOk}`,
      )

      if (order && hasQr && invOk && payOk) {
        console.log("[e2e-linepay] --- FINAL ---")
        console.log(
          JSON.stringify(
            {
              order_id: order.id,
              payment_status: order.payment_status,
              total: order.total,
              linepay_pay_time: meta.linepay_pay_time,
              esim_qrcodes_present: hasQr,
              ezpay_invoice_number: meta.ezpay_invoice_number || null,
              ezpay_invoice_error: meta.ezpay_invoice_error || null,
            },
            null,
            2
          )
        )
        return
      }
    }

    throw new Error("Timed out waiting for QR code + invoice metadata in order metadata.")
  } finally {
    // Best-effort stop stub server
    try {
      await new Promise((r) => stubServer.close(() => r()))
    } catch {
      // noop
    }
  }
}

run().catch((e) => {
  console.error("[e2e-linepay] ERROR:", e?.message || e)
  process.exit(1)
})

