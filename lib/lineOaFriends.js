/**
 * 官方 LINE 好友狀態
 *
 * 優先順序：
 * 1) LINE Login friendship API（正確：對「連結到 Login 頻道的官方帳號」）
 * 2) webhook 寫入的 line_oa_friends
 * 3) Messaging API profile（僅當 Login 與 Messaging 同一 Provider／同一 userId 時才準）
 */
export const LINE_OA_URL =
  process.env.NEXT_PUBLIC_LINE_OA_URL || "https://line.me/R/ti/p/@391huuts";

function getMessagingAccessToken() {
  return (
    process.env.LINE_MESSAGE_CHANNEL_ACCESS_TOKEN ||
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ||
    ""
  ).trim();
}

/**
 * 用 LINE Login access token 查是否已加「連結到 Login 頻道」的官方帳號
 * GET https://api.line.me/friendship/v1/status → { friendFlag }
 */
export async function checkLineFriendshipViaLoginToken(accessToken) {
  if (!accessToken) {
    return { ok: false, isFriend: false, reason: "no_login_token" };
  }

  try {
    const res = await fetch("https://api.line.me/friendship/v1/status", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 200) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        isFriend: Boolean(data.friendFlag),
        reason: data.friendFlag ? "friend" : "not_friend",
      };
    }
    const text = await res.text().catch(() => "");
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      /* ignore */
    }
    console.warn(
      "[lineOaFriends] friendship API:",
      res.status,
      text.slice(0, 200),
    );
    // 40007：Login 頻道尚未連結官方帳號（LINE Developers 設定問題）
    if (parsed?.code === 40007 || /no login bot linked/i.test(text)) {
      return {
        ok: false,
        isFriend: false,
        reason: "no_login_bot_linked",
      };
    }
    return {
      ok: false,
      isFriend: false,
      reason: res.status === 401 ? "login_token_expired" : `http_${res.status}`,
    };
  } catch (e) {
    console.error("[lineOaFriends] friendship API 失敗:", e.message);
    return { ok: false, isFriend: false, reason: e.message };
  }
}

/** Messaging Bot：用 userId 查 profile（Login≠Messaging 時會永遠 404） */
export async function checkLineFriendshipViaApi(lineUserId) {
  const token = getMessagingAccessToken();
  if (!token || !lineUserId) {
    return { ok: false, isFriend: false, reason: "missing_token_or_user" };
  }

  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (res.status === 200) {
      const profile = await res.json().catch(() => ({}));
      return {
        ok: true,
        isFriend: true,
        displayName: profile.displayName || null,
      };
    }

    if (res.status === 404) {
      return { ok: true, isFriend: false, reason: "not_friend_or_blocked" };
    }

    const text = await res.text().catch(() => "");
    console.warn(
      "[lineOaFriends] profile API 非預期狀態:",
      res.status,
      text.slice(0, 200),
    );
    return { ok: false, isFriend: false, reason: `http_${res.status}` };
  } catch (e) {
    console.error("[lineOaFriends] profile API 失敗:", e.message);
    return { ok: false, isFriend: false, reason: e.message };
  }
}

async function upsertLineFriend(supabaseAdmin, lineUserId, displayName) {
  if (!supabaseAdmin || !lineUserId) return;
  try {
    await supabaseAdmin.from("line_oa_friends").upsert(
      {
        line_user_id: String(lineUserId),
        display_name: displayName || null,
        followed_at: new Date().toISOString(),
        unfollowed_at: null,
      },
      { onConflict: "line_user_id" },
    );
  } catch (e) {
    console.warn("[lineOaFriends] upsert 失敗:", e.message);
  }
}

/**
 * DB → Messaging profile（不再因 404 寫 unfollow，避免 Login/Messaging 不同頻道誤判）
 */
export async function isLineOaFriend(supabaseAdmin, lineUserId) {
  if (!lineUserId) return false;

  let dbFriend = false;
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from("line_oa_friends")
      .select("line_user_id, unfollowed_at")
      .eq("line_user_id", String(lineUserId))
      .maybeSingle();

    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) {
        console.warn("[lineOaFriends] line_oa_friends 不存在，改走 API");
      } else {
        console.error("[lineOaFriends] 查詢失敗:", error.message);
      }
    } else {
      dbFriend = !!(data && !data.unfollowed_at);
    }
  }

  if (dbFriend) return true;

  const api = await checkLineFriendshipViaApi(lineUserId);
  if (api.ok && api.isFriend) {
    await upsertLineFriend(supabaseAdmin, lineUserId, api.displayName);
    return true;
  }

  return false;
}

/**
 * 盡量解析會員的 LINE user id（NextAuth / auth metadata / push 綁定）
 */
export async function resolveMemberLineUserId(supabaseAdmin, member) {
  if (member?.lineUserId) return String(member.lineUserId);

  const email = member?.email ? String(member.email).toLowerCase() : null;
  if (!email || !supabaseAdmin) return null;

  try {
    if (member?.userId) {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(
        member.userId,
      );
      const lineId =
        data?.user?.user_metadata?.line_id ||
        data?.user?.app_metadata?.line_id ||
        null;
      if (!error && lineId) return String(lineId);
    }
  } catch (e) {
    console.warn("[lineOaFriends] getUserById 失敗:", e.message);
  }

  try {
    const { data } = await supabaseAdmin
      .from("push_subscriptions")
      .select("line_user_id")
      .eq("guest_email", email)
      .not("line_user_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (data?.line_user_id) return String(data.line_user_id);
  } catch {
    // ignore
  }

  const m = email.match(/^([uU][a-z0-9]+)@line-login\.com$/i);
  if (m?.[1]) return m[1];

  return null;
}

/**
 * @returns {{ isFriend: boolean, lineUserId: string|null, lineOaUrl: string, checkedVia: string, reason?: string }}
 */
export async function getMemberLineFriendStatus(supabaseAdmin, member) {
  const lineUserId = await resolveMemberLineUserId(supabaseAdmin, member);
  let setupHint = null;

  // 1) LINE Login friendship（對「已連結 OA 的 Login 頻道」最準）
  if (member?.lineAccessToken) {
    const loginCheck = await checkLineFriendshipViaLoginToken(
      member.lineAccessToken,
    );
    if (loginCheck.ok) {
      if (loginCheck.isFriend && lineUserId) {
        await upsertLineFriend(supabaseAdmin, lineUserId, null);
      }
      return {
        isFriend: loginCheck.isFriend,
        lineUserId,
        lineOaUrl: LINE_OA_URL,
        checkedVia: "login_friendship",
        reason: loginCheck.reason,
      };
    }
    if (loginCheck.reason === "no_login_bot_linked") {
      setupHint = "no_login_bot_linked";
      console.warn(
        "[lineOaFriends] LINE Login 頻道尚未連結官方帳號（40007）。請到 LINE Developers → LINE Login → Linked LINE Official Account 設定。改以 Messaging / DB 備援。",
      );
    } else if (loginCheck.reason === "login_token_expired") {
      console.warn(
        "[lineOaFriends] LINE Login token 已過期，請重新用 LINE 登入後再套用折扣",
      );
    }
  }

  if (!lineUserId) {
    return {
      isFriend: false,
      lineUserId: null,
      lineOaUrl: LINE_OA_URL,
      checkedVia: "no_line_id",
      reason: setupHint || "no_line_id",
    };
  }

  // 2) DB / Messaging profile
  const isFriend = await isLineOaFriend(supabaseAdmin, lineUserId);
  if (isFriend) {
    return {
      isFriend: true,
      lineUserId,
      lineOaUrl: LINE_OA_URL,
      checkedVia: member?.lineAccessToken
        ? "fallback_db_or_messaging"
        : "db_or_api",
      reason: "friend",
    };
  }

  // 3) Login 頻道尚未連結 OA（40007）時：無法打 friendship API。
  // 若開啟備援，只要已用 LINE 登入（有 lineUserId）即視為通過（仍靠 redemption 防一 LINE 多領）。
  const allowLoginWithoutOaLink =
    process.env.WELCOME_ALLOW_LINE_LOGIN_WITHOUT_OA_LINK === "1" ||
    process.env.WELCOME_ALLOW_LINE_LOGIN_WITHOUT_OA_LINK === "true";
  if (
    allowLoginWithoutOaLink &&
    setupHint === "no_login_bot_linked" &&
    lineUserId &&
    member?.source === "line"
  ) {
    console.warn(
      "[lineOaFriends] 備援：Login 未連結 OA，改以 LINE 登入身分通過好友檢查（請盡快在 Developers Basic settings 連結官方帳號）",
    );
    return {
      isFriend: true,
      lineUserId,
      lineOaUrl: LINE_OA_URL,
      checkedVia: "line_login_bypass_no_bot",
      reason: "line_login_bypass_no_bot",
    };
  }

  return {
    isFriend: false,
    lineUserId,
    lineOaUrl: LINE_OA_URL,
    checkedVia: member?.lineAccessToken
      ? "fallback_db_or_messaging"
      : "db_or_api",
    reason: setupHint || "not_friend_or_channel_mismatch",
  };
}
