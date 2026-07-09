import { lineUserIdToEmail } from "./lineAuth";

/** 解析會員在系統中使用的 Email（Supabase 或 LINE 虛擬信箱） */
export function resolveMemberEmail({ supabaseUser, sessionUser } = {}) {
  if (supabaseUser?.email) {
    return supabaseUser.email.toLowerCase();
  }
  if (sessionUser?.email) {
    return sessionUser.email.toLowerCase();
  }
  if (sessionUser?.id) {
    return lineUserIdToEmail(sessionUser.id);
  }
  return null;
}

/** 訂單查詢用：主 Email + user_metadata 內可選的關聯信箱 */
export function collectOrderLookupEmails(primaryEmail, userMetadata = {}) {
  const emails = new Set();
  if (primaryEmail) emails.add(String(primaryEmail).toLowerCase());

  const linked = userMetadata?.linked_order_emails;
  if (Array.isArray(linked)) {
    for (const e of linked) {
      if (e) emails.add(String(e).toLowerCase());
    }
  }

  return [...emails];
}
