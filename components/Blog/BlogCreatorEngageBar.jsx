"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";
import { SOCIAL_LINKS } from "@/lib/seo.config";
import {
  creatorKeyFromPost,
  creatorLabelFromPost,
  creatorProfileHref,
  postKeyFromPost,
} from "@/lib/blogCreator";
import EyeIcon from "@/components/icons/eye-icon";
import UserPlusIcon from "@/components/icons/user-plus-icon";
import UserCheckIcon from "@/components/icons/user-check-icon";
import FacebookIcon from "@/components/icons/facebook-icon";
import InstagramIcon from "@/components/icons/instagram-icon";
import FilledBellIcon from "@/components/icons/filled-bell-icon";
import BlogLikeAnimatedToggle from "@/components/Blog/BlogLikeAnimatedToggle";
import CreatorFollowHeart from "@/components/creators/CreatorFollowHeart";
import { useCreatorFollow } from "@/hooks/useCreatorFollow";
import { useEngageToast } from "@/components/creators/EngageToast";
import {
  ensureServiceWorkerReady,
  subscribePushWithRetry,
} from "@/lib/pushDebug";

function formatCount(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function enableCreatorPush(token) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const registration = await ensureServiceWorkerReady();
  const subscription = await subscribePushWithRetry(
    registration,
    urlBase64ToUint8Array(publicKey),
  );
  await fetch("/api/subscribe/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(subscription),
  });
  return true;
}

export default function BlogCreatorEngageBar({
  post,
  partnerDomain,
  variant = "default",
  avatar = "",
}) {
  const router = useRouter();
  const { isLoggedIn, authReady, token } = useAuth();
  const authorName = creatorLabelFromPost(post);
  const creatorKey = creatorKeyFromPost(post, { partnerDomain });
  const postKey = postKeyFromPost(post, { partnerDomain });
  const authorInitial = String(authorName).trim().slice(0, 1) || "J";
  const isPartner = creatorKey.startsWith("partner:");

  const [viewCount, setViewCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [hint, setHint] = useState("");
  const { showToast, toastNode } = useEngageToast();

  // 追蹤狀態交給共用 hook（含連點鎖、幂等與重整還原）
  const {
    following,
    followerCount,
    busy,
    ready: followReady,
    toggle: toggleFollowState,
    syncFromServer: syncFollowState,
  } = useCreatorFollow({
    creatorKey,
    creatorName: authorName,
    autoLoad: false,
    onToast: showToast,
  });

  // 收藏也要防連點：setState 是非同步的，只靠 state 擋不住同一 tick 的兩次點擊
  const likeInFlightRef = useRef(false);

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
    if (!authReady) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const qs = new URLSearchParams({ postKey, creatorKey });
        const res = await fetch(`/api/blog/engage?${qs}`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        setViewCount(data.viewCount || 0);
        setLikeCount(data.likeCount || 0);
        setLiked(Boolean(data.liked));
        syncFollowState({
          following: Boolean(data.following),
          followerCount: data.followerCount,
        });
      } finally {
        if (!cancelled) {
          setStatsLoaded(true);
          // 讀取失敗也要解鎖，否則愛心會永久停用（送出時伺服器仍是權威且幂等）
          syncFollowState({});
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [postKey, creatorKey, isLoggedIn, authReady, token, syncFollowState]);

  useEffect(() => {
    if (typeof window === "undefined" || !postKey) return;
    const viewFlag = `jeko-blog-viewed:${postKey}`;
    if (sessionStorage.getItem(viewFlag)) return;
    sessionStorage.setItem(viewFlag, "1");
    fetch("/api/blog/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "view", postKey }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.viewCount === "number") setViewCount(data.viewCount);
      })
      .catch(() => {});
  }, [postKey]);

  const goLogin = (msg) => {
    showToast(msg || "請先登入");
    router.push(buildLoginUrl());
  };

  const toggleLike = async () => {
    if (!authReady) return;
    if (!isLoggedIn) {
      goLogin("請先登入後再收藏");
      return;
    }
    // 還沒讀到目前是否已收藏前不送出，避免把「已收藏」誤送成再次收藏
    if (!statsLoaded) {
      showToast("收藏狀態載入中，請稍候");
      return;
    }
    if (likeInFlightRef.current) return;
    likeInFlightRef.current = true;

    const next = !liked;
    const rollback = () => {
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
    };

    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    showToast(next ? "已收藏" : "已取消收藏");

    try {
      const res = await fetch("/api/blog/engage", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: JSON.stringify({
          action: next ? "like" : "unlike",
          postKey,
          creatorKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        rollback();
        goLogin("請先登入後再收藏");
        return;
      }
      if (!res.ok) {
        rollback();
        showToast(data.error || "收藏失敗，請稍後再試");
        return;
      }
      if (typeof data.likeCount === "number") setLikeCount(data.likeCount);
      setLiked(Boolean(data.liked));
    } catch {
      rollback();
      showToast("網路異常，請稍後再試");
    } finally {
      likeInFlightRef.current = false;
    }
  };

  const toggleFollow = async () => {
    const result = await toggleFollowState();
    if (!result?.ok) return;

    if (!result.following) {
      setHint("已取消追蹤");
      showToast("已取消追蹤");
      return;
    }
    // 已在追蹤時再按（例如另一個分頁先按過）不重複要求推播權限
    if (!result.changed) {
      const msg = `已在追蹤「${authorName}」`;
      setHint(msg);
      showToast(msg);
      return;
    }
    try {
      const ok = await enableCreatorPush(token);
      const msg = ok
        ? "已追蹤。之後發新文會推播通知你。"
        : "已追蹤。若要收推播，請允許瀏覽器通知。";
      setHint(msg);
      showToast(msg);
    } catch {
      const msg = "已追蹤。可到會員中心再開啟推播。";
      setHint(msg);
      showToast(msg);
    }
  };

  const photo =
    avatar ||
    (!isPartner ? "/images/Logo/icon-192.png" : "");

  if (variant === "overlay") {
    const pill =
      "flex-1 h-11 rounded-full bg-[#2563eb] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 hover:bg-[#1d4ed8] disabled:opacity-60";
    return (
      <div className="w-full">
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={toggleFollow}
            disabled={busy || !followReady}
            aria-pressed={following}
            aria-busy={busy}
            className={`${pill} ${following ? "bg-[#1d4ed8]" : ""}`}
          >
            {following ? (
              <UserCheckIcon size={16} color="#fff" />
            ) : (
              <UserPlusIcon size={16} color="#fff" />
            )}
            {following ? "追蹤中" : "追蹤"}
          </button>
          <BlogLikeAnimatedToggle
            pressed={liked}
            onPressedChange={() => toggleLike()}
            count={likeCount}
            disabled={!authReady || !statsLoaded}
            tone="overlay"
            label="收藏"
          />
          <Link href={creatorProfileHref(creatorKey)} className={pill}>
            內頁
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-2.5 text-white">
          <Link href={creatorProfileHref(creatorKey)} className="shrink-0">
            {photo ? (
              <img
                src={photo}
                alt={authorName}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full bg-white text-[#2563eb] flex items-center justify-center text-[14px] font-bold"
                aria-hidden
              >
                {authorInitial}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={creatorProfileHref(creatorKey)}
                className="block min-w-0 flex-1 text-[14px] font-black truncate hover:opacity-90"
              >
                {authorName}
              </Link>
              <CreatorFollowHeart
                following={following}
                busy={busy}
                ready={followReady}
                onToggle={toggleFollow}
                creatorName={authorName}
                tone="overlay"
                size={15}
              />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-white/90">
              <span className="inline-flex items-center gap-0.5">
                <EyeIcon size={13} color="#fff" className="cursor-default" />
                人氣 {formatCount(viewCount)}
              </span>
              <span>{formatCount(followerCount)} 人追蹤</span>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="inline-flex"
              >
                <InstagramIcon size={16} color="#fff" strokeWidth={1.8} />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="inline-flex"
              >
                <FacebookIcon size={16} color="#fff" strokeWidth={1.8} />
              </a>
            </div>
          </div>
        </div>
        {hint ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/85">
            <FilledBellIcon size={14} color="#fff" />
            {hint}
          </p>
        ) : null}
        {toastNode}
      </div>
    );
  }

  return (
    <div className="mb-4 pb-4 border-b border-[#eee]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link href={creatorProfileHref(creatorKey)} className="shrink-0">
          {photo ? (
            <img
              src={photo}
              alt={authorName}
              className="w-10 h-10 rounded-full object-cover border border-[#eee] bg-white"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full bg-[#0A6CD0] text-white flex items-center justify-center text-[14px] font-bold"
              aria-hidden
            >
              {authorInitial}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <Link
              href={creatorProfileHref(creatorKey)}
              className="text-[13px] font-bold text-[#111] leading-tight hover:opacity-70"
            >
              {authorName}
            </Link>
            <CreatorFollowHeart
              following={following}
              busy={busy}
              ready={followReady}
              onToggle={toggleFollow}
              creatorName={authorName}
              size={15}
              className="h-7 w-7"
            />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[#555]">
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon size={18} strokeWidth={1.8} />
            </a>
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
            >
              <FacebookIcon size={18} strokeWidth={1.8} />
            </a>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1 text-[12px] text-[#888]">
          <EyeIcon size={16} strokeWidth={1.8} className="cursor-default" />
          <span>人氣</span>
          <span className="font-semibold text-[#555] tabular-nums">
            {formatCount(viewCount)}
          </span>
        </div>

        <BlogLikeAnimatedToggle
          pressed={liked}
          onPressedChange={() => toggleLike()}
          count={likeCount}
          disabled={!authReady || !statsLoaded}
          label="收藏"
        />

        <button
          type="button"
          onClick={toggleFollow}
          disabled={busy || !followReady}
          aria-pressed={following}
          aria-busy={busy}
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3.5 py-1.5 border transition-colors disabled:opacity-60 ${
            following
              ? "border-[#111] bg-[#111] text-white"
              : "border-[#ccc] text-[#333] hover:border-[#111]"
          }`}
        >
          {following ? (
            <UserCheckIcon size={16} strokeWidth={1.8} color="currentColor" />
          ) : (
            <UserPlusIcon size={16} strokeWidth={1.8} color="currentColor" />
          )}
          {following ? "追蹤中" : "追蹤"}
        </button>
        </div>
      </div>
      {hint ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#666]">
          <FilledBellIcon size={14} color="#0A6CD0" />
          {hint}
        </p>
      ) : null}
      {toastNode}
    </div>
  );
}
