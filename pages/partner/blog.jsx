import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession, SITE_URL } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { slugifyTitle, uniquePostSlug, validatePartnerBlogMeta, sanitizePartnerBlogSlug, pingPartnerBlogRevalidate, partnerBlogSlugError } from "@/lib/partnerBlog";
import { mergeBlogCms } from "@/lib/partnerBlogCms";
import { PARTNER_UI } from "@/lib/partnerUi";
import { emptyItineraryBlock, isItineraryBlocks } from "@/lib/partnerBlogItinerary";
import { LineAppIconSvg } from "@/components/social/SocialBrandIcons";
import MaterialIcon from "@/components/MaterialIcon";
import MediaUploadField, {
  BlogBuilderMediaProvider,
} from "@/components/partner/blog-builder/MediaUploadField";
import PublishToggle from "@/components/partner/blog-builder/PublishToggle";
import PartnerContentDisclaimer from "@/components/legal/PartnerContentDisclaimer";

const EMPTY_FORM = {
  title: "",
  slug: "",
  excerpt: "",
  og_image_url: "",
  category_label: "",
  tags: "",
  author_name: "",
};

const PAGE_SIZE = 20;

function uniqueLabels(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list || []) {
    const s = String(raw || "").trim().slice(0, 40);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function formatWpDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const am = h < 12 ? "上午" : "下午";
  const hh = h % 12 || 12;
  return `${y}年 ${m}月 ${day}日 ${am} ${hh}:${min}`;
}

function tagList(tags) {
  if (Array.isArray(tags)) return tags.filter(Boolean);
  if (typeof tags === "string") {
    return tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * 夥伴自訂文章後台 — WordPress 式外層列表
 */
export default function PartnerBlogAdminPage() {
  const router = useRouter();
  const { store, partner } = usePartnerSession();
  const enabled = !!store?.blog_custom_enabled;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [createOpen, setCreateOpen] = useState(false);
  const [editorKind, setEditorKind] = useState("article");
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [bulk, setBulk] = useState("trash");
  const [uploadToken, setUploadToken] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [catModal, setCatModal] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const lineOaId = process.env.NEXT_PUBLIC_LINE_OA_ID || "@391huuts";
  const applyMessage = [
    "【申請開通】自訂文章加值",
    `夥伴名稱：${partner?.name || "（未填）"}`,
    `Email：${partner?.email || "（未填）"}`,
    `合作模式：${
      partner?.cooperation_model === "referral" ? "專屬連結" : "專屬商店"
    }`,
    `Slug／代碼：${partner?.slug || partner?.referral_code || "—"}`,
    "想開通後台「文章管理」自行發布原創內容，請協助審核開通。",
  ].join("\n");
  const lineApplyUrl = `https://line.me/R/oaMessage/${encodeURIComponent(
    lineOaId,
  )}/?${encodeURIComponent(applyMessage)}`;

  const loadPosts = async ({ silent = false } = {}) => {
    if (!store?.id) return;
    if (!silent) setLoading(true);
    const { data, error } = await supabase
      .from("store_blog_posts")
      .select("*")
      .eq("store_id", store.id)
      .order("updated_at", { ascending: false });
    if (!silent) setLoading(false);
    if (error) {
      console.error(error);
      if (!silent) setPosts([]);
      return;
    }
    setPosts(data || []);
    if (!silent) setSelected(new Set());
  };

  useEffect(() => {
    if (enabled) loadPosts();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, enabled]);

  useEffect(() => {
    setCatalog(mergeBlogCms(store?.blog_cms).categories || []);
  }, [store?.id, store?.blog_cms]);

  const counts = useMemo(() => {
    const all = posts.filter((p) => p.status !== "archived").length;
    const published = posts.filter((p) => p.status === "published").length;
    const draft = posts.filter((p) => p.status === "draft").length;
    const archived = posts.filter((p) => p.status === "archived").length;
    return { all, published, draft, archived };
  }, [posts]);

  const categories = useMemo(
    () => uniqueLabels([...catalog, ...posts.map((p) => p.category_label)]),
    [catalog, posts],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (tab === "all" && p.status === "archived") return false;
      if (tab === "published" && p.status !== "published") return false;
      if (tab === "draft" && p.status !== "draft") return false;
      if (tab === "archived" && p.status !== "archived") return false;
      if (category && p.category_label !== category) return false;
      if (!needle) return true;
      const tags = tagList(p.tags).join(" ");
      return `${p.title} ${p.slug} ${p.author_name || ""} ${tags} ${
        p.meta_keywords || ""
      }`
        .toLowerCase()
        .includes(needle);
    });
  }, [posts, tab, q, category]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, pages);
  const rows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tab, q, category]);

  useEffect(() => {
    if (!createOpen) return;
    supabase.auth.getSession().then(({ data }) => {
      setUploadToken(data.session?.access_token || "");
    });
  }, [createOpen]);

  const createCheck = validatePartnerBlogMeta(form, { requireImage: true });

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = {
        ...prev,
        [key]: key === "slug" ? sanitizePartnerBlogSlug(value) : value,
      };
      if (key === "title" && !prev.slug) {
        const auto = slugifyTitle(value);
        if (auto && !partnerBlogSlugError(auto)) next.slug = auto;
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!enabled) return;
    if (!store?.id) return alert("找不到店鋪");
    const check = validatePartnerBlogMeta(form, { requireImage: true });
    if (!check.ok) {
      return alert(Object.values(check.errors).join("\n"));
    }

    setSaving(true);
    const payload = {
      store_id: store.id,
      slug: check.slug,
      title: check.title,
      excerpt: form.excerpt.trim() || null,
      meta_description: form.excerpt.trim() || null,
      og_image_url: check.image,
      cover_image_url: check.image,
      category_label: form.category_label.trim() || null,
      tags: form.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      author_name: form.author_name.trim() || partner?.name || null,
      content_html: "",
      content_blocks:
        editorKind === "itinerary" ? [emptyItineraryBlock()] : [],
      status: "draft",
      published_at: null,
    };

    let { data, error } = await supabase
      .from("store_blog_posts")
      .insert([payload])
      .select("id")
      .single();

    if (error && /meta_description|content_blocks|column/i.test(error.message || "")) {
      const fallback = { ...payload };
      delete fallback.meta_description;
      delete fallback.content_blocks;
      ({ data, error } = await supabase
        .from("store_blog_posts")
        .insert([fallback])
        .select("id")
        .single());
    }

    setSaving(false);
    if (error) return alert("建立失敗：" + error.message);
    setForm(EMPTY_FORM);
    setCreateOpen(false);
    if (data?.id) router.push(`/partner/blog/edit/${data.id}`);
    else await loadPosts();
  };

  const pingRevalidateForPosts = async (rows) => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const domainPosts = Array.isArray(rows) ? rows : [];
    await Promise.all(
      domainPosts
        .map((p) => p?.slug)
        .filter(Boolean)
        .map((slug) => pingPartnerBlogRevalidate({ token, slug })),
    );
  };

  const applyStatusPatch = async (ids, patch) => {
    const { error } = await supabase
      .from("store_blog_posts")
      .update(patch)
      .in("id", ids);
    if (error) {
      alert(error.message);
      return false;
    }
    const touched = posts.filter((p) => ids.includes(p.id));
    await pingRevalidateForPosts(touched);
    await loadPosts({ silent: true });
    return true;
  };

  const setStatus = async (ids, status) => {
    const patch = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    return applyStatusPatch(ids, patch);
  };

  const toggleFrontPublish = async (post, nextOn) => {
    if (busyId) return;
    if (nextOn) {
      const check = validatePartnerBlogMeta(post, { requireImage: true });
      if (!check.ok) {
        alert(Object.values(check.errors).join("\n"));
        return;
      }
      const blocks = Array.isArray(post.content_blocks) ? post.content_blocks : [];
      const html = String(post.content_html || "").trim();
      if (!blocks.length && html.length < 20) {
        alert("請先編輯文章內容再發布到前台");
        return;
      }
    }
    const nextStatus = nextOn ? "published" : "draft";
    const patch = { status: nextStatus };
    if (nextOn) patch.published_at = post.published_at || new Date().toISOString();
    setBusyId(post.id);
    setPosts((prev) =>
      prev.map((row) =>
        row.id === post.id ? { ...row, ...patch } : row,
      ),
    );
    const ok = await applyStatusPatch([post.id], patch);
    if (!ok) {
      setPosts((prev) =>
        prev.map((row) =>
          row.id === post.id ? { ...row, status: post.status } : row,
        ),
      );
    }
    setBusyId(null);
  };

  const persistCatalog = async (next) => {
    if (!store?.id) return false;
    const cleaned = uniqueLabels(next);
    const { data: row, error: readErr } = await supabase
      .from("stores")
      .select("blog_cms")
      .eq("id", store.id)
      .single();
    if (readErr) {
      alert("分類儲存失敗：" + readErr.message);
      return false;
    }
    const blog_cms = {
      ...mergeBlogCms(row?.blog_cms),
      categories: cleaned,
    };
    const { error } = await supabase
      .from("stores")
      .update({ blog_cms })
      .eq("id", store.id);
    if (error) {
      alert("分類儲存失敗：" + error.message);
      return false;
    }
    setCatalog(cleaned);
    return true;
  };

  const handleCreateCategory = async () => {
    const label = newCat.trim().slice(0, 40);
    if (!label) return;
    if (categories.some((c) => c.toLowerCase() === label.toLowerCase())) {
      alert("此分類已存在");
      return;
    }
    setSavingCat(true);
    const ok = await persistCatalog([...catalog, label]);
    setSavingCat(false);
    if (ok) setNewCat("");
  };

  const setPostCategory = async (post, label) => {
    const next = String(label || "").trim() || null;
    if ((post.category_label || "") === (next || "")) return;
    setAssigningId(post.id);
    setPosts((prev) =>
      prev.map((row) =>
        row.id === post.id ? { ...row, category_label: next } : row,
      ),
    );
    const { error } = await supabase
      .from("store_blog_posts")
      .update({ category_label: next })
      .eq("id", post.id);
    if (error) {
      alert(error.message);
      await loadPosts({ silent: true });
    } else {
      await pingRevalidateForPosts([post]);
    }
    setAssigningId(null);
  };

  const handleDelete = async (ids) => {
    if (!confirm(`確定刪除 ${ids.length} 篇文章？此動作無法復原。`)) return;
    const { error } = await supabase.from("store_blog_posts").delete().in("id", ids);
    if (error) return alert(error.message);
    await loadPosts();
  };

  const runBulk = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (bulk === "trash") await setStatus(ids, "archived");
    else if (bulk === "draft") await setStatus(ids, "draft");
    else if (bulk === "delete") await handleDelete(ids);
  };

  const toggleAll = () => {
    if (rows.every((p) => selected.has(p.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((p) => p.id)));
    }
  };

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publicBlog = store ? `${SITE_URL}/p/${store.domain}/blog/` : null;
  const tabs = [
    { id: "all", label: "全部", count: counts.all },
    { id: "published", label: "已發布", count: counts.published },
    { id: "draft", label: "草稿", count: counts.draft },
    { id: "archived", label: "封存", count: counts.archived },
  ];

  return (
    <PartnerAdminLayout title="文章">
      <div className={PARTNER_UI.page}>
        {!enabled ? (
          <>
            <h1 className={PARTNER_UI.title}>文章</h1>
            <p className={PARTNER_UI.subtitle}>
              開通後可自行撰寫原創文章，SEO 正本在主站。
            </p>
            <div
              className="mt-5 bg-white border rounded-xl p-4 sm:p-6 shadow-sm"
              style={{
                borderColor: "rgba(250, 222, 43, 0.7)",
                background:
                  "linear-gradient(180deg, rgba(250,222,43,0.14) 0%, #fff 48%)",
              }}
            >
              <p className="text-sm font-black text-[#1E4AD1] mb-2">
                尚未開通「自訂文章」加值功能
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                目前 Blog 會自動同步主站內容。開通後可自行撰寫原創文章。請透過官方
                LINE 提出申請。
              </p>
              <PartnerContentDisclaimer variant="notice" className="mb-4" />
              <a
                href={lineApplyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black text-[#111] shadow-sm hover:brightness-95 transition"
                style={{ backgroundColor: "#FADE2B" }}
              >
                <LineAppIconSvg className="w-5 h-5" />
                透過官方 LINE 申請開通
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h1 className={PARTNER_UI.title}>文章</h1>
                <p className={PARTNER_UI.subtitle}>
                  管理標題、分類與發布。點標題進入視覺編輯器。
                </p>
                <PartnerContentDisclaimer variant="notice" className="mt-3 max-w-3xl" />
              </div>
              <div className="flex items-center gap-2">
                {publicBlog ? (
                  <a
                    href={publicBlog}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#1E4AD1] hover:underline"
                  >
                    查看前台
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setCatModal(true)}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 text-sm font-black hover:bg-slate-50"
                >
                  <MaterialIcon name="category" size={18} />
                  建立分類
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({
                      ...prev,
                      category_label: prev.category_label || categories[0] || "",
                    }));
                    setEditorKind("article");
                    setCreateOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[#1E4AD1] text-white text-sm font-black hover:bg-[#1344b5]"
                >
                  <MaterialIcon name="add" size={18} />
                  新增文章
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] mb-3">
              {tabs.map((t, i) => (
                <span key={t.id} className="inline-flex items-center gap-3">
                  {i > 0 ? <span className="text-slate-300">|</span> : null}
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`${
                      tab === t.id
                        ? "text-slate-900 font-black"
                        : "text-[#1E4AD1] hover:underline"
                    }`}
                  >
                    {t.label}{" "}
                    <span className="text-slate-400 font-normal">({t.count})</span>
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="trash">移至封存</option>
                  <option value="draft">設為草稿</option>
                  {tab === "archived" ? (
                    <option value="delete">永久刪除</option>
                  ) : null}
                </select>
                <button
                  type="button"
                  onClick={runBulk}
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50"
                >
                  套用
                </button>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">所有分類</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <form
                className="lg:ml-auto flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜尋文章"
                  className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52 bg-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm border border-slate-300 rounded bg-white hover:bg-slate-50"
                >
                  搜尋文章
                </button>
              </form>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] min-w-[860px]">
                  <thead className="bg-[#f0f0f1] text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="w-10 px-3 py-2">
                        <input
                          type="checkbox"
                          checked={rows.length > 0 && rows.every((p) => selected.has(p.id))}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="px-3 py-2 font-semibold">標題</th>
                      <th className="px-3 py-2 font-semibold w-28">作者</th>
                      <th className="px-3 py-2 font-semibold w-28">分類</th>
                      <th className="px-3 py-2 font-semibold w-36">標籤</th>
                      <th className="px-3 py-2 font-semibold w-36">前台發布</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                          載入中…
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-slate-400">
                          沒有文章。{" "}
                          <button
                            type="button"
                            className="text-[#1E4AD1] font-bold hover:underline"
                            onClick={() => setCreateOpen(true)}
                          >
                            新增一篇
                          </button>
                        </td>
                      </tr>
                    ) : (
                      rows.map((p) => {
                        const tags = tagList(p.tags);
                        const hasBuilder =
                          (Array.isArray(p.content_blocks) && p.content_blocks.length > 0) ||
                          String(p.content_html || "").length > 0;
                        const rowCats = uniqueLabels([
                          ...categories,
                          p.category_label,
                        ]);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-slate-100 hover:bg-[#f6f7f7] group"
                          >
                            <td className="px-3 py-3 align-top">
                              <input
                                type="checkbox"
                                checked={selected.has(p.id)}
                                onChange={() => toggleOne(p.id)}
                              />
                            </td>
                            <td className="px-3 py-3 align-top">
                              <Link
                                href={`/partner/blog/edit/${p.id}`}
                                className="font-semibold text-[#1E4AD1] hover:underline"
                              >
                                {p.title || "(無標題)"}
                              </Link>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {isItineraryBlocks(p.content_blocks)
                                  ? "— 行程規劃"
                                  : hasBuilder
                                    ? "— 視覺編輯器"
                                    : "— 尚未編輯內容"}
                              </p>
                              <div className="flex gap-2 mt-1 text-[12px] md:opacity-0 md:group-hover:opacity-100">
                                <Link
                                  href={`/partner/blog/edit/${p.id}`}
                                  className="text-[#1E4AD1] hover:underline"
                                >
                                  編輯
                                </Link>
                                {p.status === "published" && store?.domain ? (
                                  <Link
                                    href={`/p/${store.domain}/blog/${p.slug}/`}
                                    target="_blank"
                                    className="text-[#1E4AD1] hover:underline"
                                  >
                                    檢視
                                  </Link>
                                ) : null}
                                {p.status === "archived" ? (
                                  <button
                                    type="button"
                                    className="text-red-600 hover:underline"
                                    onClick={() => handleDelete([p.id])}
                                  >
                                    永久刪除
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-red-600 hover:underline"
                                    onClick={() => setStatus([p.id], "archived")}
                                  >
                                    封存
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top text-slate-600">
                              {p.author_name || partner?.name || "—"}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <select
                                value={p.category_label || ""}
                                disabled={assigningId === p.id}
                                onChange={(e) => setPostCategory(p, e.target.value)}
                                className="w-full min-w-[108px] max-w-[160px] border border-slate-200 rounded px-1.5 py-1 text-[12px] bg-white text-[#1E4AD1]"
                              >
                                <option value="">未分類</option>
                                {rowCats.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3 align-top text-slate-500">
                              {tags.length ? tags.join("、") : "—"}
                            </td>
                            <td className="px-3 py-3 align-top">
                              <div className="flex items-center gap-2">
                                <PublishToggle
                                  on={p.status === "published"}
                                  disabled={busyId === p.id}
                                  onChange={(next) => toggleFrontPublish(p, next)}
                                />
                                <span className="text-[11px] font-bold text-slate-600">
                                  {p.status === "published"
                                    ? "顯示"
                                    : p.status === "archived"
                                      ? "封存"
                                      : "隱藏"}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-1">
                                {formatWpDate(p.published_at || p.updated_at)}
                              </p>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-3 py-2 bg-[#f0f0f1] text-[12px] text-slate-600 border-t border-slate-200">
                <span>
                  {filtered.length} 個項目
                  {selected.size ? ` · 已選 ${selected.size}` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pageSafe <= 1}
                    onClick={() => setPage((n) => Math.max(1, n - 1))}
                    className="px-2 py-0.5 border border-slate-300 rounded bg-white disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <span>
                    {pageSafe} / {pages}
                  </span>
                  <button
                    type="button"
                    disabled={pageSafe >= pages}
                    onClick={() => setPage((n) => Math.min(pages, n + 1))}
                    className="px-2 py-0.5 border border-slate-300 rounded bg-white disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <BlogBuilderMediaProvider token={uploadToken} store={store}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-slate-800">新增文章</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-700">
                <MaterialIcon name="close" size={20} />
              </button>
            </div>
            <p className="text-[12px] text-slate-500 mb-3">
              先選編輯方式，再填標題、網址與精選圖。
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setEditorKind("article")}
                className={`text-left rounded-xl border p-3 ${
                  editorKind === "article"
                    ? "border-[#1E4AD1] bg-[#1E4AD1]/5 ring-1 ring-[#1E4AD1]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-[13px] font-black text-slate-800">一般文章</p>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  現有視覺編輯器，自由拖元件排版。
                </p>
              </button>
              <button
                type="button"
                onClick={() => setEditorKind("itinerary")}
                className={`text-left rounded-xl border p-3 ${
                  editorKind === "itinerary"
                    ? "border-[#e2498e] bg-[#e2498e]/5 ring-1 ring-[#e2498e]"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="text-[13px] font-black text-slate-800">行程規劃</p>
                <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                  按天／景點建立，前台有行程目錄。
                </p>
              </button>
            </div>
            <PartnerContentDisclaimer variant="notice" className="mb-4" />
            <label className="block mb-3">
              <span className="text-xs font-bold text-slate-600">標題 *</span>
              <input
                autoFocus
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={`mt-1 w-full border rounded-lg px-3 py-2.5 text-sm ${
                  createCheck.errors.title ? "border-rose-400" : "border-slate-200"
                }`}
              />
              {createCheck.errors.title ? (
                <span className="block mt-1 text-[11px] text-rose-600">{createCheck.errors.title}</span>
              ) : null}
            </label>
            <label className="block mb-3">
              <span className="text-xs font-bold text-slate-600">網址 slug *</span>
              <div className="mt-1 flex gap-1">
                <input
                  value={form.slug}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="url"
                  onChange={(e) => updateField("slug", e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono ${
                    createCheck.errors.slug ? "border-rose-400" : "border-slate-200"
                  }`}
                />
                <button
                  type="button"
                  className="shrink-0 px-2 rounded-lg border border-slate-200 text-[11px] font-bold"
                  onClick={() => updateField("slug", uniquePostSlug(form.title))}
                >
                  產生
                </button>
              </div>
              {createCheck.errors.slug ? (
                <span className="block mt-1 text-[11px] text-rose-600">{createCheck.errors.slug}</span>
              ) : (
                <span className="block text-[10px] text-slate-400 mt-1 break-all">
                  {store?.domain
                    ? `/p/${store.domain}/blog/${form.slug || "…"}/`
                    : "只能小寫英文、數字與連字號，避免空白與標點"}
                </span>
              )}
            </label>
            <div className="mb-3">
              <span className="text-xs font-bold text-slate-600">精選圖片 *</span>
              <div className="mt-1">
                <MediaUploadField
                  kind="image"
                  variant="light"
                  value={form.og_image_url}
                  onUploaded={(url) => updateField("og_image_url", url)}
                />
              </div>
              {createCheck.errors.image ? (
                <span className="block text-[11px] text-rose-600">{createCheck.errors.image}</span>
              ) : null}
            </div>
            <label className="block mb-3">
              <span className="text-xs font-bold text-slate-600">SEO 描述（選填）</span>
              <textarea
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                rows={2}
                maxLength={160}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label>
                <span className="text-xs font-bold text-slate-600">分類</span>
                <select
                  value={form.category_label}
                  onChange={(e) => updateField("category_label", e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">未分類</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {categories.length === 0 ? (
                  <span className="block mt-1 text-[11px] text-slate-400">
                    尚未建立分類，可先按「建立分類」
                  </span>
                ) : null}
              </label>
              <label>
                <span className="text-xs font-bold text-slate-600">作者</span>
                <input
                  value={form.author_name}
                  onChange={(e) => updateField("author_name", e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                  placeholder={partner?.name || ""}
                />
              </label>
            </div>
            <label className="block mb-4">
              <span className="text-xs font-bold text-slate-600">標籤（逗號分隔）</span>
              <input
                value={form.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200"
              >
                取消
              </button>
              <button
                type="button"
                disabled={saving || !createCheck.ok}
                onClick={handleCreate}
                className="px-4 py-2 text-sm font-black rounded-lg bg-[#1E4AD1] text-white disabled:opacity-50"
              >
                {saving ? "建立中…" : "建立並進入編輯器"}
              </button>
            </div>
          </div>
          </BlogBuilderMediaProvider>
        </div>
      ) : null}

      {catModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-black text-slate-800">建立分類</h2>
              <button
                type="button"
                onClick={() => setCatModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <MaterialIcon name="close" size={20} />
              </button>
            </div>
            <p className="text-[12px] text-slate-500 mb-3">
              建立後可在文章列表用下拉選單指定分類。
            </p>
            <div className="flex gap-2 mb-4">
              <input
                autoFocus
                value={newCat}
                maxLength={40}
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                placeholder="例如：泰國、攻略、eSIM"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
              <button
                type="button"
                disabled={savingCat || !newCat.trim()}
                onClick={handleCreateCategory}
                className="px-4 py-2 text-sm font-black rounded-lg bg-[#1E4AD1] text-white disabled:opacity-50"
              >
                {savingCat ? "新增中…" : "新增"}
              </button>
            </div>
            {categories.length ? (
              <ul className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <li
                    key={c}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-[12px] font-bold text-slate-700"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-slate-400">尚無分類</p>
            )}
          </div>
        </div>
      ) : null}
    </PartnerAdminLayout>
  );
}
