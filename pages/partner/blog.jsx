import { useEffect, useState } from "react";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession, SITE_URL } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { slugifyTitle } from "@/lib/partnerBlog";

/**
 * 夥伴自訂文章後台（需 stores.blog_custom_enabled = true）
 */
export default function PartnerBlogAdminPage() {
  const { store } = usePartnerSession();
  const enabled = !!store?.blog_custom_enabled;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content_html: "",
    cover_image_url: "",
    category_label: "TRAVEL",
    tags: "",
    author_name: "",
    author_bio: "",
    status: "draft",
  });

  const loadPosts = async () => {
    if (!store?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("store_blog_posts")
      .select("*")
      .eq("store_id", store.id)
      .order("updated_at", { ascending: false });
    setLoading(false);
    if (error) {
      console.error(error);
      setPosts([]);
      return;
    }
    setPosts(data || []);
  };

  useEffect(() => {
    if (enabled) loadPosts();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store?.id, enabled]);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !prev.slug) {
        next.slug = slugifyTitle(value);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!enabled) return;
    if (!form.title.trim()) return alert("請填標題");
    if (!store?.id) return alert("找不到店鋪");

    const slug = (form.slug || slugifyTitle(form.title)).trim();
    if (!slug) return alert("請填 slug");

    setSaving(true);
    const payload = {
      store_id: store.id,
      slug,
      title: form.title.trim(),
      excerpt: form.excerpt.trim() || null,
      content_html: form.content_html || "",
      cover_image_url: form.cover_image_url.trim() || null,
      category_label: form.category_label.trim() || "TRAVEL",
      tags: form.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      author_name: form.author_name.trim() || null,
      author_bio: form.author_bio.trim() || null,
      status: form.status,
      published_at:
        form.status === "published" ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("store_blog_posts").upsert(payload, {
      onConflict: "store_id,slug",
    });
    setSaving(false);
    if (error) return alert("儲存失敗：" + error.message);

    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content_html: "",
      cover_image_url: "",
      category_label: "TRAVEL",
      tags: "",
      author_name: "",
      author_bio: "",
      status: "draft",
    });
    await loadPosts();
    alert("已儲存");
  };

  const handleDelete = async (id) => {
    if (!confirm("確定刪除這篇文章？")) return;
    const { error } = await supabase
      .from("store_blog_posts")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadPosts();
  };

  const publicBlog = store ? `${SITE_URL}/p/${store.domain}/blog/` : null;

  return (
    <PartnerAdminLayout title="文章管理">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">文章管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            預設顯示主站 WordPress 文章；開通加值後可額外發布原創內容
          </p>
        </div>
        {publicBlog ? (
          <a
            href={publicBlog}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-[#1a56db] hover:underline"
          >
            查看前台 Blog →
          </a>
        ) : null}
      </div>

      {!enabled ? (
        <div className="bg-white border border-amber-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm font-bold text-amber-800 mb-2">
            尚未開通「自訂文章」加值功能
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            目前賣場 Blog 會自動同步主站 WordPress 內容（免費）。若需要自己新增／編輯文章，請聯繫
            Jeko 開通 <code className="bg-slate-100 px-1 rounded">blog_custom_enabled</code>
            （可視方案額外收費）。
          </p>
          <ul className="text-xs text-slate-500 list-disc pl-5 space-y-1">
            <li>開通後可在此後台建立草稿／發布文章</li>
            <li>前台會顯示：主站 WP 文章 ＋ 您的原創文章</li>
            <li>相同 slug 時，您的原創文章會覆蓋主站同 slug 內容</li>
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-800">新增／更新文章</h2>
            <div>
              <label className="text-xs font-bold text-slate-600">標題 *</label>
              <input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                URL Slug *
              </label>
              <input
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono"
                placeholder="my-japan-trip"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">摘要</label>
              <textarea
                value={form.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                rows={2}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                封面圖 URL
              </label>
              <input
                value={form.cover_image_url}
                onChange={(e) => updateField("cover_image_url", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">分類</label>
                <input
                  value={form.category_label}
                  onChange={(e) =>
                    updateField("category_label", e.target.value)
                  }
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">狀態</label>
                <select
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="draft">草稿</option>
                  <option value="published">發布</option>
                  <option value="archived">封存</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                標籤（逗號分隔）
              </label>
              <input
                value={form.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="日本, eSIM, 攻略"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">作者名稱</label>
              <input
                value={form.author_name}
                onChange={(e) => updateField("author_name", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">作者簡介</label>
              <textarea
                value={form.author_bio}
                onChange={(e) => updateField("author_bio", e.target.value)}
                rows={2}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                內文 HTML
              </label>
              <textarea
                value={form.content_html}
                onChange={(e) => updateField("content_html", e.target.value)}
                rows={10}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono resize-y"
                placeholder="<p>文章內容…</p>"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="bg-[#1a3a6b] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#1344b5] disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存文章"}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 mb-3">我的文章</h2>
            {loading ? (
              <p className="text-sm text-slate-400">載入中…</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-slate-400">尚無自訂文章</p>
            ) : (
              <ul className="space-y-3">
                {posts.map((p) => (
                  <li
                    key={p.id}
                    className="border border-slate-100 rounded-lg p-3"
                  >
                    <p className="text-sm font-bold text-slate-800 line-clamp-2">
                      {p.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      {p.slug} · {p.status}
                    </p>
                    <div className="mt-2 flex gap-3 text-xs font-bold">
                      {p.status === "published" ? (
                        <Link
                          href={`/p/${store.domain}/blog/${p.slug}/`}
                          className="text-[#1a56db] hover:underline"
                          target="_blank"
                        >
                          前台
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </PartnerAdminLayout>
  );
}
