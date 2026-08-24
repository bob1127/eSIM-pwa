/**
 * POST /api/send-push
 *
 * 從 Supabase push_subscriptions 撈出所有訂閱，批次發送推播。
 * 用於管理員廣播，或未來自動化流量提醒 Cron Job。
 *
 * Request body:
 *   { secret, title, body, url, userId? }
 *   userId: 若指定則只發給該會員，不指定則廣播給所有人
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  "mailto:bob112722761236tom@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const INTERNAL_SECRET = process.env.PUSH_INTERNAL_SECRET || "";

if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 24) {
  console.warn(
    "[send-push] PUSH_INTERNAL_SECRET 未設定或過短，內部推播 API 將拒絕請求",
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end("Method Not Allowed");
  }

  const { secret, title, body, url, userId } = req.body ?? {};

  if (!INTERNAL_SECRET || INTERNAL_SECRET.length < 24) {
    return res.status(500).json({ error: "PUSH_INTERNAL_SECRET 未正確設定" });
  }

  if (!secret || secret !== INTERNAL_SECRET) {
    return res.status(401).json({ error: "通關密語錯誤" });
  }

  if (!title || !body) {
    return res.status(400).json({ error: "缺少 title 或 body" });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Supabase 環境變數未設定",
      detail: "請在 Vercel 設定 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 後 Redeploy",
    });
  }

  // 1. 日常推播：僅 general_push_enabled = true（與流量 Cron 分開）
  let query = supabaseAdmin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("general_push_enabled", true);
  if (userId) query = query.eq("user_id", userId);

  let { data: subscriptions, error: fetchError } = await query;

  if (fetchError?.message?.includes("general_push_enabled")) {
    let legacyQuery = supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");
    if (userId) legacyQuery = legacyQuery.eq("user_id", userId);
    const legacy = await legacyQuery;
    subscriptions = legacy.data;
    fetchError = legacy.error;
  }

  if (fetchError) {
    console.error("[send-push] 撈訂閱失敗:", fetchError.message);
    return res.status(500).json({
      error: "撈取訂閱失敗",
      detail: fetchError.message,
      hint:
        fetchError.message?.includes("does not exist") || fetchError.code === "42P01"
          ? "請到 Supabase SQL Editor 建立 push_subscriptions 資料表"
          : "請確認 Vercel 的 SUPABASE_SERVICE_ROLE_KEY 是否正確",
    });
  }

  if (!subscriptions?.length) {
    return res.status(200).json({ success: true, sent: 0, message: "無訂閱用戶" });
  }

  // 2. 批次推播（失效憑證自動從 DB 刪除）
  const payload = JSON.stringify({ title, body, url: url || "/" });
  const invalidEndpoints = [];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        // 410 Gone = 用戶已撤銷訂閱，清掉
        if (err.statusCode === 410 || err.statusCode === 404) {
          invalidEndpoints.push(sub.endpoint);
        } else {
          console.warn("[send-push] 推播失敗:", sub.endpoint, err.message);
        }
      }
    })
  );

  // 3. 清除已失效訂閱
  if (invalidEndpoints.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("endpoint", invalidEndpoints);
    console.log(`[send-push] 清除 ${invalidEndpoints.length} 筆失效訂閱`);
  }

  return res.status(200).json({
    success: true,
    total: subscriptions.length,
    sent,
    removed: invalidEndpoints.length,
  });
}
