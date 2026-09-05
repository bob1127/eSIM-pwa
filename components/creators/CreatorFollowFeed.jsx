"use client";

import { useRef } from "react";
import Link from "next/link";
import { creatorProfileHref } from "@/lib/blogCreator";
import EyeIcon from "@/components/icons/eye-icon";
import HeartIcon from "@/components/icons/heart-icon";
import StarIcon from "@/components/icons/star-icon";
import FilledBellIcon from "@/components/icons/filled-bell-icon";
import { useEngageToast } from "@/components/creators/EngageToast";

function fmt(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
  return v.toLocaleString("zh-TW");
}

function popScore(post) {
  return (Number(post.viewCount) || 0) + (Number(post.likeCount) || 0) * 18;
}

function withRanks(posts) {
  const order = [...posts].sort((a, b) => popScore(b) - popScore(a));
  const rank = new Map(
    order.map((p, i) => [`${p.creatorKey}-${p.slug}`, i + 1]),
  );
  return posts.map((p) => ({
    ...p,
    rank: rank.get(`${p.creatorKey}-${p.slug}`) || posts.length,
  }));
}

function postsFromFollows(follows) {
  const all = [];
  follows.forEach((f) => {
    const profile = f.profile;
    (profile?.posts || []).forEach((post) => {
      if (!post?.href || post.placeholder) return;
      all.push({
        ...post,
        creatorKey: f.creator_key,
        creatorName: profile?.name || f.creator_name || "創作者",
        creatorAvatar: profile?.avatar || "/images/Logo/icon-192.png",
      });
    });
  });
  return all;
}

function groupPostsByCategory(posts) {
  const all = (posts || []).filter((post) => post?.href && !post.placeholder);
  const ranked = withRanks(all);
  const map = new Map();
  ranked.forEach((post) => {
    const label = String(post.category || "旅遊").trim() || "旅遊";
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(post);
  });
  return [...map.entries()]
    .map(([label, list]) => ({
      label,
      posts: [...list].sort((a, b) => (a.rank || 99) - (b.rank || 99)),
    }))
    .sort(
      (a, b) =>
        (a.posts[0]?.rank || 99) - (b.posts[0]?.rank || 99) ||
        b.posts.length - a.posts.length,
    );
}

function rankTone(rank) {
  if (rank === 1) return "bg-amber-400 text-slate-900";
  if (rank === 2) return "bg-slate-200 text-slate-800";
  if (rank === 3) return "bg-[#d6a57a] text-white";
  return "bg-[#2563eb] text-white";
}

function ArticleCarousel({ label, posts, onOpenInner }) {
  const scroller = useRef(null);
  const scrollBy = (dir) => {
    const el = scroller.current;
    if (!el) return;
    const step = Math.min(el.clientWidth * 0.78, 320);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3 px-0.5">
        <h3 className="text-[17px] font-bold text-slate-900">{label}</h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="w-8 h-8 rounded-full bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8]"
            aria-label="上一則"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="w-8 h-8 rounded-full bg-[#2563eb] text-white text-sm font-bold hover:bg-[#1d4ed8]"
            aria-label="下一則"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((post) => (
          <article
            key={`${post.creatorKey}-${post.slug}`}
            className="snap-start shrink-0 w-[72%] min-[480px]:w-[46%] sm:w-[38%] md:w-[31%] lg:w-[240px] bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100"
          >
            <Link href={post.href} className="block">
              <div className="relative aspect-[4/3] bg-slate-100">
                <img
                  src={post.image || "/images/Logo/icon-192.png"}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <span
                  className={`absolute top-2 left-2 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${rankTone(
                    post.rank,
                  )}`}
                >
                  <StarIcon
                    size={12}
                    color="currentColor"
                    className="cursor-default"
                  />
                  人氣 {post.rank}
                </span>
              </div>
              <p className="px-3 pt-3 text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5em]">
                {post.title}
              </p>
            </Link>
            <div className="px-3 pb-3 pt-1.5">
              {onOpenInner ? (
                <button
                  type="button"
                  onClick={() => onOpenInner(post.creatorKey)}
                  className="flex items-center gap-1.5 min-w-0 w-full text-left"
                >
                  <img
                    src={post.creatorAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <span className="text-[11px] text-slate-500 truncate">
                    {post.creatorName}
                  </span>
                </button>
              ) : (
                <Link
                  href={creatorProfileHref(post.creatorKey)}
                  className="flex items-center gap-1.5 min-w-0"
                >
                  <img
                    src={post.creatorAvatar}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <span className="text-[11px] text-slate-500 truncate">
                    {post.creatorName}
                  </span>
                </Link>
              )}
              <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-[#2563eb]">
                <span className="inline-flex items-center gap-0.5">
                  <EyeIcon size={14} color="#2563eb" className="cursor-default" />
                  {fmt(post.viewCount)}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <HeartIcon size={14} color="#2563eb" className="cursor-default" />
                  {fmt(post.likeCount)}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function CreatorFollowFeed({
  follows = [],
  /** 傳入陣列（可空）→ 下半部為「你的收藏」；不傳則顯示創作者文章流 */
  savedPosts,
  onUnfollow,
  onOpenInner,
  heading = "追蹤中",
  emptyHint = null,
}) {
  const items = follows.filter((f) => f.creator_key);
  const bookmarkMode = Array.isArray(savedPosts);
  const rows = groupPostsByCategory(
    bookmarkMode ? savedPosts : postsFromFollows(items),
  );
  const { showToast, toastNode } = useEngageToast();

  const openInner = (f) => {
    if (onOpenInner && f.profile) {
      onOpenInner(f.profile);
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-4">
          <span className="text-[22px] font-bold text-slate-900">{heading}</span>
          {heading === "追蹤中" ? (
            <Link href="/creators/" className="text-[15px] text-slate-400 pb-0.5">
              發現
            </Link>
          ) : (
            <Link href="/account#follows" className="text-[15px] text-slate-400 pb-0.5">
              追蹤中
            </Link>
          )}
        </div>
        <FilledBellIcon size={20} color="#111" />
      </div>

      {items.length > 0 ? (
        <div>
          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex gap-3 px-1 min-w-min">
              {items.map((f) => {
                const p = f.profile;
                const href = creatorProfileHref(f.creator_key);
                const tile = (
                  <>
                    <div className="relative w-[88px] h-[88px] rounded-[22px] overflow-hidden bg-slate-100 ring-2 ring-transparent hover:ring-[#2563eb] ring-offset-2">
                      <img
                        src="/images/charactor.png"
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <img
                        src={p?.avatar || "/images/Logo/icon-192.png"}
                        alt=""
                        className="absolute left-1.5 bottom-1.5 w-8 h-8 rounded-full border-2 border-white object-cover"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold truncate text-center text-slate-800">
                      {p?.name || f.creator_name || "創作者"}
                    </p>
                  </>
                );
                return (
                  <div key={f.creator_key} className="shrink-0 w-[88px]">
                    {onOpenInner && p ? (
                      <button
                        type="button"
                        onClick={() => openInner(f)}
                        className="block w-full text-left"
                      >
                        {tile}
                      </button>
                    ) : (
                      <Link href={href} className="block w-full">
                        {tile}
                      </Link>
                    )}
                    {onUnfollow ? (
                      <button
                        type="button"
                        onClick={() => {
                          onUnfollow(f.creator_key);
                          showToast(
                            `已取消追蹤「${p?.name || f.creator_name || "創作者"}」`,
                          );
                        }}
                        className="mt-1 w-full text-[10px] font-bold text-[#2563eb] hover:underline"
                      >
                        取消追蹤
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        emptyHint || (
          <p className="text-sm text-slate-500 leading-relaxed">
            尚未追蹤任何人。到{" "}
            <Link href="/creators/" className="text-[#2563eb] font-semibold">
              創作者
            </Link>{" "}
            點創作者「追蹤」，之後發新文可收推播。
          </p>
        )
      )}

      {bookmarkMode ? (
        <div className="space-y-6 pt-2">
          <h2 className="text-[22px] font-bold text-slate-900">你的收藏</h2>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500 leading-relaxed">
              尚未收藏任何文章。在文章頁點愛心即可加入收藏。
            </p>
          ) : (
            <div className="space-y-8">
              {rows.map((row) => (
                <ArticleCarousel
                  key={row.label}
                  label={row.label}
                  posts={row.posts}
                  onOpenInner={
                    onOpenInner
                      ? (key) => {
                          const f = items.find((x) => x.creator_key === key);
                          if (f?.profile) {
                            onOpenInner(f.profile);
                            return;
                          }
                          if (typeof window !== "undefined") {
                            window.location.href = creatorProfileHref(key);
                          }
                        }
                      : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : items.length === 0 ? null : rows.length === 0 ? (
        <p className="text-sm text-slate-500">尚無公開文章。</p>
      ) : (
        <div className="space-y-8">
          {rows.map((row) => (
            <ArticleCarousel
              key={row.label}
              label={row.label}
              posts={row.posts}
              onOpenInner={
                onOpenInner
                  ? (key) => {
                      const f = items.find((x) => x.creator_key === key);
                      if (f?.profile) onOpenInner(f.profile);
                    }
                  : null
              }
            />
          ))}
        </div>
      )}
      {toastNode}
    </div>
  );
}
