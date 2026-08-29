import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { usePartnerSession, SITE_URL } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import {
  parseContentBlocks,
  sanitizeBlocks,
  blocksToHtml,
  newBlockId,
} from "@/lib/partnerBlogBlocks";
import { validatePartnerBlogMeta, pingPartnerBlogRevalidate } from "@/lib/partnerBlog";
import {
  BLOG_VIDEO_MAX_PER_POST,
  countBlogUploadedVideos,
} from "@/lib/partnerBlogMedia";
import PartnerBlogElementorEditor from "@/components/partner/blog-builder/PartnerBlogElementorEditor";
import PartnerBlogItineraryEditor from "@/components/partner/blog-builder/PartnerBlogItineraryEditor";
import { isItineraryBlocks, ensureItineraryBlocks, firstItineraryImage, getItineraryProps } from "@/lib/partnerBlogItinerary";
import { itineraryDestinationsMissing } from "@/lib/itineraryAffiliate";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const EMPTY_META = {
  title: "",
  slug: "",
  excerpt: "",
  meta_description: "",
  meta_keywords: "",
  og_title: "",
  og_image_url: "",
  category_label: "TRAVEL",
  tags: "",
  author_name: "",
};

const LOCAL_DRAFT_MAX_MS = 7 * 24 * 60 * 60 * 1000;

function fingerprint(blocks, meta) {
  return JSON.stringify({ blocks, meta });
}

function draftKey(id) {
  return `jeko-partner-blog-draft:${id}`;
}

function metaFromRow(data) {
  return {
    title: data.title || "",
    slug: data.slug || "",
    excerpt: data.excerpt || "",
    meta_description: data.meta_description || data.excerpt || "",
    meta_keywords: data.meta_keywords || "",
    og_title: data.og_title || "",
    og_image_url: data.og_image_url || data.cover_image_url || "",
    category_label: data.category_label || "TRAVEL",
    tags: Array.isArray(data.tags) ? data.tags.join(", ") : data.tags || "",
    author_name: data.author_name || "",
  };
}

function blocksFromRow(data) {
  const parsed = parseContentBlocks(data.content_blocks);
  if (!parsed.length && data.content_html) {
    return [
      {
        id: newBlockId(),
        type: "html",
        props: { html: data.content_html },
      },
    ];
  }
  return parsed;
}

export default function PartnerBlogEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const { store, loading: sessionLoading } = usePartnerSession();
  const enabled = !!store?.blog_custom_enabled;
  const [post, setPost] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [meta, setMeta] = useState(EMPTY_META);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveHint, setSaveHint] = useState("");
  const [restoreOffer, setRestoreOffer] = useState(null);
  const savedFp = useRef("");
  const dirtyRef = useRef(false);
  const skipRouteGuard = useRef(false);
  const savingRef = useRef(false);
  const loadedRef = useRef(false);

  const dirty = useMemo(() => {
    if (!loadedRef.current) return false;
    return fingerprint(blocks, meta) !== savedFp.current;
  }, [blocks, meta]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!store?.id || !id || typeof id !== "string") return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("store_blog_posts")
        .select("*")
        .eq("id", id)
        .eq("store_id", store.id)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message || "找不到文章");
        return;
      }
      const nextMeta = metaFromRow(data);
      const nextBlocks = blocksFromRow(data);
      setPost(data);
      setMeta(nextMeta);
      setBlocks(nextBlocks);
      savedFp.current = fingerprint(nextBlocks, nextMeta);
      loadedRef.current = true;

      try {
        const raw = localStorage.getItem(draftKey(id));
        if (!raw) return;
        const local = JSON.parse(raw);
        if (!local?.ts || !local.meta) return;
        if (Date.now() - local.ts > LOCAL_DRAFT_MAX_MS) {
          localStorage.removeItem(draftKey(id));
          return;
        }
        const serverTs = Date.parse(data.updated_at || data.created_at || 0) || 0;
        if (local.ts > serverTs + 2000 && fingerprint(local.blocks || [], local.meta) !== savedFp.current) {
          setRestoreOffer(local);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store?.id, id]);

  useEffect(() => {
    const onUnload = (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  useEffect(() => {
    const onStart = () => {
      if (skipRouteGuard.current || !dirtyRef.current) return;
      const ok = window.confirm("有尚未儲存的變更，確定要離開？未儲存的內容會遺失。");
      if (!ok) {
        router.events.emit("routeChangeError");
        // eslint-disable-next-line no-throw-literal
        throw "Abort route change";
      }
    };
    router.events.on("routeChangeStart", onStart);
    return () => router.events.off("routeChangeStart", onStart);
  }, [router.events]);

  const persist = useCallback(
    async (nextStatus, { silent = false } = {}) => {
      if (!post?.id || !store?.id) return false;
      if (savingRef.current) return false;
      const itinerary = isItineraryBlocks(blocks);
      const coverGuess = itinerary
        ? firstItineraryImage(blocks)
        : "";
      const metaForVal = {
        ...meta,
        og_image_url:
          meta.og_image_url || post.cover_image_url || coverGuess || "",
      };
      const { ok, errors, title, slug, image } = validatePartnerBlogMeta(
        metaForVal,
        { requireImage: nextStatus === "published" },
      );
      if (!ok) {
        if (!silent) alert(Object.values(errors).join("\n"));
        setSaveHint(Object.values(errors)[0] || "無法更新");
        return false;
      }
      const clean = itinerary
        ? ensureItineraryBlocks(blocks)
        : sanitizeBlocks(blocks);
      const uploadedVideoCount = countBlogUploadedVideos(clean);
      if (uploadedVideoCount > BLOG_VIDEO_MAX_PER_POST) {
        const msg = `每篇文章最多上傳 ${BLOG_VIDEO_MAX_PER_POST} 支本機影片（YouTube／Vimeo 嵌入不限）`;
        if (!silent) alert(msg);
        setSaveHint(msg);
        return false;
      }
      if (
        itinerary &&
        nextStatus === "published" &&
        itineraryDestinationsMissing(getItineraryProps(clean))
      ) {
        if (!silent) {
          alert("請先選擇至少一個行程地區。");
        }
        setSaveHint("請選擇行程地區");
        return false;
      }
      if (nextStatus === "published" && !clean.length) {
        if (!silent) alert("請先加入至少一個元件再發布");
        setSaveHint("請先加入內容再更新");
        return false;
      }

      savingRef.current = true;
      setSaving(true);
      const status = nextStatus || post.status || "draft";
      const tags = String(meta.tags || "")
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const ogImage = image || coverGuess || null;
      const payload = {
        content_blocks: clean,
        content_html: blocksToHtml(clean),
        status,
        published_at:
          status === "published"
            ? post.published_at || new Date().toISOString()
            : post.published_at,
        title,
        slug,
        excerpt: (meta.excerpt || "").trim() || null,
        meta_description:
          (meta.meta_description || meta.excerpt || "").trim() || null,
        meta_keywords: (meta.meta_keywords || "").trim() || null,
        og_title: (meta.og_title || "").trim() || null,
        og_image_url: ogImage,
        cover_image_url: ogImage || post.cover_image_url || null,
        category_label: (meta.category_label || "").trim() || "TRAVEL",
        tags,
        author_name: (meta.author_name || "").trim() || null,
      };
      try {
        let { error } = await supabase
          .from("store_blog_posts")
          .update(payload)
          .eq("id", post.id)
          .eq("store_id", store.id);
        if (
          error &&
          /meta_description|meta_keywords|og_title|og_image|column/i.test(
            error.message || "",
          ) &&
          !/content_blocks/i.test(error.message || "")
        ) {
          const fallback = { ...payload };
          delete fallback.meta_description;
          delete fallback.meta_keywords;
          delete fallback.og_title;
          delete fallback.og_image_url;
          ({ error } = await supabase
            .from("store_blog_posts")
            .update(fallback)
            .eq("id", post.id)
            .eq("store_id", store.id));
        }
        if (error) {
          if (!silent) alert("儲存失敗：" + error.message);
          setSaveHint("儲存失敗：" + error.message);
          return false;
        }
        const oldSlug = post.slug;
        const nextMeta = {
          ...meta,
          slug,
          title,
          og_image_url: ogImage || meta.og_image_url || "",
        };
        // 以實際寫入內容對齊指紋，避免 sanitize 後左側仍顯示「未儲存」
        setBlocks(clean);
        setMeta(nextMeta);
        setPost((prev) => ({ ...prev, ...payload }));
        savedFp.current = fingerprint(clean, nextMeta);
        try {
          localStorage.removeItem(draftKey(post.id));
        } catch {
          /* ignore */
        }
        if (status === "published") {
          const firstPublish = !post.published_at;
          const { data: sessionData } = await supabase.auth.getSession();
          pingPartnerBlogRevalidate({
            token: sessionData?.session?.access_token,
            slug,
            oldSlug,
            title,
            notifyFollowers: firstPublish,
          }).catch(() => {});
        }
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        setSaveHint(
          silent
            ? `已自動儲存 ${hh}:${mm}`
            : status === "published"
              ? `已更新發布 ${hh}:${mm}`
              : `已儲存 ${hh}:${mm}`,
        );
        return true;
      } catch (err) {
        const msg = err?.message || String(err);
        if (!silent) alert("儲存失敗：" + msg);
        setSaveHint("儲存失敗：" + msg);
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [post, store?.id, meta, blocks],
  );

  // 本機備份
  useEffect(() => {
    if (!dirty || !post?.id || !loadedRef.current) return;
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          draftKey(post.id),
          JSON.stringify({ ts: Date.now(), blocks, meta }),
        );
      } catch {
        /* ignore quota */
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [dirty, blocks, meta, post?.id]);

  // 自動存草稿（已發布則只更新內容、維持 published）
  useEffect(() => {
    if (!dirty || !post?.id) return;
    const t = window.setTimeout(() => {
      persist(post.status === "published" ? "published" : "draft", {
        silent: true,
      });
    }, 25000);
    return () => window.clearTimeout(t);
  }, [dirty, blocks, meta, post?.id, post?.status, persist]);

  const leaveToList = () => {
    skipRouteGuard.current = true;
    dirtyRef.current = false;
    router.push("/partner/blog");
  };

  if (sessionLoading) {
    return (
      <div className="p-8">
        <LoadingIndicator label="載入中…" />
      </div>
    );
  }
  if (!enabled) {
    return <p className="p-8 text-sm text-slate-500">尚未開通自訂文章</p>;
  }
  if (loadError) {
    return <p className="p-8 text-sm text-red-500">{loadError}</p>;
  }
  if (!post) {
    return (
      <div className="p-8">
        <LoadingIndicator label="載入文章…" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {dirty ? "* " : ""}編輯：{meta.title || post.title}
        </title>
      </Head>
      {restoreOffer ? (
        <div className="fixed top-14 left-1/2 z-[9999] -translate-x-1/2 max-w-md w-[90%] rounded-xl bg-[#1f2124] border border-white/10 text-white p-4 shadow-2xl">
          <p className="text-sm font-black">發現本機未儲存備份</p>
          <p className="text-[12px] mt-1.5 text-white/55 leading-relaxed">
            存在這台瀏覽器裡的草稿，不是伺服器連線。上次可能還沒按儲存就離開，要還原到畫布嗎？
          </p>
          <div className="flex gap-2 mt-3 justify-end">
            <button
              type="button"
              className="text-[11px] font-bold px-3 py-1.5 rounded bg-white/10 hover:bg-white/15"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey(post.id));
                } catch {
                  /* ignore */
                }
                setRestoreOffer(null);
              }}
            >
              丟掉備份
            </button>
            <button
              type="button"
              className="text-[11px] font-black px-3 py-1.5 rounded bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => {
                setBlocks(restoreOffer.blocks || []);
                setMeta({ ...EMPTY_META, ...restoreOffer.meta });
                setRestoreOffer(null);
              }}
            >
              還原
            </button>
          </div>
        </div>
      ) : null}
      {isItineraryBlocks(blocks) ? (
        <PartnerBlogItineraryEditor
          title={meta.title || post.title}
          blocks={blocks}
          onChangeBlocks={setBlocks}
          store={store}
          meta={meta}
          onChangeMeta={setMeta}
          dirty={dirty}
          saveHint={saveHint}
          saving={saving}
          status={post.status}
          previewHref={
            post.status === "published" && store?.domain
              ? `${SITE_URL}/p/${store.domain}/blog/${meta.slug || post.slug}/`
              : null
          }
          onBack={leaveToList}
          onSave={() => persist(post.status === "published" ? "published" : "draft")}
          onPublish={() => persist("published")}
          onUnpublish={() => persist("draft")}
        />
      ) : (
        <PartnerBlogElementorEditor
          postId={post.id}
          title={meta.title || post.title}
          blocks={blocks}
          onChangeBlocks={setBlocks}
          store={store}
          meta={meta}
          onChangeMeta={setMeta}
          dirty={dirty}
          saveHint={saveHint}
          saving={saving}
          status={post.status}
          previewHref={
            post.status === "published" && store?.domain
              ? `${SITE_URL}/p/${store.domain}/blog/${meta.slug || post.slug}/`
              : null
          }
          onBack={leaveToList}
          onSave={() => persist(post.status === "published" ? "published" : "draft")}
          onPublish={() => persist("published")}
          onUnpublish={() => persist("draft")}
        />
      )}
    </>
  );
}
