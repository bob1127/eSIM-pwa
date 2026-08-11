/**
 * LINE 帳號綁定核心邏輯（供 /api/line/bind 與本機 OAuth callback 共用）
 */
import { verifyLineIdToken } from "./lineIdToken";
import { getMemberLineFriendStatus, LINE_OA_URL } from "./lineOaFriends";

/**
 * @returns {Promise<{ ok: true, status: number, body: object } | { ok: false, status: number, body: object }>}
 */
export async function performLineAccountBind(
  supabaseAdmin,
  member,
  idToken,
  { logAttempt } = {},
) {
  const verified = await verifyLineIdToken(idToken);

  if (!verified.ok) {
    await logAttempt?.({ success: false });
    const hint =
      verified.error === "missing_channel_id"
        ? "LINE 綁定功能尚未設定，請聯絡客服"
        : "LINE 身分驗證失敗，請重新嘗試";
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        error: hint,
        code: "ID_TOKEN_INVALID",
      },
    };
  }

  const lineUserId = verified.lineUserId;

  if (member.source === "line") {
    if (member.lineUserId && String(member.lineUserId) !== lineUserId) {
      await logAttempt?.({ success: false });
      return {
        ok: false,
        status: 409,
        body: {
          success: false,
          error: "驗證到的 LINE 帳號與目前登入身分不一致，請重新登入後再試",
          code: "LINE_MISMATCH",
        },
      };
    }
    const lineStatus = await getMemberLineFriendStatus(supabaseAdmin, member);
    await logAttempt?.({ success: true });
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        already_linked: true,
        line_user_id: lineUserId,
        is_friend: lineStatus.isFriend,
        line_oa_url: lineStatus.lineOaUrl || LINE_OA_URL,
      },
    };
  }

  const { data: existingLink, error: linkErr } = await supabaseAdmin
    .from("line_account_links")
    .select("id, user_id, email")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (linkErr && !/does not exist|schema cache/i.test(linkErr.message || "")) {
    throw linkErr;
  }

  if (existingLink) {
    const sameUser = member.userId
      ? String(existingLink.user_id || "") === String(member.userId)
      : (existingLink.email || "").toLowerCase() === member.email;

    if (!sameUser) {
      await logAttempt?.({ success: false });
      return {
        ok: false,
        status: 409,
        body: {
          success: false,
          error:
            "此 LINE 帳號已綁定其他會員帳號，請改用該帳號登入，或聯絡客服協助",
          code: "LINE_ALREADY_LINKED_OTHER_ACCOUNT",
        },
      };
    }
  } else {
    const filterColumn = member.userId ? "user_id" : "email";
    const filterValue = member.userId || member.email;
    const { data: myLink, error: myLinkErr } = await supabaseAdmin
      .from("line_account_links")
      .select("id, line_user_id")
      .eq(filterColumn, filterValue)
      .maybeSingle();

    if (
      myLinkErr &&
      !/does not exist|schema cache/i.test(myLinkErr.message || "")
    ) {
      throw myLinkErr;
    }

    if (myLink && myLink.line_user_id !== lineUserId) {
      await logAttempt?.({ success: false });
      return {
        ok: false,
        status: 409,
        body: {
          success: false,
          error: "此帳號已綁定另一個 LINE，如需更換請聯絡客服",
          code: "ACCOUNT_ALREADY_LINKED_OTHER_LINE",
        },
      };
    }

    const { error: insertErr } = await supabaseAdmin
      .from("line_account_links")
      .insert({
        line_user_id: lineUserId,
        user_id: member.userId || null,
        email: member.email,
        display_name: verified.name || null,
      });

    if (insertErr) {
      if (insertErr.code === "23505") {
        const { data: raceWinner } = await supabaseAdmin
          .from("line_account_links")
          .select("user_id, email")
          .eq("line_user_id", lineUserId)
          .maybeSingle();
        const isSelf = raceWinner
          ? member.userId
            ? String(raceWinner.user_id || "") === String(member.userId)
            : (raceWinner.email || "").toLowerCase() === member.email
          : false;

        if (!isSelf) {
          await logAttempt?.({ success: false });
          return {
            ok: false,
            status: 409,
            body: {
              success: false,
              error:
                "此 LINE 帳號已被其他會員綁定，請改用該帳號登入，或聯絡客服協助",
              code: "LINE_ALREADY_LINKED_OTHER_ACCOUNT",
            },
          };
        }
      } else {
        throw insertErr;
      }
    }
  }

  if (member.userId) {
    try {
      const { data: userData } =
        await supabaseAdmin.auth.admin.getUserById(member.userId);
      const prevMeta = userData?.user?.user_metadata || {};
      if (prevMeta.line_id !== lineUserId) {
        await supabaseAdmin.auth.admin.updateUserById(member.userId, {
          user_metadata: { ...prevMeta, line_id: lineUserId },
        });
      }
    } catch (e) {
      console.warn(
        "[lineAccountBind] 同步 user_metadata 失敗（不影響綁定結果）:",
        e.message,
      );
    }
  }

  const lineStatus = await getMemberLineFriendStatus(supabaseAdmin, {
    ...member,
    lineUserId,
  });

  await logAttempt?.({ success: true });

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      already_linked: false,
      line_user_id: lineUserId,
      is_friend: lineStatus.isFriend,
      line_oa_url: lineStatus.lineOaUrl || LINE_OA_URL,
    },
  };
}
