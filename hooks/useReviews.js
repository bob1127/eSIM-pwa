"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const MAX_IMAGES = 4;
const MAX_VIDEOS = 1;
const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 50;
const ALLOWED_IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEOS = ["video/mp4", "video/quicktime", "video/webm"];

export { MAX_IMAGES, MAX_VIDEOS, MAX_IMAGE_MB, MAX_VIDEO_MB };

function getAuthHeader(session) {
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}

/** 主 hook：傳入文章 slug + Supabase session */
export function useReviews({ slug, session }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── 讀取評論 ────────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const authHeader = getAuthHeader(session);
      const res = await fetch(`/api/blog/reviews?slug=${encodeURIComponent(slug)}`, {
        headers: authHeader ? { Authorization: authHeader } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "無法載入評論");
      }
      setReviews(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [slug, session]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ── 送出評論／回覆 ──────────────────────────────────────────
  const submitReview = useCallback(
    async ({ rating, content, mediaIds = [], parentId = null }) => {
      const authHeader = getAuthHeader(session);
      if (!authHeader) throw new Error("請先登入");
      const res = await fetch(`/api/blog/reviews?slug=${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ rating, content, mediaIds, parentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "送出失敗");
      setReviews((prev) => [body, ...prev]);
      return body;
    },
    [slug, session],
  );

  // ── 按讚 / 退讚 ─────────────────────────────────────────────
  const toggleLike = useCallback(
    async (reviewId, currentlyLiked) => {
      const authHeader = getAuthHeader(session);
      if (!authHeader) throw new Error("請先登入才能按讚");

      const method = currentlyLiked ? "DELETE" : "POST";
      const res = await fetch(`/api/blog/reviews/${reviewId}/like`, {
        method,
        headers: { Authorization: authHeader },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "操作失敗");

      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, likes: body.likes, is_liked_by_me: body.is_liked_by_me }
            : r,
        ),
      );
    },
    [session],
  );

  return { reviews, loading, error, submitReview, toggleLike, refetch: fetchReviews };
}

/** 媒體上傳 hook */
export function useReviewUpload({ session }) {
  const [pendingMedia, setPendingMedia] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const validateAndUpload = useCallback(
    async (fileList) => {
      setUploadError(null);
      const files = Array.from(fileList);

      const images = files.filter((f) => ALLOWED_IMAGES.includes(f.type));
      const videos = files.filter((f) => ALLOWED_VIDEOS.includes(f.type));
      const invalid = files.filter(
        (f) => !ALLOWED_IMAGES.includes(f.type) && !ALLOWED_VIDEOS.includes(f.type),
      );

      const currentImages = pendingMedia.filter((m) => m.media_type === "image");
      const currentVideos = pendingMedia.filter((m) => m.media_type === "video");

      if (invalid.length > 0) {
        setUploadError(`不支援的格式：${invalid.map((f) => f.name).join(", ")}`);
        return;
      }
      if (currentImages.length + images.length > MAX_IMAGES) {
        setUploadError(`圖片最多 ${MAX_IMAGES} 張（目前已有 ${currentImages.length} 張）`);
        return;
      }
      if (currentVideos.length + videos.length > MAX_VIDEOS) {
        setUploadError(`影片最多 ${MAX_VIDEOS} 個`);
        return;
      }
      for (const f of images) {
        if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
          setUploadError(`「${f.name}」超過 ${MAX_IMAGE_MB} MB`);
          return;
        }
      }
      for (const f of videos) {
        if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
          setUploadError(`「${f.name}」超過 ${MAX_VIDEO_MB} MB`);
          return;
        }
      }

      const authHeader = getAuthHeader(session);
      if (!authHeader) { setUploadError("請先登入"); return; }

      setUploading(true);
      try {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        const res = await fetch("/api/blog/reviews/upload", {
          method: "POST",
          headers: { Authorization: authHeader },
          body: formData,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "上傳失敗");
        setPendingMedia((prev) => [...prev, ...body]);
      } catch (e) {
        setUploadError(e.message);
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [session, pendingMedia],
  );

  const removeMedia = (id) => setPendingMedia((prev) => prev.filter((m) => m.id !== id));
  const clearMedia = () => setPendingMedia([]);

  return {
    pendingMedia,
    uploading,
    uploadError,
    inputRef,
    validateAndUpload,
    removeMedia,
    clearMedia,
  };
}
