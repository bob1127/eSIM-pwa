#!/usr/bin/env node
/**
 * 資安修補：停用舊版共用、規律可猜的 JEKO_PREF_{n} 折扣碼。
 *
 * 背景：這些碼是共用（不分夥伴）、命名規律（JEKO_PREF_5/10/15/20），
 * 任何人只要在結帳頁直接輸入猜測字串，就能不經過任何夥伴驗證直接折抵。
 * 已改為每位夥伴獨立的高熵亂數碼（見 lib/medusaPartnerPromotions.js），
 * 此腳本用來清掉舊碼，讓它們在 Medusa 端立即失效（停用，不刪除歷史）。
 *
 * 用法：
 *   node scripts/deactivate-legacy-partner-pref-codes.mjs
 *   node scripts/deactivate-legacy-partner-pref-codes.mjs --backend https://esim-backend-eight.vercel.app
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

const LEGACY_PATTERN = /^JEKO_PREF_\d+$/i;

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

async function main() {
  console.log(`Medusa: ${MEDUSA_URL}`);
  console.log(`Admin: ${EMAIL}`);
  const token = await login();

  const { ok, data } = await admin(token, "/admin/promotions?q=JEKO_PREF&limit=100");
  if (!ok) {
    throw new Error("查詢折扣碼失敗: " + JSON.stringify(data).slice(0, 300));
  }

  const targets = (data.promotions || []).filter((p) =>
    LEGACY_PATTERN.test(String(p.code || "")),
  );

  if (!targets.length) {
    console.log("沒有找到舊版 JEKO_PREF_* 折扣碼，無需處理。");
    return;
  }

  console.log(`找到 ${targets.length} 組舊版折扣碼，開始停用…\n`);
  for (const promo of targets) {
    if (promo.status === "inactive") {
      console.log(`· ${promo.code.padEnd(16)} 已是 inactive，略過`);
      continue;
    }
    const upd = await admin(token, `/admin/promotions/${promo.id}`, {
      method: "POST",
      body: JSON.stringify({ status: "inactive" }),
    });
    console.log(
      `${upd.ok ? "✓" : "✗"} ${promo.code.padEnd(16)} ${upd.ok ? "已停用" : `失敗：${upd.data?.message}`}`,
    );
  }
  console.log("\n完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
