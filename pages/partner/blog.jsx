import { useEffect, useState } from "react";
import Link from "next/link";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import { usePartnerSession, SITE_URL } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { slugifyTitle } from "@/lib/partnerBlog";
import { PARTNER_UI } from "@/lib/partnerUi";

/**
 * 夥伴自訂文章後台（需 stores.blog_custom_enabled = true）
 */
export default function PartnerBlogAdminPage() {
  const { store, partner } = usePartnerSession();
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
      <div className={PARTNER_UI.page}>
      <div className="mb-5 sm:mb-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className={PARTNER_UI.title}>文章管理</h1>
          <p className={PARTNER_UI.subtitle}>
            發布後店內可完整閱讀；同時同步主站／blog（標「合作夥伴供稿」），SEO
            正本在主站
          </p>
        </div>
        {publicBlog ? (
          <a
            href={publicBlog}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center min-h-10 px-3 text-xs font-bold text-[#1E4AD1] hover:underline self-start sm:self-auto"
          >
            查看前台 Blog →
          </a>
        ) : null}
      </div>

      {!enabled ? (
        <div
          className="bg-white border rounded-xl p-4 sm:p-6 shadow-sm"
          style={{
            borderColor: "rgba(250, 222, 43, 0.7)",
            background:
              "linear-gradient(180deg, rgba(250,222,43,0.14) 0%, #fff 48%)",
          }}
        >
          <p className="text-sm font-black text-[#1E4AD1] mb-2">
            尚未開通「自訂文章」加值功能
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            目前 Blog 會自動同步主站內容。開通後可自行撰寫原創文章，在內容裡嵌入您的
            IG／社群、商品連結或專屬優惠碼，把流量轉成訂單與分潤，與 Jeko
            雙向互贏。請透過官方 LINE 提出申請，後台可一鍵開通（可視方案額外收費）。
          </p>
          <p className="text-xs font-black text-slate-700 mb-2">開通後你可以這樣用</p>
          <ul className="text-xs text-slate-500 list-disc pl-5 space-y-1.5 mb-5">
            <li>
              <span className="font-bold text-slate-700">自編內容、提升曝光</span>
              — 用你的口吻寫旅遊攻略／eSIM 教學，累積搜尋與分享流量
            </li>
            <li>
              <span className="font-bold text-slate-700">嵌入 IG 或其他社群</span>
              — 文內放個人／品牌連結，讀者逛完文章再追蹤你，流量雙向互導
            </li>
            <li>
              <span className="font-bold text-slate-700">放入商品連結</span>
              — 直接導向你賣場方案，縮短路徑、提高轉換
            </li>
            <li>
              <span className="font-bold text-slate-700">放上專屬優惠碼</span>
              — 讀者用你的碼下單，分潤更清楚、也更好追蹤成效
            </li>
            <li>
              發布後同步出現在主站 Blog（標示「合作夥伴供稿」）；店內仍可完整閱讀，SEO
              正本在主站
            </li>
            <li>連結夥伴、專屬商店夥伴皆可申請；相同 slug 若主站已有文，以主站為準</li>
          </ul>
          <a
            href={lineApplyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-sm font-black text-[#111] shadow-sm hover:brightness-95 transition"
            style={{ backgroundColor: "#FADE2B" }}
          >
            <span className="w-5 h-5 rounded-full bg-[#06C755] text-white text-[10px] font-black inline-flex items-center justify-center">
              L
            </span>
            透過官方 LINE 申請開通
          </a>
          <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
            送出後請稍候客服回覆。管理員於「夥伴審核」看到您的申請後，即可一鍵開通。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-800">
              新增／更新文章
            </h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <label className="text-xs font-bold text-slate-600">
                作者名稱
              </label>
              <input
                value={form.author_name}
                onChange={(e) => updateField("author_name", e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">
                作者簡介
              </label>
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
              className="bg-[#1E4AD1] text-white font-bold px-6 py-2.5 rounded-lg hover:bg-[#1344b5] disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存文章"}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
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
                          className="text-[#1E4AD1] hover:underline"
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
      </div>
    </PartnerAdminLayout>
  );
}
