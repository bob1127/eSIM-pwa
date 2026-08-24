/**
 * POST /api/subscribe
 *
 * 接收前端傳來的 Web Push 訂閱憑證，存入 Supabase push_subscriptions 表，
 * 並發送一則「訂閱成功」測試推播。
 *
 * Supabase 建表 SQL（只需執行一次）：
 * ─────────────────────────────────────────────────────────
 * create table if not exists push_subscriptions (
 *   id          uuid primary key default gen_random_uuid(),
 *   user_id     uuid references auth.users(id) on delete cascade,
 *   endpoint    text unique not null,
 *   p256dh      text not null,
 *   auth        text not null,
 *   created_at  timestamptz default now()
 * );
 * alter table push_subscriptions enable row level security;
 * create policy "Users manage own subscriptions"
 *   on push_subscriptions for all
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 * ─────────────────────────────────────────────────────────
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:bob112722761236tom@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Server-side Supabase admin client（可繞過 RLS）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const debug = { steps: [] };
  const step = (name, detail) => {
    debug.steps.push({ name, ...detail });
    console.log(`[Push Debug] subscribe | ${name}`, detail ?? "");
  };

  // 0. 環境檢查
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    step("env_check", { ok: false, error: "VAPID 金鑰未設定" });
    return res.status(500).json({
      error: "VAPID 金鑰未設定",
      hint: "Vercel 需設定 NEXT_PUBLIC_VAPID_PUBLIC_KEY 與 VAPID_PRIVATE_KEY",
      debug,
    });
  }

  // 1. 從 Authorization header 取得 user_id
  let userId = null;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (token) {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    userId = user?.id ?? null;
    step("auth", { ok: !!userId, userId: userId?.slice(0, 8), authError: authErr?.message });
  } else {
    step("auth", { ok: false, warning: "無 Bearer token，仍會存訂閱但 user_id 為 null" });
  }

  // 2. 解析訂閱憑證
  const { endpoint, keys } = req.body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    step("parse_body", { ok: false, hasEndpoint: !!endpoint, hasKeys: !!keys });
    return res.status(400).json({ error: "訂閱憑證格式不完整", debug });
  }
  step("parse_body", { ok: true, endpointPrefix: endpoint.slice(0, 40) });

  // 3. 存入 Supabase（upsert 避免重複）
  const { error: dbError } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        general_push_enabled: true,
      },
      { onConflict: "endpoint" }
    );

  if (dbError) {
    step("db_upsert", { ok: false, error: dbError.message, code: dbError.code });
    console.error("[Push Debug] subscribe Supabase 寫入失敗:", dbError.message);
    const hint =
      dbError.message?.includes("does not exist") || dbError.code === "42P01"
        ? "請到 Supabase SQL Editor 建立 push_subscriptions 表"
        : "檢查 SUPABASE_SERVICE_ROLE_KEY 與資料表權限";
    return res.status(500).json({ error: "儲存訂閱憑證失敗", detail: dbError.message, hint, debug });
  }
  step("db_upsert", { ok: true });

  // 4. 發送「訂閱成功」測試推播（會員不要求手動 ICCID）
  const isMember = !!userId;
  const proto = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000";
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${proto}://${host}`;
  const logoUrl = `${origin.replace(/\/$/, "")}/images/Logo/icon-192.png`;

  const payload = JSON.stringify({
    title: "✈️ Jeko eSIM 已就緒",
    body: isMember
      ? "流量通知已開啟！系統會自動對應您的 eSIM，流量偏低時提醒您。"
      : "推播已開啟！請綁定您的 eSIM，流量偏低時我們會提醒您。",
    icon: logoUrl,
    badge: logoUrl,
    url: isMember ? "/account" : "/data-query/?setup=traffic#push-notification-section",
  });

  let testPushOk = false;
  let testPushError = null;
  try {
    await webpush.sendNotification({ endpoint, keys }, payload);
    testPushOk = true;
    step("test_push", { ok: true, isMember });
  } catch (pushErr) {
    testPushOk = false;
    testPushError = pushErr.message;
    step("test_push", { ok: false, error: pushErr.message, statusCode: pushErr.statusCode });
    console.warn("[Push Debug] subscribe 測試推播失敗:", pushErr.message);
  }

  return res.status(201).json({
    success: true,
    message: isMember
      ? "訂閱成功！將自動對應本站 eSIM 訂單"
      : "訂閱成功！請綁定 eSIM 以啟用流量提醒",
    needsIccidBind: !isMember,
    isMember,
    testPushOk,
    testPushError,
    userId: userId?.slice(0, 8) || null,
    debug,
  });
}
