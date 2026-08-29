/**
 * 推播帳號／裝置狀態防呆：
 * - 同一使用者關閉再開 PWA／網頁：靠 SW endpoint + DB 列還原
 * - 切換會員：不可把 A 的 eSIM 綁定顯示／監控成 B 的
 */

import { createClient } from "@supabase/supabase-js";
import {
  resolveMemberEmail,
  expandMemberLookupEmails,
} from "../pages/api/push/_memberAuth";
import { fetchMemberEsimsForIdentity } from "./memberEsims";
import { findOwnedEsim } from "./esimOrderExtract";

export const CLEAR_BIND_FIELDS = {
  monitor_enabled: false,
  topup_id: null,
  product_label: null,
  iccid: null,
  order_id: null,
  bind_method: null,
  iccid_bound_at: null,
  guest_email: null,
};

export function getSupabasePushAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export function isBindActive(row) {
  return Boolean(row?.monitor_enabled && (row?.iccid || row?.topup_id));
}

/**
 * 目前登入者是否擁有這筆綁定（topup／iccid）
 */
export async function memberOwnsBind(member, row) {
  if (!member?.email || !row) return false;
  if (!isBindActive(row)) return true;

  // 同一 Supabase user_id
  if (
    member.userId &&
    row.user_id &&
    String(member.userId) === String(row.user_id)
  ) {
    return true;
  }

  const emails = await expandMemberLookupEmails(member);
  const guest = String(row.guest_email || "").toLowerCase();
  if (guest && emails.includes(guest)) return true;

  try {
    const esims = await fetchMemberEsimsForIdentity({
      emails,
      lineUserId: member.lineUserId || null,
      supabaseUserId: member.userId || null,
    });
    if (row.topup_id && findOwnedEsim(esims, row.topup_id)) return true;
    if (row.iccid) {
      const iccid = String(row.iccid).replace(/\s+/g, "");
      if (
        esims.some(
          (e) => String(e.iccid || "").replace(/\s+/g, "") === iccid,
        )
      ) {
        return true;
      }
    }
  } catch (err) {
    console.warn("[pushAccountSync] owns check:", err?.message);
  }
  return false;
}

export async function loadSubscriptionByEndpoint(admin, endpoint) {
  const { data, error } = await admin
    .from("push_subscriptions")
    .select(
      "id, user_id, endpoint, iccid, guest_email, topup_id, monitor_enabled, general_push_enabled, iccid_bound_at, product_label, bind_method, order_id",
    )
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (error?.message?.includes("general_push_enabled")) {
    const legacy = await admin
      .from("push_subscriptions")
      .select(
        "id, user_id, endpoint, iccid, guest_email, topup_id, monitor_enabled, iccid_bound_at, product_label, bind_method, order_id",
      )
      .eq("endpoint", endpoint)
      .maybeSingle();
    if (legacy.error) return { data: null, error: legacy.error };
    return {
      data: legacy.data
        ? { ...legacy.data, general_push_enabled: true }
        : null,
      error: null,
    };
  }
  return { data, error };
}

/**
 * 登入後認領本機 endpoint：
 * - 綁定屬於本人 → 保留 monitor／eSIM，寫入 user_id
 * - 綁定屬於他人或不符 → 清綁定，保留訂閱與 general_push
 */
export async function claimEndpointForMember(admin, endpoint, member) {
  if (!endpoint || !member) {
    return { ok: false, error: "missing" };
  }

  const { data: row, error } = await loadSubscriptionByEndpoint(
    admin,
    endpoint,
  );
  if (error) return { ok: false, error: error.message };
  if (!row) return { ok: true, claimed: false, subscribed: false };

  const owns = await memberOwnsBind(member, row);
  const patch = {};

  if (member.userId && member.source === "supabase") {
    if (String(row.user_id || "") !== String(member.userId)) {
      patch.user_id = member.userId;
    }
  }

  let clearedBind = false;
  if (isBindActive(row) && !owns) {
    Object.assign(patch, CLEAR_BIND_FIELDS);
    clearedBind = true;
  }

  if (Object.keys(patch).length) {
    const { error: upErr } = await admin
      .from("push_subscriptions")
      .update(patch)
      .eq("endpoint", endpoint);
    if (upErr) return { ok: false, error: upErr.message };
  }

  return {
    ok: true,
    claimed: true,
    subscribed: true,
    clearedBind,
    bound: isBindActive(row) && owns && !clearedBind,
  };
}

export { resolveMemberEmail };
