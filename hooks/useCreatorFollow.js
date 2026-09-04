"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";

/** 連點節流：同一顆愛心兩次有效點擊至少間隔這麼久 */
const MIN_TOGGLE_GAP_MS = 500;
const CACHE_KEY = "jeko_creator_follow_cache";

function readCache(memberScope) {
  if (typeof window === "undefined" || !memberScope) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return raw?.[memberScope] && typeof raw[memberScope] === "object"
      ? raw[memberScope]
      : {};
  } catch {
    return {};
  }
}

function writeCache(memberScope, creatorKey, following) {
  if (typeof window === "undefined" || !memberScope || !creatorKey) return;
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    const scoped = raw?.[memberScope] && typeof raw[memberScope] === "object"
      ? raw[memberScope]
      : {};
    scoped[creatorKey] = Boolean(following);
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...raw, [memberScope]: scoped }),
    );
  } catch {
    /* 隱私模式／容量已滿：純快取，失敗不影響功能 */
  }
}

/**
 * 追蹤創作者的共用狀態與防呆。
 *
 * 伺服器（`creator_follows`）是唯一真實來源，重新整理後由 `follow-state` 還原愛心；
 * localStorage 只當「上次已知狀態」的快取，用來避免重整瞬間愛心閃一下沒亮。
 *
 * 防呆：登入狀態未確定、追蹤狀態未載入、請求進行中、連點過快都不會送出請求；
 * 伺服器端 follow／unfollow 亦為幂等，重複按不會重複計數。
 */
export function useCreatorFollow({
  creatorKey,
  creatorName = "",
  initialFollowing = false,
  initialFollowerCount = 0,
  /** false 時由外部呼叫 syncFromServer() 餵狀態（例如文章頁已有一支 engage GET） */
  autoLoad = true,
  onToast,
} = {}) {
  const router = useRouter();
  const { isLoggedIn, authReady, token, user } = useAuth();
  const memberScope = user?.id ? `uid:${user.id}` : isLoggedIn ? "member" : "";

  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [followerCount, setFollowerCount] = useState(
    Number(initialFollowerCount) || 0,
  );
  const [stateLoaded, setStateLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  // 同步鎖：setBusy 是非同步的，同一個 tick 連點兩次仍會兩次通過 busy 判斷
  const inFlightRef = useRef(false);
  const lastToggleAtRef = useRef(0);

  const toast = useCallback(
    (msg) => {
      if (typeof onToast === "function") onToast(msg);
    },
    [onToast],
  );

  // 重整後先用快取讓愛心立刻回到已追蹤狀態，再等伺服器確認
  useEffect(() => {
    if (!creatorKey) return;
    if (!isLoggedIn) {
      setFollowing(false);
      return;
    }
    const cached = readCache(memberScope)[creatorKey];
    if (typeof cached === "boolean") setFollowing(cached);
  }, [creatorKey, isLoggedIn, memberScope]);

  const applyServerState = useCallback(
    (data) => {
      if (!data) return;
      if (typeof data.following === "boolean") {
        setFollowing(data.following);
        writeCache(memberScope, creatorKey, data.following);
      }
      if (typeof data.followerCount === "number") {
        setFollowerCount(data.followerCount);
      }
      setStateLoaded(true);
    },
    [creatorKey, memberScope],
  );

  /** 讓已經打過 engage GET 的頁面把狀態餵進來，避免重複請求 */
  const syncFromServer = useCallback(
    ({ following: nextFollowing, followerCount: nextCount } = {}) => {
      applyServerState({
        following: nextFollowing,
        followerCount: nextCount,
      });
    },
    [applyServerState],
  );

  useEffect(() => {
    if (!autoLoad || !creatorKey || !authReady) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const qs = new URLSearchParams({
          action: "follow-state",
          creatorKey,
        });
        const res = await fetch(`/api/blog/engage?${qs}`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        applyServerState(data);
      } catch {
        /* 讀取失敗維持現值，使用者仍可按（送出時伺服器會給權威狀態） */
      } finally {
        if (!cancelled) setStateLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [autoLoad, creatorKey, authReady, isLoggedIn, token, applyServerState]);

  const ready = authReady && stateLoaded;

  const toggle = useCallback(async () => {
    if (!creatorKey) return { ok: false };
    if (!authReady) return { ok: false };

    if (!isLoggedIn) {
      toast("請先登入後再追蹤");
      router.push(buildLoginUrl());
      return { ok: false, needLogin: true };
    }
    // 還不知道目前是否已追蹤時不送出，避免把「已追蹤」誤送成再次追蹤
    if (!stateLoaded) {
      toast("追蹤狀態載入中，請稍候");
      return { ok: false };
    }
    if (inFlightRef.current) return { ok: false };

    const now = Date.now();
    if (now - lastToggleAtRef.current < MIN_TOGGLE_GAP_MS) return { ok: false };
    lastToggleAtRef.current = now;

    const next = !following;
    const rollback = () => {
      setFollowing(!next);
      setFollowerCount((n) => Math.max(0, n + (next ? -1 : 1)));
    };

    inFlightRef.current = true;
    setBusy(true);
    setFollowing(next);
    setFollowerCount((n) => Math.max(0, n + (next ? 1 : -1)));

    try {
      const res = await fetch("/api/blog/engage", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: next ? "follow" : "unfollow",
          creatorKey,
          creatorName,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        rollback();
        toast("請先登入後再追蹤");
        router.push(buildLoginUrl());
        return { ok: false, needLogin: true };
      }
      if (!res.ok) {
        rollback();
        toast(data.error || "追蹤失敗，請稍後再試");
        return { ok: false };
      }

      applyServerState(data);
      return {
        ok: true,
        following: Boolean(data.following),
        changed: data.changed !== false,
      };
    } catch {
      rollback();
      toast("網路異常，請稍後再試");
      return { ok: false };
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }, [
    applyServerState,
    authReady,
    creatorKey,
    creatorName,
    following,
    isLoggedIn,
    router,
    stateLoaded,
    toast,
    token,
  ]);

  return {
    following,
    followerCount,
    busy,
    ready,
    toggle,
    syncFromServer,
  };
}

export default useCreatorFollow;
