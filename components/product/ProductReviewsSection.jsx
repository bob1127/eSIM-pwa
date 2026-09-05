"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import MaterialIcon from "../MaterialIcon";
import MediaGalleryLightbox from "../MediaGalleryLightbox";
import { supabase } from "../../lib/supabaseClient";
import { isAdminEmail } from "../../lib/productAdminConfig";
import { buildLoginUrl } from "../../lib/authRedirect";
import {
  validateReviewContent,
  getCooldownRemainingMs,
  formatCooldownMessage,
} from "../../lib/productReviewAntiSpam";
import { clientWarn } from "@/lib/clientLogger";

const VIDEO_REGEX = /\.(mp4|webm|mov|m4v|avi|mkv|qt)$/i;
const MAX_MEDIA = 4;
const COLLAPSE_CHARS = 140;
const COOLDOWN_KEY = "jeko_review_last_post_at";

function readCooldownAt(userId) {
  if (typeof window === "undefined" || !userId) return 0;
  try {
    const raw = localStorage.getItem(`${COOLDOWN_KEY}:${userId}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function writeCooldownAt(userId) {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(`${COOLDOWN_KEY}:${userId}`, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function isVideoUrl(url) {
  return VIDEO_REGEX.test(url || "");
}

function formatReviewDate(value) {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}`;
}

function getMemberProfile(user) {
  if (!user) return { name: "會員", avatar: null };
  const meta = user.user_metadata || {};
  return {
    name:
      meta.full_name ||
      meta.name ||
      user.email?.split("@")[0] ||
      "會員",
    avatar: meta.avatar_url || meta.picture || null,
  };
}

function StarRow({ value, size = 13, design = "default" }) {
  const filledClass =
    design === "nissin" ? "text-[#3B9EFF]" : "text-amber-400";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <MaterialIcon
          key={i}
          name="star"
          size={size}
          filled={i < value}
          className={i < value ? filledClass : "text-slate-200"}
        />
      ))}
    </span>
  );
}

/** 可點擊評分星星 */
function StarPicker({ value = 5, onChange, size = 28, labels, design = "default" }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  const labelMap = labels || {
    1: "非常不滿意",
    2: "稍不滿意",
    3: "普通",
    4: "滿意",
    5: "非常滿意",
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className="inline-flex items-center gap-0.5"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
        aria-label="評分"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} 星`}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(n)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
          >
            <MaterialIcon
              name="star"
              size={size}
              filled={n <= active}
              className={
                n <= active
                  ? design === "nissin"
                    ? "text-[#3B9EFF]"
                    : "text-amber-400"
                  : "text-slate-300"
              }
            />
          </button>
        ))}
      </div>
      <span className="text-sm text-slate-500">
        {active} 星 — {labelMap[active]}
      </span>
    </div>
  );
}

/** 新增評價／回覆：若 user_avatar 等新欄位尚未建立，自動降級重試 */
async function insertProductReview(payload) {
  const full = { ...payload };
  let { error } = await supabase.from("product_reviews").insert([full]);

  if (error && /user_avatar|is_edited|edited_at/i.test(error.message)) {
    const legacy = { ...full };
    delete legacy.user_avatar;
    delete legacy.is_edited;
    delete legacy.edited_at;
    ({ error } = await supabase.from("product_reviews").insert([legacy]));
  }

  return { error };
}

async function updateProductReview(id, payload) {
  let { error } = await supabase.from("product_reviews").update(payload).eq("id", id);

  if (error && /is_edited|edited_at|user_avatar/i.test(error.message)) {
    const legacy = { ...payload };
    delete legacy.is_edited;
    delete legacy.edited_at;
    delete legacy.user_avatar;
    ({ error } = await supabase
      .from("product_reviews")
      .update(legacy)
      .eq("id", id));
  }

  return { error };
}

function MetaBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-[3px] text-[11px] font-medium text-slate-600 whitespace-nowrap">
      {children}
    </span>
  );
}

function RatingBadge({ value }) {
  return (
    <MetaBadge>
      <MaterialIcon name="star" size={12} filled className="text-amber-400" />
      {(value || 5).toFixed(1)}
    </MetaBadge>
  );
}

function MemberChip({ name, avatar, size = 28 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          className="rounded-full object-cover shrink-0 bg-slate-100"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="rounded-full bg-[#0A6CD0] text-white flex items-center justify-center font-bold shrink-0"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initial}
        </span>
      )}
      <span className="text-sm font-bold text-slate-800 truncate">{name}</span>
    </span>
  );
}

function ReviewMediaGrid({ urls, onOpen }) {
  if (!urls?.length) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 mt-3">
      {urls.slice(0, 8).map((url, i) => {
        const isVideo = isVideoUrl(url);
        return (
          <button
            key={url + i}
            type="button"
            onClick={() => onOpen(i)}
            className="relative aspect-square overflow-hidden rounded-md bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CD0]"
            aria-label={`開啟第 ${i + 1} 張媒體`}
          >
            {isVideo ? (
              <>
                <video src={url} className="w-full h-full object-cover" muted playsInline />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <MaterialIcon name="play_circle" size={24} className="text-white" />
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className="w-full h-full object-cover" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function CollapsibleText({ text }) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = (text || "").length > COLLAPSE_CHARS;

  if (!needsCollapse || expanded) {
    return (
      <p className="text-[13.5px] text-slate-700 leading-[1.75] whitespace-pre-wrap">
        {text}
        {needsCollapse && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="ml-2 inline-flex items-center gap-0.5 align-middle rounded-full bg-slate-500 px-2.5 py-[3px] text-[11px] text-white hover:bg-slate-600"
          >
            收合
            <MaterialIcon name="expand_less" size={13} />
          </button>
        )}
      </p>
    );
  }

  return (
    <p className="text-[13.5px] text-slate-700 leading-[1.75] whitespace-pre-wrap line-clamp-3">
      {text.slice(0, COLLAPSE_CHARS)}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="ml-2 inline-flex items-center gap-0.5 align-middle rounded-full bg-slate-600 px-2.5 py-[3px] text-[11px] text-white hover:bg-slate-700"
      >
        続きを読む
        <MaterialIcon name="expand_more" size={13} />
      </button>
    </p>
  );
}

function ReviewCard({
  review,
  productTitle,
  replyCount,
  replies,
  likeCount,
  likedByMe,
  currentUserId,
  memberProfile,
  isAdmin,
  isLoggedIn,
  loginHref = "/login",
  replyingTo,
  setReplyingTo,
  replyContent,
  setReplyContent,
  isReplying,
  editingId,
  editDraft,
  setEditDraft,
  isSavingEdit,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReplySubmit,
  onDelete,
  onToggleLike,
  onOpenGallery,
  design = "default",
}) {
  const isOwner = Boolean(currentUserId && review.user_id === currentUserId);
  const canManage = isOwner || isAdmin;
  const isEditing = editingId === review.id;
  const isNissin = design === "nissin";

  return (
    <article
      className={
        isNissin
          ? "py-6 border-b border-slate-100 last:border-b-0"
          : "py-4"
      }
    >
      {isNissin ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-2">
            <StarRow value={review.rating || 5} size={15} design={design} />
            <span className="text-[12px] text-slate-400">
              {formatReviewDate(review.created_at)?.replace(/\./g, "/")}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap mb-2">
            <MemberChip name={review.user_name} avatar={review.user_avatar} size={24} />
            {review.is_verified_purchase && <MetaBadge>已購買</MetaBadge>}
            {review.is_edited && (
              <MetaBadge>
                已編輯 · {formatDateTime(review.edited_at || review.updated_at)}
              </MetaBadge>
            )}
            {canManage && !isEditing && (
              <div className="ml-auto flex items-center gap-3 shrink-0">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => onStartEdit(review)}
                    className="text-[11px] text-slate-400 hover:text-[#0A6CD0]"
                  >
                    編輯
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(review.id, false, review.media_urls)}
                  className="text-[11px] text-slate-400 hover:text-red-500"
                >
                  刪除
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <MemberChip name={review.user_name} avatar={review.user_avatar} size={28} />
          <span className="text-[11px] text-slate-400">
            {formatReviewDate(review.created_at)}
          </span>
          {review.is_verified_purchase && <MetaBadge>已購買</MetaBadge>}
          {!review.parent_id && <RatingBadge value={review.rating} />}
          {review.is_edited && (
            <MetaBadge>
              已編輯 · {formatDateTime(review.edited_at || review.updated_at)}
            </MetaBadge>
          )}
          {canManage && !isEditing && (
            <div className="ml-auto flex items-center gap-3 shrink-0">
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onStartEdit(review)}
                  className="text-[11px] text-slate-400 hover:text-[#0A6CD0]"
                >
                  編輯
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(review.id, false, review.media_urls)}
                className="text-[11px] text-slate-400 hover:text-red-500"
              >
                刪除
              </button>
            </div>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="mt-3 space-y-3 rounded-xl bg-slate-50 p-3">
          <input
            type="text"
            value={editDraft.title}
            onChange={(e) =>
              setEditDraft((d) => ({ ...d, title: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#0A6CD0]"
            placeholder="標題"
          />
          <StarPicker
            value={editDraft.rating}
            onChange={(n) => setEditDraft((d) => ({ ...d, rating: n }))}
            size={26}
            design={design}
          />
          <textarea
            value={editDraft.content}
            onChange={(e) =>
              setEditDraft((d) => ({ ...d, content: e.target.value }))
            }
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#0A6CD0] resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-4 py-2 text-xs font-bold rounded-full border border-slate-200 text-slate-600"
            >
              取消
            </button>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={() => onSaveEdit(review.id)}
              className="px-5 py-2 text-xs font-bold rounded-full bg-[#0A6CD0] text-white disabled:opacity-50"
            >
              {isSavingEdit ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {review.title &&
            (isNissin ? (
              <p className="mt-1 text-[15px] font-bold text-slate-900 leading-snug">
                {review.title}
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] font-bold text-[#0A6CD0]">
                  {review.title}
                </span>
                {productTitle && (
                  <span className="text-[12px] text-slate-400">
                    [{productTitle}]
                  </span>
                )}
              </p>
            ))}

          <div className={isNissin ? "mt-2.5" : "mt-2"}>
            <CollapsibleText text={review.content} />
            <ReviewMediaGrid urls={review.media_urls} onOpen={onOpenGallery} />

            <div className="mt-3 flex items-center gap-4 text-slate-400">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() =>
                    setReplyingTo(replyingTo === review.id ? null : review.id)
                  }
                  className="inline-flex items-center gap-1 text-[13px] hover:text-[#0A6CD0] transition-colors"
                >
                  <MaterialIcon name="chat_bubble_outline" size={17} />
                  <span>{replyCount || 0}</span>
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="inline-flex items-center gap-1 text-[13px] hover:text-[#0A6CD0] transition-colors"
                >
                  <MaterialIcon name="chat_bubble_outline" size={17} />
                  <span>{replyCount || 0}</span>
                </Link>
              )}

              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => onToggleLike(review.id)}
                  className={`inline-flex items-center gap-1 text-[13px] transition-colors ${
                    likedByMe ? "text-rose-500" : "hover:text-rose-500"
                  }`}
                  aria-label={likedByMe ? "取消按讚" : "按讚"}
                >
                  <MaterialIcon
                    name="favorite"
                    size={17}
                    filled={likedByMe}
                  />
                  <span>{likeCount || 0}</span>
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="inline-flex items-center gap-1 text-[13px] hover:text-rose-500 transition-colors"
                >
                  <MaterialIcon name="favorite_border" size={17} />
                  <span>{likeCount || 0}</span>
                </Link>
              )}
            </div>

            {replies?.length > 0 && (
              <div className="mt-3 space-y-3 pl-3 border-l-2 border-slate-100">
                {replies.map((reply) => {
                  const replyOwner =
                    Boolean(currentUserId && reply.user_id === currentUserId) ||
                    isAdmin;
                  return (
                    <div key={reply.id} className="text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <MemberChip
                            name={reply.user_name}
                            avatar={reply.user_avatar}
                            size={22}
                          />
                          <time className="text-[11px] text-slate-400 shrink-0">
                            {formatReviewDate(reply.created_at)}
                          </time>
                          {reply.is_edited && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              · 已編輯 {formatDateTime(reply.edited_at || reply.updated_at)}
                            </span>
                          )}
                        </div>
                        {replyOwner && (
                          <button
                            type="button"
                            onClick={() => onDelete(reply.id, true)}
                            className="text-[11px] text-slate-400 hover:text-red-500 shrink-0"
                          >
                            刪除
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-slate-600 leading-relaxed whitespace-pre-wrap pl-[30px]">
                        {reply.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {replyingTo === review.id && isLoggedIn && (
              <form
                onSubmit={(e) => onReplySubmit(e, review.id)}
                className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">回覆為</span>
                  <MemberChip
                    name={memberProfile.name}
                    avatar={memberProfile.avatar}
                    size={24}
                  />
                </div>
                <textarea
                  placeholder="寫下回覆…"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#0A6CD0] resize-none"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-full border border-slate-200 text-slate-600"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isReplying}
                    className="px-5 py-2 text-xs font-bold rounded-full bg-[#0A6CD0] text-white hover:bg-[#0959ad] disabled:opacity-50"
                  >
                    {isReplying ? "送出中…" : "送出回覆"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export default function ProductReviewsSection({
  productId,
  productTitle,
  design = "default",
}) {
  const isNissin = design === "nissin";
  const router = useRouter();
  const [reviews, setReviews] = useState([]);
  const [replies, setReplies] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [likedIds, setLikedIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(5);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [media, setMedia] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ title: "", content: "", rating: 5 });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [gallery, setGallery] = useState({ isOpen: false, items: [], index: 0 });
  const [sortKey, setSortKey] = useState("newest");
  const [filterKey, setFilterKey] = useState("all");
  const [loginHref, setLoginHref] = useState("/login");

  const isAdmin = isAdminEmail(currentUser?.email);
  const memberProfile = useMemo(
    () => getMemberProfile(currentUser),
    [currentUser],
  );

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length
      : 0;

  const ratingHistogram = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const n = Math.min(5, Math.max(1, Number(r.rating) || 5));
      counts[n] += 1;
    });
    return counts;
  }, [reviews]);

  const filteredSortedReviews = useMemo(() => {
    let list = [...reviews];
    if (filterKey === "media") {
      list = list.filter((r) => (r.media_urls || []).length > 0);
    } else if (filterKey === "5") {
      list = list.filter((r) => Number(r.rating) === 5);
    } else if (filterKey === "4plus") {
      list = list.filter((r) => Number(r.rating) >= 4);
    }
    if (sortKey === "highest") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortKey === "lowest") {
      list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return list;
  }, [reviews, filterKey, sortKey]);

  const fetchLikes = async (reviewIds, userId) => {
    if (!reviewIds.length) {
      setLikeCounts({});
      setLikedIds(new Set());
      return;
    }

    const { data, error } = await supabase
      .from("product_review_likes")
      .select("review_id, user_id")
      .in("review_id", reviewIds);

    if (error) {
      // likes 表尚未建立時不阻斷主流程
      clientWarn("product_review_likes:", error.message);
      return;
    }

    const counts = {};
    const mine = new Set();
    (data || []).forEach((row) => {
      counts[row.review_id] = (counts[row.review_id] || 0) + 1;
      if (userId && row.user_id === userId) mine.add(row.review_id);
    });
    setLikeCounts(counts);
    setLikedIds(mine);
  };

  const fetchReviews = async (userId = currentUser?.id) => {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      // 表尚未建立時不阻斷頁面（僅 console），避免露出 schema cache 錯誤
      if (/schema cache|does not exist|Could not find the table/i.test(error.message)) {
        clientWarn("product_reviews:", error.message);
        setReviews([]);
        setReplies({});
        setSubmitError("");
        return;
      }
      setSubmitError(error.message);
      return;
    }

    if (data) {
      const mainReviews = data.filter((r) => !r.parent_id);
      const replyData = data.filter((r) => r.parent_id);
      const replyMap = {};
      replyData.forEach((r) => {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = [];
        replyMap[r.parent_id].push(r);
      });
      setReviews(mainReviews);
      setReplies(replyMap);
      await fetchLikes(
        data.map((r) => r.id),
        userId,
      );
    }
  };

  useEffect(() => {
    if (!productId) return;

    const boot = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user || null;
      setIsLoggedIn(Boolean(user));
      setCurrentUser(user);
      await fetchReviews(user?.id);
    };
    boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setCurrentUser(session.user);
        fetchReviews(session.user.id);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setLikedIds(new Set());
        fetchReviews(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [productId]);

  useEffect(() => {
    return () => {
      media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
    };
  }, [media]);

  useEffect(() => {
    if (!router.isReady) return;
    setLoginHref(buildLoginUrl(router.asPath || "/"));
  }, [router.isReady, router.asPath]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    if (media.length + newFiles.length > MAX_MEDIA) {
      setSubmitError(`最多只能上傳 ${MAX_MEDIA} 個檔案`);
      e.target.value = "";
      return;
    }

    const validNewFiles = [];
    for (const file of newFiles) {
      const isVideo = file.type.startsWith("video/");
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setSubmitError(`「${file.name}」超過容量上限（圖片 5MB / 影片 50MB）`);
        e.target.value = "";
        return;
      }
      validNewFiles.push({ file, previewUrl: URL.createObjectURL(file) });
    }

    if (validNewFiles.length > 0) {
      setSubmitError("");
      setMedia((prev) => [...prev, ...validNewFiles]);
    }
    e.target.value = "";
  };

  const handleCancelFile = (indexToRemove) => {
    setMedia((prev) => {
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return prev.filter((_, i) => i !== indexToRemove);
    });
  };

  const uploadMedia = async (mediaItems) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("請先登入才能上傳媒體");
    }

    const formData = new FormData();
    formData.append("productId", productId);
    mediaItems.forEach((m) => formData.append("files", m.file));

    const res = await fetch("/api/product/reviews/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "檔案上傳失敗");
    }
    return data.urls || [];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!isLoggedIn || !currentUser) {
      setSubmitError("請先登入再發布評價");
      return;
    }
    if (!content.trim() || !title.trim()) {
      setSubmitError("請填寫標題與內容");
      return;
    }

    const contentErr = validateReviewContent({
      content,
      title,
      isReply: false,
    });
    if (contentErr) {
      setSubmitError(contentErr);
      return;
    }

    const remain = getCooldownRemainingMs(readCooldownAt(currentUser.id));
    if (remain > 0) {
      setSubmitError(formatCooldownMessage(remain));
      return;
    }

    setIsSubmitting(true);
    try {
      let mediaUrls = [];
      if (media.length > 0) {
        mediaUrls = await uploadMedia(media);
      }

      const { error } = await insertProductReview({
        product_id: productId,
        user_id: currentUser.id,
        user_name: memberProfile.name,
        user_avatar: memberProfile.avatar,
        title: title.trim(),
        content: content.trim(),
        rating,
        media_urls: mediaUrls,
        status: "approved",
      });

      if (error) throw new Error(error.message);

      writeCooldownAt(currentUser.id);
      setTitle("");
      setContent("");
      setRating(5);
      media.forEach((m) => URL.revokeObjectURL(m.previewUrl));
      setMedia([]);
      await fetchReviews(currentUser.id);
    } catch (err) {
      setSubmitError(err.message || "留言失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (e, parentId) => {
    e.preventDefault();
    setSubmitError("");

    if (!isLoggedIn || !currentUser) {
      setSubmitError("請先登入才能回覆");
      return;
    }
    if (!replyContent.trim()) {
      setSubmitError("請填寫回覆內容");
      return;
    }

    const contentErr = validateReviewContent({
      content: replyContent,
      isReply: true,
    });
    if (contentErr) {
      setSubmitError(contentErr);
      return;
    }

    const remain = getCooldownRemainingMs(readCooldownAt(currentUser.id));
    if (remain > 0) {
      setSubmitError(formatCooldownMessage(remain));
      return;
    }

    setIsReplying(true);
    const { error } = await insertProductReview({
      product_id: productId,
      parent_id: parentId,
      user_id: currentUser.id,
      user_name: memberProfile.name,
      user_avatar: memberProfile.avatar,
      content: replyContent.trim(),
      rating: 5,
      status: "approved",
    });
    setIsReplying(false);

    if (error) {
      setSubmitError(`回覆失敗: ${error.message}`);
    } else {
      writeCooldownAt(currentUser.id);
      setReplyingTo(null);
      setReplyContent("");
      fetchReviews(currentUser.id);
    }
  };

  const handleStartEdit = (review) => {
    setEditingId(review.id);
    setEditDraft({
      title: review.title || "",
      content: review.content || "",
      rating: review.rating || 5,
    });
    setReplyingTo(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDraft({ title: "", content: "", rating: 5 });
  };

  const handleSaveEdit = async (id) => {
    if (!editDraft.content.trim()) {
      setSubmitError("內容不可空白");
      return;
    }

    setIsSavingEdit(true);
    setSubmitError("");
    const { error } = await updateProductReview(id, {
      title: editDraft.title.trim() || null,
      content: editDraft.content.trim(),
      rating: editDraft.rating,
      is_edited: true,
      edited_at: new Date().toISOString(),
    });

    setIsSavingEdit(false);

    if (error) {
      setSubmitError(`儲存失敗: ${error.message}`);
      return;
    }

    handleCancelEdit();
    fetchReviews(currentUser?.id);
  };

  const handleToggleLike = async (reviewId) => {
    if (!isLoggedIn || !currentUser) return;

    const already = likedIds.has(reviewId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (already) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
    setLikeCounts((prev) => ({
      ...prev,
      [reviewId]: Math.max(0, (prev[reviewId] || 0) + (already ? -1 : 1)),
    }));

    if (already) {
      const { error } = await supabase
        .from("product_review_likes")
        .delete()
        .eq("review_id", reviewId)
        .eq("user_id", currentUser.id);
      if (error) {
        setSubmitError(error.message);
        fetchReviews(currentUser.id);
      }
    } else {
      const { error } = await supabase.from("product_review_likes").insert([
        { review_id: reviewId, user_id: currentUser.id },
      ]);
      if (error) {
        setSubmitError(error.message);
        fetchReviews(currentUser.id);
      }
    }
  };

  const handleDelete = async (id, isReply = false, targetMediaUrls = []) => {
    const confirmMsg = isReply
      ? "確定要刪除這則回覆嗎？"
      : "確定要刪除這則留言嗎？相關媒體與回覆也會一併移除。";
    if (!window.confirm(confirmMsg)) return;

    if (targetMediaUrls?.length > 0) {
      // 新上傳在 R2；舊檔可能在 Supabase Storage。刪留言以 DB 為主，媒體刪除失敗不阻擋。
      const filePaths = targetMediaUrls
        .map((url) => {
          const decoded = decodeURI(url);
          const parts = decoded.split("/review-media/");
          return parts.length > 1 ? parts[1] : null;
        })
        .filter(Boolean);

      if (filePaths.length > 0) {
        await supabase.storage.from("review-media").remove(filePaths);
      }
    }

    const { error } = await supabase.from("product_reviews").delete().eq("id", id);
    if (error) setSubmitError(`刪除失敗: ${error.message}`);
    else fetchReviews(currentUser?.id);
  };

  const listForDisplay = isNissin ? filteredSortedReviews : reviews;
  const visibleReviews = listForDisplay.slice(0, visibleCount);

  const openGalleryFor = (urls, index) => {
    setGallery({
      isOpen: true,
      items: urls.map((url) => ({
        type: isVideoUrl(url) ? "video" : "image",
        src: url,
        alt: "",
      })),
      index,
    });
  };

  const scrollToWriteForm = () => {
    document.getElementById("review-write-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section id="product-reviews" className="mt-14 pt-10 border-t border-slate-100">
      <MediaGalleryLightbox
        isOpen={gallery.isOpen}
        images={gallery.items}
        initialIndex={gallery.index}
        productName={productTitle}
        onClose={() => setGallery((g) => ({ ...g, isOpen: false }))}
        ariaLabel="評價媒體檢視"
      />

      <div className={`${isNissin ? "max-w-[960px]" : "max-w-[720px]"} mx-auto`}>
        {isNissin ? (
          <>
            {/* 評價摘要：大分數 + 直方圖 + 撰寫按鈕 */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10 mb-8 pb-8 border-b border-slate-100">
              <div className="shrink-0 text-center lg:text-left lg:min-w-[140px]">
                <p className="text-[28px] font-bold text-slate-900 tracking-tight leading-none">
                  {reviews.length ? avgRating.toFixed(1) : "—"}
                </p>
                <div className="mt-2 flex justify-center lg:justify-start">
                  <StarRow value={Math.round(avgRating) || 0} size={18} design={design} />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  來自 {reviews.length} 則評價
                </p>
              </div>

              <div className="flex-1 space-y-1.5 min-w-0">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingHistogram[star] || 0;
                  const pct =
                    reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={star} className="flex items-center gap-2.5">
                      <StarRow value={star} size={12} design={design} />
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B9EFF] transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-slate-400 tabular-nums">
                        ({count})
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="shrink-0 flex justify-center lg:justify-end">
                <button
                  type="button"
                  onClick={scrollToWriteForm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:border-[#0A6CD0] hover:text-[#0A6CD0] shadow-sm transition"
                >
                  <MaterialIcon name="edit" size={16} />
                  撰寫評價
                </button>
              </div>
            </div>

            {/* Tab + 篩選 + 排序 */}
            <div className="mb-4">
              <div className="border-b border-slate-200 flex items-end">
                <button
                  type="button"
                  className="px-1 pb-2.5 text-sm font-bold text-slate-900 border-b-2 border-slate-900 -mb-px"
                >
                  評價 {filteredSortedReviews.length}
                </button>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 shrink-0">篩選評價：</span>
                  {[
                    { id: "all", label: "全部" },
                    { id: "5", label: "5 星" },
                    { id: "4plus", label: "4 星以上" },
                    { id: "media", label: "含照片／影片" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setFilterKey(f.id);
                        setVisibleCount(5);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition ${
                        filterKey === f.id
                          ? "border-[#0A6CD0] text-[#0A6CD0] bg-sky-50"
                          : "border-slate-200 text-slate-600 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-slate-500 shrink-0">
                  排序
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value)}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0A6CD0]"
                  >
                    <option value="newest">最新</option>
                    <option value="highest">評分由高到低</option>
                    <option value="lowest">評分由低到高</option>
                  </select>
                </label>
              </div>
            </div>
          </>
        ) : (
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">商品評價</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRow value={Math.round(avgRating)} size={15} design={design} />
                <span className="text-sm font-bold text-slate-700">
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">（{reviews.length} 則）</span>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div className="mb-3 px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg text-center">
            {submitError}
          </div>
        )}

        <div
          className={
            isNissin
              ? "bg-white"
              : "bg-white rounded-lg border border-slate-200/80 divide-y divide-slate-100 px-4 sm:px-5"
          }
        >
          {listForDisplay.length === 0 ? (
            <div
              className={`py-12 text-center text-sm text-slate-400 ${
                isNissin ? "border-t border-slate-100" : ""
              }`}
            >
              {reviews.length === 0
                ? "目前還沒有評價，成為第一個分享體驗的人吧。"
                : "沒有符合篩選條件的評價。"}
            </div>
          ) : (
            visibleReviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                productTitle={productTitle}
                replyCount={replies[r.id]?.length || 0}
                replies={replies[r.id]}
                likeCount={likeCounts[r.id] || 0}
                likedByMe={likedIds.has(r.id)}
                currentUserId={currentUser?.id}
                memberProfile={memberProfile}
                isAdmin={isAdmin}
                isLoggedIn={isLoggedIn}
                loginHref={loginHref}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                isReplying={isReplying}
                editingId={editingId}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                isSavingEdit={isSavingEdit}
                onStartEdit={handleStartEdit}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onReplySubmit={handleReplySubmit}
                onDelete={handleDelete}
                onToggleLike={handleToggleLike}
                onOpenGallery={(i) => openGalleryFor(r.media_urls, i)}
                design={design}
              />
            ))
          )}
        </div>

        {listForDisplay.length > visibleCount && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + 5)}
            className={
              isNissin
                ? "mt-3 w-full py-3.5 rounded-full border border-slate-200 text-slate-700 text-sm font-bold hover:border-[#0A6CD0] hover:text-[#0A6CD0] transition-colors"
                : "mt-3 w-full py-3.5 rounded-xl bg-[#0A6CD0] text-white text-sm font-bold hover:bg-[#0959ad] transition-colors"
            }
          >
            {isNissin ? "查看更多評價" : "もっと見る"}
          </button>
        )}

        <div
          id="review-write-form"
          className={`${isNissin ? "mt-8 rounded-xl" : "mt-6 rounded-lg"} bg-white border border-slate-200/80 px-4 sm:px-5 py-5 scroll-mt-28`}
        >
          <p className="text-[15px] font-bold text-slate-800 mb-4">撰寫評價</p>

          {!isLoggedIn ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-4">
                登入後即可留下您的 eSIM 使用體驗、回覆與按讚
              </p>
              <Link
                href={loginHref}
                className="inline-block px-8 py-2.5 text-sm font-bold rounded-full bg-[#0A6CD0] text-white hover:bg-[#0959ad]"
              >
                登入撰寫評價
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <span className="text-[12px] text-slate-400 shrink-0">發佈為</span>
                <MemberChip
                  name={memberProfile.name}
                  avatar={memberProfile.avatar}
                  size={32}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-500 mb-1.5">
                  評分
                </label>
                <StarPicker
                  value={rating}
                  onChange={setRating}
                  size={30}
                  design={design}
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-500 mb-1.5">
                  標題
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A6CD0]"
                  placeholder="用一句話總結您的體驗"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-500 mb-1.5">
                  詳細內容
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:border-[#0A6CD0] resize-none"
                  placeholder="分享網速、訊號與使用情境…"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-500 mb-1.5">
                  上傳照片或影片
                </label>
                <p className="text-[11px] text-slate-400 mb-2">
                  最多 {MAX_MEDIA} 份 · 圖片 5MB / 影片 50MB
                </p>
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#E8F0FB] file:text-[#0A6CD0] file:text-xs file:font-bold"
                />

                {media.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                    {media.map((preview, i) => (
                      <div
                        key={i}
                        className="relative aspect-square rounded-md overflow-hidden bg-slate-100"
                      >
                        {preview.file.type.startsWith("video/") ? (
                          <video
                            src={preview.previewUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={preview.previewUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => handleCancelFile(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                          aria-label="移除檔案"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[160px] px-10 py-3 text-sm font-bold rounded-full bg-[#0A6CD0] text-white hover:bg-[#0959ad] disabled:opacity-50"
                >
                  {isSubmitting ? "上傳中…" : "發布評價"}
                </button>
              </div>
              <p className="text-center text-[11px] text-slate-400 leading-relaxed">
                為防止洗版：兩則留言至少間隔 60 秒；同一商品每天最多 3 則主評價；禁止重複／無意義內容。
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
