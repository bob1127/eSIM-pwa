/**
 * 本機補發（略過 Next 模組解析）：用訂單 planId 向 MicroeSIM 開卡 → 寄信 → 寫回 Medusa
 *
 *   MEDUSA_SYNC_BACKEND_URL=https://esim-backend-eight.vercel.app \
 *     node scripts/recover-fulfill-orders.mjs 01xxx 01yyy
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import axios from "axios";
import FormData from "form-data";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvLocal() {
  try {
    const env = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
    for (const line of env.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      let k = t.slice(0, i);
      let v = t.slice(i + 1);
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

const MEDUSA = (
  process.env.MEDUSA_SYNC_BACKEND_URL ||
  "https://esim-backend-eight.vercel.app"
).replace(/\/$/, "");
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "";
const ADMIN_PASS = process.env.MEDUSA_ADMIN_PASSWORD || "";

const ACCOUNT = (process.env.ESIM_ACCOUNT || "").trim();
const SECRET = (process.env.ESIM_SECRET || "").trim();
const SALT = (process.env.ESIM_SALT || "").trim();
const BASE_URL = (process.env.ESIM_BASE_URL || "https://microesim.top")
  .trim()
  .replace(/\/$/, "");

const SUBSCRIBE_TIMEOUT_MS = 60_000;
const DETAIL_TIMEOUT_MS = 45_000;
const DETAIL_POLL_INTERVAL_MS = 2_500;
const DETAIL_POLL_MAX_MS = 90_000;
const SUBSCRIBE_MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resolveOrderId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  return s.startsWith("order_") ? s : `order_${s}`;
}

function signHeaders() {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(6).toString("hex");
  const hexKey = crypto
    .pbkdf2Sync(SECRET, Buffer.from(SALT, "hex"), 1024, 32, "sha256")
    .toString("hex");
  const signature = crypto
    .createHmac("sha256", Buffer.from(hexKey, "utf8"))
    .update(ACCOUNT + nonce + timestamp)
    .digest("hex");
  return { timestamp, nonce, signature };
}

function profileFieldNonEmpty(val) {
  if (val == null || val === "") return false;
  if (Array.isArray(val)) return val.some((x) => String(x || "").trim());
  return Boolean(String(val).trim());
}

function detailHasUsableActivation(detailResult) {
  if (!detailResult || typeof detailResult !== "object") return false;
  const rows = Array.isArray(detailResult)
    ? detailResult
    : Array.isArray(detailResult.list)
      ? detailResult.list
      : [detailResult];
  return rows.some(
    (row) =>
      row &&
      (profileFieldNonEmpty(row.qrcode) ||
        profileFieldNonEmpty(row.qr_code) ||
        profileFieldNonEmpty(row.lpa) ||
        profileFieldNonEmpty(row.lpa_str) ||
        profileFieldNonEmpty(row.LPA) ||
        profileFieldNonEmpty(row.smdp_address) ||
        profileFieldNonEmpty(row.smdp)),
  );
}

function isDetailStillProcessing(detail) {
  const msg = String(detail?.msg || "").toLowerCase();
  const status = String(detail?.result?.status || "").toLowerCase();
  if (msg.includes("processing") || status.includes("process")) return true;
  if (detail?.code === 1 && detail?.result && !detailHasUsableActivation(detail.result)) {
    return true;
  }
  return false;
}

function isRetryableError(err) {
  const code = err?.code || err?.cause?.code;
  const msg = String(err?.message || "");
  if (
    ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "EAI_AGAIN"].includes(
      code,
    )
  ) {
    return true;
  }
  if (/timeout|network|socket hang up/i.test(msg)) return true;
  const status = err?.response?.status;
  return status === 408 || status === 429 || (typeof status === "number" && status >= 500);
}

function normalizeQrSrc(raw) {
  const str = String(raw || "");
  if (!str) return "";
  return str.startsWith("http") || str.startsWith("data:image/")
    ? str
    : `data:image/png;base64,${str}`;
}

const LPA_RE = /LPA:1\$([^$\s]+)\$([^$\s]+)/i;

function parseLpaString(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(LPA_RE);
  if (!m) return null;
  return {
    lpa: `LPA:1$${m[1]}$${m[2]}`,
    smdp: m[1],
    activationCode: m[2],
  };
}

function buildProfile({ productName, detailResult, topupId }) {
  const row = Array.isArray(detailResult)
    ? detailResult[0]
    : Array.isArray(detailResult?.list)
      ? detailResult.list[0]
      : detailResult;
  const rawLpaCandidate =
    row?.lpa ||
    row?.lpa_str ||
    row?.LPA ||
    row?.android_activation_code ||
    row?.android_code ||
    row?.activation_code ||
    row?.smdp_address ||
    "";
  const parsed = parseLpaString(rawLpaCandidate);
  const smdp = String(
    parsed?.smdp || row?.smdp || row?.smdp_address || "",
  ).trim();
  const activationCode = String(
    parsed?.activationCode ||
      row?.matching_id ||
      row?.activation_code ||
      "",
  ).trim();
  const lpa =
    parsed?.lpa ||
    (smdp && activationCode ? `LPA:1$${smdp}$${activationCode}` : "") ||
    String(rawLpaCandidate || "").trim();
  const src = normalizeQrSrc(row?.qrcode || row?.qr_code || "");
  const card = lpa ? encodeURIComponent(lpa) : "";
  return {
    name: productName || "eSIM",
    src,
    lpa,
    smdp,
    activationCode,
    androidCode: String(
      row?.android_activation_code || row?.android_code || lpa || "",
    ).trim(),
    topupId,
    iccid: String(row?.iccid || row?.ICCID || "").trim(),
    iosInstallUrl: card
      ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${card}`
      : "",
    androidInstallUrl: card
      ? `https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${card}`
      : "",
  };
}

async function subscribeWithRetry({ finalPlanId, quantity, orderId }) {
  let lastErr;
  for (let attempt = 1; attempt <= SUBSCRIBE_MAX_ATTEMPTS; attempt++) {
    const { timestamp, nonce, signature } = signHeaders();
    const form = new FormData();
    form.append("number", String(quantity));
    form.append("channel_dataplan_id", finalPlanId);
    try {
      const subscribeRes = await axios.post(
        `${BASE_URL}/allesim/v1/esimSubscribe`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            "MICROESIM-ACCOUNT": ACCOUNT,
            "MICROESIM-NONCE": nonce,
            "MICROESIM-TIMESTAMP": timestamp,
            "MICROESIM-SIGN": signature,
          },
          timeout: SUBSCRIBE_TIMEOUT_MS,
        },
      );
      return subscribeRes.data;
    } catch (err) {
      lastErr = err;
      const retryable = isRetryableError(err);
      console.warn(
        `  esimSubscribe ${attempt}/${SUBSCRIBE_MAX_ATTEMPTS} order=${orderId} retryable=${retryable}: ${err?.message || err}`,
      );
      if (!retryable || attempt >= SUBSCRIBE_MAX_ATTEMPTS) break;
      await sleep(1000 * attempt);
    }
  }
  throw lastErr;
}

async function fulfillItems(orderId, items) {
  const qrcodes = [];
  for (const item of items) {
    const finalPlanId = String(item.planId || "").trim();
    if (!finalPlanId) throw new Error(`缺少 planId: ${item.name || item.sku}`);
    console.log(`  subscribe ${item.sku || item.name} planId=${finalPlanId}`);
    const result = await subscribeWithRetry({
      finalPlanId,
      quantity: item.quantity || 1,
      orderId,
    });
    if (!(result.code === 1 && result.result?.topup_id)) {
      throw new Error(`供應商拒絕: ${result.msg || JSON.stringify(result)}`);
    }
    const topup_id = result.result.topup_id;
    const pollStarted = Date.now();
    let detail = null;
    while (Date.now() - pollStarted < DETAIL_POLL_MAX_MS) {
      const detailSig = signHeaders();
      const detailForm = new FormData();
      detailForm.append("topup_id", topup_id);
      const detailRes = await axios.post(
        `${BASE_URL}/allesim/v1/topupDetail`,
        detailForm,
        {
          headers: {
            ...detailForm.getHeaders(),
            "MICROESIM-ACCOUNT": ACCOUNT,
            "MICROESIM-NONCE": detailSig.nonce,
            "MICROESIM-TIMESTAMP": detailSig.timestamp,
            "MICROESIM-SIGN": detailSig.signature,
          },
          timeout: DETAIL_TIMEOUT_MS,
        },
      );
      detail = detailRes.data;
      if (detail?.code === 1 && detailHasUsableActivation(detail.result)) break;
      if (detail?.code === 1 && isDetailStillProcessing(detail)) {
        console.log(
          `  polling topup=${topup_id} elapsed=${Date.now() - pollStarted}ms`,
        );
        await sleep(DETAIL_POLL_INTERVAL_MS);
        continue;
      }
      throw new Error(`獲取 QR 失敗: ${JSON.stringify(detail)}`);
    }
    if (!detail || !detailHasUsableActivation(detail.result)) {
      throw new Error(`獲取 QR 逾時 topup=${topup_id}`);
    }
    const detailRows = Array.isArray(detail.result)
      ? detail.result
      : Array.isArray(detail.result?.list)
        ? detail.result.list
        : [detail.result];
    for (const row of detailRows) {
      if (
        !profileFieldNonEmpty(row?.qrcode) &&
        !profileFieldNonEmpty(row?.qr_code) &&
        !profileFieldNonEmpty(row?.lpa) &&
        !profileFieldNonEmpty(row?.lpa_str) &&
        !profileFieldNonEmpty(row?.iccid) &&
        !profileFieldNonEmpty(detail.result?.qrcode)
      ) {
        continue;
      }
      const rowWithQr =
        profileFieldNonEmpty(row.qrcode) ||
        profileFieldNonEmpty(row.qr_code) ||
        profileFieldNonEmpty(row.lpa) ||
        profileFieldNonEmpty(row.lpa_str) ||
        profileFieldNonEmpty(row.iccid)
          ? row
          : detail.result;
      const profile = buildProfile({
        productName: item.name || "eSIM",
        detailResult: rowWithQr,
        topupId: topup_id,
      });
      if (!profile.src && !profile.lpa) {
        throw new Error(`QR／LPA 空白 topup=${topup_id}`);
      }
      qrcodes.push(profile);
    }
  }
  if (!qrcodes.length) throw new Error("發貨失敗，無 QR");
  return qrcodes;
}

function createMailTransporter() {
  const SMTP_HOST = process.env.SMTP_HOST?.trim() || "";
  const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
  const SMTP_USER = process.env.SMTP_USER?.trim() || "";
  const SMTP_PASS = process.env.SMTP_PASS?.trim() || "";
  const GMAIL_USER = process.env.GMAIL_USER?.trim() || "";
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD?.trim() || "";
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return {
      transporter: nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        tls: { rejectUnauthorized: false },
      }),
      from: process.env.MAIL_FROM_EMAIL || SMTP_USER,
    };
  }
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      }),
      from: process.env.MAIL_FROM_EMAIL || GMAIL_USER,
    };
  }
  throw new Error("MAIL_NOT_CONFIGURED");
}

async function sendEsimEmail(to, orderNumber, profiles) {
  const { transporter, from } = createMailTransporter();
  const merchantNo = String(orderNumber || "").replace(/^order_/, "");
  const thankYou = `https://www.jeko-esim.com.tw/thank-you?status=success&orderNo=${encodeURIComponent(merchantNo)}`;
  const blocks = profiles
    .map((p, i) => {
      const img = p.src
        ? `<p><img src="cid:esimqr${i}" alt="eSIM QR" style="max-width:280px"/></p>`
        : "";
      const lpa = p.lpa
        ? `<p style="word-break:break-all;font-size:12px">LPA: ${p.lpa}</p>`
        : "";
      return `<h3>${p.name || `eSIM ${i + 1}`}</h3>${img}${lpa}`;
    })
    .join("<hr/>");
  const attachments = profiles
    .map((p, i) => {
      if (!p.src) return null;
      const b64 = String(p.src).replace(/^data:image\/\w+;base64,/, "");
      return {
        filename: `esim-qr-${i + 1}.png`,
        content: Buffer.from(b64, "base64"),
        cid: `esimqr${i}`,
      };
    })
    .filter(Boolean);

  await transporter.sendMail({
    from: `"Jeko eSIM" <${from}>`,
    to,
    subject: `🎉 您的 eSIM 已準備就緒！（訂單 ${merchantNo}）`,
    html: `<p>您好，您的 eSIM 已開通。</p>
<p>訂單編號：<b>${merchantNo}</b></p>
<p>也可至網頁查看：<a href="${thankYou}">${thankYou}</a></p>
${blocks}
<p>Jeko eSIM 客服</p>`,
    text: `您的 eSIM 已開通。訂單 ${merchantNo}\n${thankYou}\n${profiles
      .map((p) => `${p.name}\n${p.lpa || ""}`)
      .join("\n\n")}`,
    attachments,
  });
}

async function login() {
  const res = await fetch(`${MEDUSA}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error(`Medusa 登入失敗 ${res.status}`);
  return data.token;
}

async function getOrder(token, orderId) {
  const res = await fetch(`${MEDUSA}/admin/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.order) {
    throw new Error(
      `找不到訂單 ${orderId} (${res.status}): ${JSON.stringify(data).slice(0, 240)}`,
    );
  }
  return data.order;
}

async function patchMeta(token, order, extra) {
  const res = await fetch(`${MEDUSA}/admin/orders/${order.id}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metadata: { ...(order.metadata || {}), ...extra },
    }),
  });
  if (!res.ok) {
    throw new Error(`寫回失敗 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

async function main() {
  const ids = process.argv.slice(2).map(resolveOrderId).filter(Boolean);
  if (!ids.length) throw new Error("請傳訂單編號");
  if (!ACCOUNT || !SECRET || !SALT) throw new Error("缺少 ESIM_ACCOUNT/SECRET/SALT");

  console.log(`Medusa: ${MEDUSA}`);
  console.log(`MicroeSIM: ${BASE_URL} / ${ACCOUNT.slice(0, 6)}…`);

  const token = await login();

  for (const orderId of ids) {
    console.log(`\n======= ${orderId} =======`);
    try {
      const order = await getOrder(token, orderId);
      if (order.metadata?.esim_qrcodes) {
        console.log("已有 esim_qrcodes，略過");
        continue;
      }
      const items = (order.items || []).map((it) => {
        const md = it.metadata || {};
        const vmd = it.variant?.metadata || {};
        return {
          name: it.product_title || it.title || "eSIM",
          sku: it.variant?.sku || it.variant_sku || "",
          planId:
            md.esim_plan_id ||
            md.plan_id ||
            md.planId ||
            vmd.plan_id ||
            vmd.esim_plan_id ||
            "",
          quantity: Math.max(1, Math.round(Number(it.quantity) || 1)),
        };
      });
      if (items.some((it) => !it.planId)) {
        const detail = await fetch(
          `${MEDUSA}/admin/orders/${orderId}?fields=*items,*items.metadata,*items.variant,*items.variant.sku,*items.variant.metadata`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const dj = await detail.json().catch(() => ({}));
        if (dj.order?.items?.length) {
          for (let i = 0; i < items.length; i++) {
            const it = dj.order.items[i];
            if (!it) continue;
            const md = it.metadata || {};
            const vmd = it.variant?.metadata || {};
            items[i].planId =
              items[i].planId ||
              md.esim_plan_id ||
              md.plan_id ||
              md.planId ||
              vmd.plan_id ||
              vmd.esim_plan_id ||
              "";
            items[i].sku =
              items[i].sku || it.variant?.sku || it.variant_sku || "";
          }
        }
      }
      const PLAN_FALLBACK = {
        order_01M1BCSVFEDAAAW38DTY9PWJHA: {
          planId: "73fd062850f04ddd9afae8fe91671e03",
          sku: "China(T+C)-Daily1GB-8-D0",
          name: "中國大陸 eSIM 每日型",
        },
        order_01M1BETY5DDWWH2307T5JYJ5TQ: {
          planId: "394beb34-8735-4bb0-9707-22e0bb482052",
          sku: "China-unlimited-8-B0",
          name: "中國 吃到飽 不限流量eSIM",
        },
      };
      if (!items.length && PLAN_FALLBACK[orderId]) {
        items.push({ ...PLAN_FALLBACK[orderId], quantity: 1 });
      }
      for (const it of items) {
        const fb = PLAN_FALLBACK[orderId];
        if (fb && !it.planId) {
          it.planId = fb.planId;
          it.sku = it.sku || fb.sku;
          it.name = it.name || fb.name;
        }
      }
      console.log(`email=${order.email}`);
      console.log("items=", items);

      const qrcodes = await fulfillItems(orderId, items);
      console.log(`QR 數=${qrcodes.length}`);
      const esim_qrcodes = JSON.stringify(
        qrcodes.map((q) => ({
          name: q.name || "",
          src: normalizeQrSrc(q.src || ""),
          lpa: q.lpa || "",
          topupId: q.topupId || "",
          iccid: q.iccid || "",
        })),
      );
      await patchMeta(token, order, {
        esim_qrcodes,
        fulfillment_status: "fulfilled",
        fulfillment_error: "",
      });
      console.log("✓ 已寫回 Medusa");

      if (order.email) {
        try {
          await sendEsimEmail(order.email, order.id, qrcodes);
          console.log(`✓ 已寄信 ${order.email}`);
        } catch (mailErr) {
          console.error("⚠ 寄信失敗:", mailErr?.message || mailErr);
        }
      }
    } catch (e) {
      console.error("✗ 補發失敗:", e?.message || e);
    }
  }
  console.log("\n完成。請客戶重整 thank-you。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
