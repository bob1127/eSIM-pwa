"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import EyeIcon from "@/components/icons/eye-icon";
import HeartIcon from "@/components/icons/heart-icon";
import UserPlusIcon from "@/components/icons/user-plus-icon";
import UserCheckIcon from "@/components/icons/user-check-icon";
import InstagramIcon from "@/components/icons/instagram-icon";
import FacebookIcon from "@/components/icons/facebook-icon";
import FilledBellIcon from "@/components/icons/filled-bell-icon";
import CreatorFollowHeart from "@/components/creators/CreatorFollowHeart";
import { useCreatorFollow } from "@/hooks/useCreatorFollow";
import { useEngageToast } from "@/components/creators/EngageToast";
import ClockIcon from "@/components/icons/clock-icon";

function fmt(n) {
  return Number(n || 0).toLocaleString("zh-TW");
}

const WEEKDAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

/**
 * 固定用台北時間自行組字，不走 toLocaleDateString。
 * Node 與瀏覽器的 zh-TW 星期前空格不一致（`8月16日 週日` / `8月16日週日`），
 * 且伺服器時區可能不是 +08，兩者都會造成 hydration mismatch。
 */
function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const taipei = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return `${taipei.getUTCMonth() + 1}月${taipei.getUTCDate()}日 ${
    WEEKDAY_LABELS[taipei.getUTCDay()]
  }`;
}

function PostStats({ views, likes, light = false, size = 14 }) {
  const color = light ? "#fff" : "#2563eb";
  const text = light ? "text-white/90" : "text-[#2563eb]";
  return (
    <span className={`inline-flex items-center gap-2 ${text}`}>
      <span className="inline-flex items-center gap-0.5">
        <EyeIcon size={size} color={color} className="cursor-default" />
        <span className="tabular-nums">{fmt(views)}</span>
      </span>
      <span className="inline-flex items-center gap-0.5">
        <HeartIcon size={size} color={color} className="cursor-default" />
        <span className="tabular-nums">{fmt(likes)}</span>
      </span>
    </span>
  );
}

const POSTS_PER_PAGE = 5;

function pageList(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, current - 1, current, current + 1]);
  return [...set]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
    .reduce((acc, n) => {
      if (acc.length && n - acc[acc.length - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);
}

export default function CreatorProfileView({
  profile: initial,
  onClose,
  embedded = false,
}) {
  const router = useRouter();
  const [profile] = useState(initial);
  const [postPage, setPostPage] = useState(1);
  const { showToast, toastNode } = useEngageToast();
  const {
    following,
    followerCount,
    busy,
    ready: followReady,
    toggle: toggleFollow,
  } = useCreatorFollow({
    creatorKey: profile.key,
    creatorName: profile.name,
    initialFollowing: initial?.following,
    initialFollowerCount: initial?.followerCount,
    onToast: showToast,
  });
  const latest = profile.posts?.[0];
  const allPosts = profile.posts || [];
  const postPages = Math.max(1, Math.ceil(allPosts.length / POSTS_PER_PAGE));
  const pagedPosts = useMemo(() => {
    const start = (postPage - 1) * POSTS_PER_PAGE;
    return allPosts.slice(start, start + POSTS_PER_PAGE);
  }, [allPosts, postPage]);

  useEffect(() => {
    setPostPage(1);
  }, [profile.key]);

  const handleToggleFollow = async () => {
    const result = await toggleFollow();
    if (!result?.ok) return;
    if (result.following) {
      showToast(
        result.changed
          ? `已追蹤「${profile.name}」`
          : `已在追蹤「${profile.name}」`,
      );
    } else {
      showToast(`已取消追蹤「${profile.name}」`);
    }
  };

  const blueBtn =
    "flex-1 h-11 rounded-full bg-[#2563eb] text-white text-[13px] sm:text-[14px] font-bold inline-flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#1d4ed8] transition-colors";

  const wrapCls = embedded
    ? "w-full -mx-4 sm:-mx-6 md:w-[calc(100%+3rem)]"
    : "w-full";

  return (
    <div className={embedded ? "" : "bg-[#ececef] min-h-screen pb-16"}>
      <div className={wrapCls}>
        <div className="bg-[#f4f4f5] min-h-screen sm:min-h-0 overflow-hidden">
          <div className="relative w-full h-[min(78vw,520px)] sm:h-[min(48vw,560px)] lg:h-[min(38vw,520px)]">
            <img
              src={profile.cover}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/20" />
            <div className="relative z-10 flex items-center justify-between px-4 pt-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => (onClose ? onClose() : router.back())}
                className="w-9 h-9 rounded-full bg-black/35 text-white text-lg leading-none"
                aria-label="關閉"
              >
                ×
              </button>
              <div className="flex items-center gap-2">
                <a
                  href={profile.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center"
                >
                  <InstagramIcon size={16} color="#fff" />
                </a>
                <CreatorFollowHeart
                  following={following}
                  busy={busy}
                  ready={followReady}
                  onToggle={handleToggleFollow}
                  creatorName={profile.name}
                  tone="overlay"
                  size={16}
                  className="w-9 h-9"
                />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-[4.25rem] sm:bottom-16 px-4 sm:px-6 lg:px-8 text-white max-w-3xl">
              <h1 className="text-[22px] sm:text-[28px] font-bold leading-tight">
                {latest?.title || profile.name}
              </h1>
              <p className="mt-2 text-[12px] sm:text-[13px] text-white/85">
                {fmtDate(latest?.date)} · + {fmt(followerCount)} 人追蹤
              </p>
              <p className="mt-1.5 text-[12px] sm:text-[13px] text-white/80 flex items-start gap-1.5">
                <span className="mt-0.5">📍</span>
                {profile.location} · {profile.subtitle}
              </p>
            </div>
            <div className="absolute inset-x-0 -bottom-5 px-4 sm:px-6 lg:px-8">
              <div className="flex gap-2 w-full">
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={busy || !followReady}
                  aria-pressed={following}
                  aria-busy={busy}
                  className={`${blueBtn} ${following ? "bg-[#1d4ed8]" : ""} ${
                    busy || !followReady ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {following ? (
                    <UserCheckIcon size={16} color="#fff" />
                  ) : (
                    <UserPlusIcon size={16} color="#fff" />
                  )}
                  {following ? "追蹤中" : "追蹤"}
                </button>
                <Link href={profile.shopHref} className={blueBtn}>
                  賣場
                </Link>
                <Link href={profile.blogHref} className={blueBtn}>
                  文章
                </Link>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-10 px-4 sm:px-6 lg:px-10 pb-8 lg:pb-10 max-w-[1280px] mx-auto">
            <div className="md:grid md:grid-cols-[minmax(240px,32%)_minmax(0,1fr)] md:gap-6 lg:gap-8 md:items-start">
              <div className="space-y-5 md:sticky md:top-6">
                <section className="bg-white rounded-[28px] px-5 py-5 shadow-sm">
                  <p className="text-[11px] text-slate-400">創作者</p>
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={profile.avatar}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover border border-slate-100"
                    />
                    <div className="min-w-0">
                      <p className="text-[20px] font-bold text-slate-900 leading-tight">
                        {profile.name}
                      </p>
                      <p className="text-[12px] text-slate-400 mt-0.5">{profile.bio}</p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[18px] font-bold text-slate-900">
                        {fmt(profile.likeCount)}
                      </p>
                      <p className="text-[11px] text-slate-400">按讚</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-slate-900">
                        {fmt(profile.postCount)}
                      </p>
                      <p className="text-[11px] text-slate-400">篇文章</p>
                    </div>
                    <div>
                      <p className="text-[18px] font-bold text-slate-900">
                        {profile.memberSince}
                      </p>
                      <p className="text-[11px] text-slate-400">加入年份</p>
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-[15px] font-bold text-slate-900 mb-3 px-1">
                    Creator Center
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white rounded-2xl px-3 py-3 text-center shadow-sm">
                      <p className="text-[16px] font-bold">{fmt(profile.viewCount)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">累計人氣</p>
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-3 text-center shadow-sm">
                      <p className="text-[16px] font-bold">{fmt(followerCount)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">追蹤</p>
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-3 text-center shadow-sm">
                      <p className="text-[16px] font-bold">{fmt(profile.likeCount)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">按讚</p>
                    </div>
                  </div>
                </section>

                <section className="bg-white rounded-[28px] overflow-hidden shadow-sm">
                  <Link
                    href={profile.blogHref}
                    className="flex items-center justify-between px-5 py-4 border-b border-slate-100"
                  >
                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold">
                      <ClockIcon size={18} /> 全部文章
                    </span>
                    <span className="text-slate-300">›</span>
                  </Link>
                  <a
                    href={profile.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4 border-b border-slate-100"
                  >
                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold">
                      <InstagramIcon size={18} /> Instagram
                    </span>
                    <span className="text-slate-300">›</span>
                  </a>
                  <a
                    href={profile.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <span className="inline-flex items-center gap-2 text-[14px] font-semibold">
                      <FacebookIcon size={18} /> Facebook
                    </span>
                    <span className="text-slate-300">›</span>
                  </a>
                </section>

                {following ? (
                  <p className="text-[12px] text-slate-400 px-1 flex items-center gap-1.5">
                    <FilledBellIcon size={14} color="#2563eb" />
                    已追蹤，新文章會嘗試推播通知你。
                  </p>
                ) : null}
              </div>

              <div className="mt-5 md:mt-0 space-y-5 min-w-0">
                {allPosts.length ? (
                  <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-[15px] font-bold text-slate-900">近期文章</p>
                      <span className="text-[12px] text-slate-400">
                        {allPosts.length} 篇
                      </span>
                    </div>
                    <div className="hidden md:grid grid-cols-4 gap-2 mb-4">
                      {allPosts.slice(0, 4).map((post) => (
                        <Link
                          key={post.slug}
                          href={post.href}
                          className="relative aspect-square rounded-[16px] overflow-hidden bg-slate-200"
                        >
                          <img src={post.image} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] px-1 py-1 overflow-hidden">
                            <PostStats
                              views={post.viewCount}
                              likes={post.likeCount}
                              light
                              size={10}
                            />
                          </span>
                        </Link>
                      ))}
                    </div>
                    <ul className="grid grid-cols-1 gap-3">
                      {pagedPosts.map((post) => (
                        <li key={`row-${post.slug}`}>
                          <Link
                            href={post.href}
                            className="flex gap-3 items-center bg-white rounded-2xl p-3 shadow-sm h-full"
                          >
                            <img
                              src={post.image}
                              alt=""
                              className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl object-cover bg-slate-100 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-bold text-slate-900 line-clamp-2">
                                {post.title}
                              </p>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {fmtDate(post.date)}
                              </p>
                              <p className="mt-1 text-[11px] font-semibold">
                                <PostStats views={post.viewCount} likes={post.likeCount} />
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {postPages > 1 ? (
                      <nav
                        className="mt-4 flex items-center justify-center gap-1.5"
                        aria-label="文章分頁"
                      >
                        <button
                          type="button"
                          disabled={postPage <= 1}
                          onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                          className="h-8 min-w-8 px-2 rounded-full text-[13px] font-bold text-[#2563eb] disabled:opacity-30"
                        >
                          ‹
                        </button>
                        {pageList(postPages, postPage).map((n, i) =>
                          n === "…" ? (
                            <span
                              key={`e-${i}`}
                              className="h-8 min-w-8 px-1 text-[12px] text-slate-400 text-center leading-8"
                            >
                              …
                            </span>
                          ) : (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setPostPage(n)}
                              className={`h-8 min-w-8 px-2.5 rounded-full text-[13px] font-bold ${
                                n === postPage
                                  ? "bg-[#2563eb] text-white"
                                  : "text-slate-600 hover:bg-white"
                              }`}
                            >
                              {n}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          disabled={postPage >= postPages}
                          onClick={() =>
                            setPostPage((p) => Math.min(postPages, p + 1))
                          }
                          className="h-8 min-w-8 px-2 rounded-full text-[13px] font-bold text-[#2563eb] disabled:opacity-30"
                        >
                          ›
                        </button>
                      </nav>
                    ) : null}
                  </section>
                ) : (
                  <p className="text-sm text-slate-500 px-1">尚無公開文章</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {toastNode}
    </div>
  );
}
