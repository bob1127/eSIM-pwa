/**
 * 伺服器端驗證 LINE ID Token（LIFF／LINE Login 綁定用）
 *
 * 安全原則：絕不可信任前端傳來的 line user id。一律呼叫 LINE 官方
 * verify endpoint，並確認 aud（受眾）等於本站 LINE Channel，
 * 避免任意前端偽造 line_user_id 冒用他人身分。
 *
 * 文件：https://developers.line.biz/en/reference/line-login/#verify-id-token
 */

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

/**
 * LIFF App 若掛在跟 LINE Login（NextAuth）不同的 Channel，
 * 請另外設定 LINE_LIFF_CHANNEL_ID；否則預設沿用 LINE_CLIENT_ID。
 */
function getLineChannelIds() {
  const liffId = (process.env.NEXT_PUBLIC_LIFF_ID || "").trim();
  const fromLiff = liffId.includes("-") ? liffId.split("-")[0] : "";
  const ids = [
    process.env.LINE_LIFF_CHANNEL_ID,
    process.env.LINE_CLIENT_ID,
    process.env.NEXT_PUBLIC_LINE_CLIENT_ID,
    fromLiff,
    "2010846381",
  ];
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function verifyWithClientId(idToken, clientId) {
  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: clientId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.sub) {
    return {
      ok: false,
      error: data.error_description || data.error || `http_${res.status}`,
    };
  }
  return {
    ok: true,
    lineUserId: String(data.sub),
    name: data.name || null,
    picture: data.picture || null,
  };
}

/**
 * @param {string} idToken LIFF `liff.getIDToken()` 取得的 JWT
 * @returns {Promise<{ ok: true, lineUserId: string, name: string|null, picture: string|null } | { ok: false, error: string }>}
 */
export async function verifyLineIdToken(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return { ok: false, error: "missing_id_token" };
  }

  const clientIds = getLineChannelIds();
  if (!clientIds.length) {
    return { ok: false, error: "missing_channel_id" };
  }

  let lastError = "verify_failed";
  for (const clientId of clientIds) {
    try {
      const result = await verifyWithClientId(idToken, clientId);
      if (result.ok) return result;
      lastError = result.error;
    } catch (e) {
      lastError = e.message || "verify_request_failed";
    }
  }

  return { ok: false, error: lastError };
}
