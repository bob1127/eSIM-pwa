"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useUser } from "@/components/context/UserContext";
import { bindLineAccount, LINE_BIND_PENDING_KEY } from "@/lib/lineBindClient";

function isLocalDevHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function mapBindError({ error, code }) {
  switch (code) {
    case "LINE_ALREADY_LINKED_OTHER_ACCOUNT":
      return "此 LINE 帳號已綁定其他會員帳號，請改用該帳號登入，或聯絡客服協助。";
    case "ACCOUNT_ALREADY_LINKED_OTHER_LINE":
      return "此帳號已綁定另一個 LINE，如需更換請聯絡客服。";
    case "LINE_MISMATCH":
      return "LINE 身分驗證不一致，請重新整理後再試一次。";
    default:
      if (error === "missing_liff_id" || error === "missing_channel_id") {
        return "LINE 綁定功能尚未設定，請聯絡客服。";
      }
      if (error === "ssr") return "";
      return error || "綁定失敗，請稍後再試。";
  }
}

function bindSuccessMessage(result) {
  if (result?.isFriend === false) {
    return "已連結 LINE。請再加入官方帳號，才能收到流量提醒與使用折扣。";
  }
  if (result?.trafficAlert?.ok) {
    return "已綁定 LINE，並開啟流量偏低提醒。剩餘偏低時會在官方 LINE 通知您。";
  }
  return "已成功綁定 LINE。若本站尚無 eSIM 訂單，請到官方 LINE 貼上 ICCID 開啟提醒。";
}

function stripBindQuery(router) {
  if (!router?.isReady || !router.replace) return;
  const q = { ...router.query };
  delete q.line_bind;
  delete q.line_bind_msg;
  delete q.line_bind_code;
  delete q.line_friend;
  const path = String(router.pathname || "").toLowerCase();
  if (path.includes("cart") && !q.step) q.step = "1";
  router.replace(
    { pathname: router.pathname, query: q },
    undefined,
    { shallow: true },
  );
}

/**
 * 「連結 LINE 並啟用優惠」流程的共用 hook。
 *
 * - 本機：OAuth 回呼後 URL 帶 line_bind=ok／error（伺服器已完成綁定）
 * - 正式站 LIFF：導回後靠 sessionStorage 旗標再跑一次 bind
 */
export function useLineBind({ onSuccess } = {}) {
  const router = useRouter();
  const { token, isHydrated } = useUser();
  const { status: nextAuthStatus } = useSession();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const ranPendingCheck = useRef(false);

  const runBind = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    const result = await bindLineAccount({ accessToken: token });

    if (result.pending) {
      return;
    }

    if (result.ok) {
      setStatus("success");
      setMessage(bindSuccessMessage(result));
      onSuccess?.(result);
      if (
        router.pathname === "/account" &&
        String(router.query.line_bind || "") === "start"
      ) {
        router.replace("/line/iccid?bind=ok");
        return;
      }
    } else {
      setStatus("error");
      setMessage(mapBindError(result));
    }
  }, [token, onSuccess, router]);

  // 本機 OAuth 回呼結果
  useEffect(() => {
    if (!router.isReady || ranPendingCheck.current) return;
    const flag = router.query.line_bind;
    if (flag !== "ok" && flag !== "error") return;

    ranPendingCheck.current = true;
    try {
      sessionStorage.removeItem(LINE_BIND_PENDING_KEY);
    } catch {
      /* ignore */
    }

    if (flag === "ok") {
      const isFriend = router.query.line_friend === "1";
      setStatus("success");
      setMessage(
        bindSuccessMessage({
          isFriend,
          trafficAlert: { ok: true },
        }),
      );
      onSuccess?.({ ok: true, isFriend });
    } else {
      const code =
        typeof router.query.line_bind_code === "string"
          ? router.query.line_bind_code
          : "";
      const rawMsg =
        typeof router.query.line_bind_msg === "string"
          ? router.query.line_bind_msg
          : "";
      const msg =
        code === "NEED_LOGIN"
          ? "登入狀態未帶到綁定流程，請重新整理後再按「連結 LINE」（須保持 Google 登入）。"
          : rawMsg || "綁定失敗，請稍後再試。";
      setStatus("error");
      setMessage(msg);
    }
    stripBindQuery(router);
  }, [router, onSuccess]);

  // 官方 LINE「一鍵綁定」：?line_bind=start 自動連結目前登入的 Google／FB／Email
  useEffect(() => {
    if (!router.isReady || !isHydrated) return;
    if (nextAuthStatus === "loading") return;
    if (router.query.line_bind !== "start") return;
    if (ranPendingCheck.current) return;
    ranPendingCheck.current = true;
    runBind().finally(() => stripBindQuery(router));
  }, [
    router,
    isHydrated,
    nextAuthStatus,
    runBind,
  ]);
  useEffect(() => {
    if (ranPendingCheck.current) return;
    if (!isHydrated || nextAuthStatus === "loading") return;
    if (!router.isReady) return;
    if (router.query.line_bind) return;

    if (
      typeof window !== "undefined" &&
      isLocalDevHost(window.location.hostname)
    ) {
      // 本機若只有 pending 旗標、沒有 line_bind 結果，代表使用者中途取消；清掉即可
      try {
        if (sessionStorage.getItem(LINE_BIND_PENDING_KEY) === "1") {
          // 等一下，可能還在導向中；不自動清。若已回到頁面且無 query，清掉避免卡 loading
          sessionStorage.removeItem(LINE_BIND_PENDING_KEY);
        }
      } catch {
        /* ignore */
      }
      return;
    }

    let pending = false;
    try {
      pending = sessionStorage.getItem(LINE_BIND_PENDING_KEY) === "1";
    } catch {
      pending = false;
    }
    if (!pending) return;

    ranPendingCheck.current = true;
    try {
      sessionStorage.removeItem(LINE_BIND_PENDING_KEY);
    } catch {
      /* ignore */
    }
    runBind();
  }, [isHydrated, nextAuthStatus, runBind, router.isReady, router.query.line_bind]);

  return { status, message, bind: runBind };
}
