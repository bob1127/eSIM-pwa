#!/usr/bin/env node
/**
 * 在 Medusa 建立歡迎禮／抽獎對應折扣碼
 *
 * 用法：
 *   node scripts/seed-welcome-promotions.mjs
 *   node scripts/seed-welcome-promotions.mjs --backend https://esim-backend-eight.vercel.app
 *
 * 預設碼：NEW50、LOT50（固定折抵 TWD 50）
 * 環境變數：MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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
}

loadEnvFile(resolve(__dirname, "../.env.local"));

const args = process.argv.slice(2);
const backendIdx = args.indexOf("--backend");
const MEDUSA_URL = (
  (backendIdx >= 0 ? args[backendIdx + 1] : null) ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:9000"
).replace(/\/$/, "");

const EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "script@esim.local";
const PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD || "ScriptImport2026!";

/** TWD 通常無小數；固定折抵 50 元 */
const CODES = [
  { code: "NEW50", amount: 50, label: "新會員歡迎禮 50" },
  { code: "LOT50", amount: 50, label: "抽獎／歡迎禮對應 50" },
  { code: "FIRST50", amount: 50, label: "新會員 FIRST50" },
  { code: "LOT30", amount: 30, label: "抽獎 30" },
  { code: "LOT100", amount: 100, label: "抽獎 100" },
  { code: "LOT200", amount: 200, label: "抽獎 200" },
  { code: "LOT300", amount: 300, label: "抽獎 300" },
];

async function login() {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
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
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`[${path}] 非 JSON: ${text.slice(0, 200)}`);
  }
  return { ok: res.ok, status: res.status, data };
}

async function findPromotionByCode(token, code) {
  const q = new URLSearchParams({ q: code, limit: "20" });
  const { ok, data } = await admin(token, `/admin/promotions?${q}`);
  if (!ok) return null;
  const list = data.promotions || [];
  return (
    list.find((p) => String(p.code || "").toUpperCase() === code.toUpperCase()) ||
    null
  );
}

function promotionPayload(code, amount) {
  return {
    code,
    type: "standard",
    status: "active",
    is_automatic: false,
    application_method: {
      type: "fixed",
      target_type: "order",
      allocation: "across",
      value: amount,
      currency_code: "twd",
    },
  };
}

async function ensurePromotion(token, { code, amount, label }) {
  const existing = await findPromotionByCode(token, code);
  if (existing) {
    // 若為 draft/inactive，嘗試啟用
    if (existing.status && existing.status !== "active") {
      const upd = await admin(token, `/admin/promotions/${existing.id}`, {
        method: "POST",
        body: JSON.stringify({ status: "active" }),
      });
      return {
        code,
        action: upd.ok ? "reactivated" : "exists_inactive",
        id: existing.id,
        error: upd.ok ? null : upd.data?.message,
      };
    }
    return { code, action: "exists", id: existing.id };
  }

  let created = await admin(token, "/admin/promotions", {
    method: "POST",
    body: JSON.stringify(promotionPayload(code, amount)),
  });

  // 部分 Medusa 版本 target_type 用 items
  if (!created.ok) {
    const alt = promotionPayload(code, amount);
    alt.application_method.target_type = "items";
    created = await admin(token, "/admin/promotions", {
      method: "POST",
      body: JSON.stringify(alt),
    });
  }

  if (!created.ok) {
    return {
      code,
      action: "failed",
      error: created.data?.message || JSON.stringify(created.data).slice(0, 300),
      status: created.status,
    };
  }

  return {
    code,
    action: "created",
    id: created.data?.promotion?.id,
    label,
  };
}

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(`Admin: ${EMAIL}`);
  const token = await login();
  console.log("登入成功，開始建立折扣碼…\n");

  const results = [];
  for (const item of CODES) {
    const r = await ensurePromotion(token, item);
    results.push(r);
    const mark =
      r.action === "created" || r.action === "reactivated"
        ? "✓"
        : r.action === "exists"
          ? "·"
          : "✗";
    console.log(
      `${mark} ${r.code.padEnd(10)} ${r.action}${r.error ? ` — ${r.error}` : ""}${r.id ? ` (${r.id})` : ""}`,
    );
  }

  const failed = results.filter((r) => r.action === "failed");
  if (failed.length) {
    console.error("\n部分失敗，請檢查 Medusa Admin → Promotions");
    process.exit(1);
  }
  console.log("\n完成。結帳個人碼 JEKO-WELCOME-50-* 會對應 NEW50（或 LOT50）。");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
