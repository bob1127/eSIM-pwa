"use client";

import { useEffect, useState } from "react";
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
import HeartIcon from "@/components/icons/heart-icon";
import EyeIcon from "@/components/icons/eye-icon";
import UserPlusIcon from "@/components/icons/user-plus-icon";
import UserCheckIcon from "@/components/icons/user-check-icon";
import FacebookIcon from "@/components/icons/facebook-icon";
import InstagramIcon from "@/components/icons/instagram-icon";
import FilledBellIcon from "@/components/icons/filled-bell-icon";
import { useEngageToast } from "@/components/creators/EngageToast";

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
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast, toastNode } = useEngageToast();

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const qs = new URLSearchParams({ postKey, creatorKey });
      const res = await fetch(`/api/blog/engage?${qs}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (cancelled || !res.ok) return;
      setViewCount(data.viewCount || 0);
      setLikeCount(data.likeCount || 0);
      setLiked(Boolean(data.liked));
      setFollowing(Boolean(data.following));
      if (typeof data.followerCount === "number") {
        setFollowerCount(data.followerCount);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [postKey, creatorKey, isLoggedIn]);

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
      goLogin("請先登入後再按讚");
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    showToast(next ? "已按讚" : "已取消按讚");
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
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
      goLogin("請先登入後再按讚");
      return;
    }
    if (typeof data.likeCount === "number") setLikeCount(data.likeCount);
    setLiked(Boolean(data.liked));
  };

  const toggleFollow = async () => {
    if (!authReady || busy) return;
    if (!isLoggedIn) {
      goLogin("請先登入後再追蹤");
      return;
    }
    setBusy(true);
    const next = !following;
    setFollowing(next);
    const res = await fetch("/api/blog/engage", {
      method: "POST",
      credentials: "include",
      headers: authHeaders(),
      body: JSON.stringify({
        action: next ? "follow" : "unfollow",
        postKey,
        creatorKey,
        creatorName: authorName,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) {
      setFollowing(!next);
      goLogin("請先登入後再追蹤");
      return;
    }
    if (!res.ok) {
      setFollowing(!next);
      const err = data.error || "追蹤失敗";
      setHint(err);
      showToast(err);
      return;
    }
    setFollowing(Boolean(data.following));
    setFollowerCount((n) => Math.max(0, n + (data.following ? 1 : -1)));
    if (data.following) {
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
    } else {
      setHint("已取消追蹤");
      showToast("已取消追蹤");
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
            disabled={busy}
            className={`${pill} ${following ? "bg-[#1d4ed8]" : ""}`}
          >
            {following ? (
              <UserCheckIcon size={16} color="#fff" />
            ) : (
              <UserPlusIcon size={16} color="#fff" />
            )}
            {following ? "追蹤中" : "追蹤"}
          </button>
          <button type="button" onClick={toggleLike} className={pill} aria-pressed={liked}>
            <HeartIcon
              size={16}
              color="#fff"
              fill={liked ? "#fff" : "none"}
              className="cursor-pointer"
            />
            按讚 {formatCount(likeCount)}
          </button>
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
            <Link
              href={creatorProfileHref(creatorKey)}
              className="block text-[14px] font-black truncate hover:opacity-90"
            >
              {authorName}
            </Link>
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
          <Link
            href={creatorProfileHref(creatorKey)}
            className="text-[13px] font-bold text-[#111] leading-tight hover:opacity-70"
          >
            {authorName}
          </Link>
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

        <button
          type="button"
          onClick={toggleLike}
          className={`flex items-center gap-1 text-[12px] ${
            liked ? "text-[#e11d48]" : "text-[#888] hover:text-[#e11d48]"
          }`}
          aria-pressed={liked}
        >
          <HeartIcon
            size={16}
            strokeWidth={1.8}
            fill={liked ? "currentColor" : "none"}
          />
          <span>按讚</span>
          <span className="font-semibold tabular-nums">{formatCount(likeCount)}</span>
        </button>

        <button
          type="button"
          onClick={toggleFollow}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 text-[12px] font-medium rounded-full px-3.5 py-1.5 border transition-colors ${
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
