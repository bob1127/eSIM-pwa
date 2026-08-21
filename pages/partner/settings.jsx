import { useState, useEffect, useRef } from "react";
import PartnerAdminLayout from "@/components/partner/PartnerAdminLayout";
import SmartStoreSetupWizard from "@/components/partner/SmartStoreSetupWizard";
import { usePartnerSession, SITE_URL } from "@/lib/partnerAuth";
import { supabase } from "@/lib/supabaseClient";
import { PARTNER_UI } from "@/lib/partnerUi";
import {
  ArrowTopRightOnSquareIcon,
  DocumentDuplicateIcon,
  PhotoIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

const EMPTY_FOOTER = {
  footer_company_name: "",
  footer_address: "",
  footer_address_note: "",
  footer_tax_id: "",
  footer_email: "",
  footer_phone: "",
  footer_copyright: "",
  social_instagram: "",
  social_facebook: "",
  social_line: "",
};

export default function PartnerSettingsPage() {
  const { user, partner, store, setStore } = usePartnerSession();
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [markupRate, setMarkupRate] = useState(20);
  const [logoUrl, setLogoUrl] = useState("");
  const [footer, setFooter] = useState(EMPTY_FOOTER);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const setupCheckedRef = useRef(false);
  const fileInputRef = useRef(null);

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    logoUrl ||
    null;

  const smartStoreKey = store?.domain
    ? `jeko_smart_store_${store.domain}`
    : null;

  // 僅「尚未上架任何商品」且未完成／未略過開立時，自動開一次智慧選品；
  // 開立完成後不會再出現（補上架請走選品管理）。
  useEffect(() => {
    if (!store?.id || !smartStoreKey || setupCheckedRef.current) return;
    setupCheckedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        try {
          if (localStorage.getItem(smartStoreKey)) return;
        } catch {
          /* ignore */
        }

        const { count, error } = await supabase
          .from("store_products")
          .select("*", { count: "exact", head: true })
          .eq("store_id", store.id);
        if (error || cancelled) return;
        if ((count || 0) === 0) setSetupOpen(true);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [store?.id, smartStoreKey]);

  const dismissSetupWizard = () => {
    setSetupOpen(false);
    if (!smartStoreKey) return;
    try {
      localStorage.setItem(
        smartStoreKey,
        JSON.stringify({ at: Date.now(), skipped: true }),
      );
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (store) {
      setStoreName(store.store_name || "");
      setDescription(store.description || "");
      setMarkupRate(store.markup_rate ?? 20);
      setLogoUrl(store.logo_url || "");
      setFooter({
        footer_company_name: store.footer_company_name || "",
        footer_address: store.footer_address || "",
        footer_address_note: store.footer_address_note || "",
        footer_tax_id: store.footer_tax_id || "",
        footer_email: store.footer_email || "",
        footer_phone: store.footer_phone || "",
        footer_copyright: store.footer_copyright || "",
        social_instagram: store.social_instagram || "",
        social_facebook: store.social_facebook || "",
        social_line: store.social_line || "",
      });
    }
  }, [store]);

  const updateFooter = (key, value) => {
    setFooter((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    if (!file.type.startsWith("image/")) {
      alert("請上傳圖片檔（JPG / PNG / WEBP）");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("圖片請小於 5MB");
      return;
    }

    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("請重新登入後再上傳");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", store.id);

      const res = await fetch("/api/partner/upload-logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "上傳失敗");
      }
      setLogoUrl(data.url);
    } catch (err) {
      console.error("[logo upload]", err);
      alert("上傳失敗：" + (err.message || "請稍後再試"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!storeName.trim()) return alert("店鋪名稱不能為空");
    if (!store?.id) return alert("找不到店鋪資料，請重新登入");
    setSaving(true);
    setSaved(false);

    // 財務欄位（markup_rate）獨立走伺服器驗證＋稽核紀錄的專用 API，
    // 不與品牌/展示欄位一起直接寫表，避免分潤相關數值繞過邊界檢查。
    const nextMarkupRate = parseInt(markupRate, 10);
    if (Number.isFinite(nextMarkupRate) && nextMarkupRate !== Number(store.markup_rate)) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch("/api/partner/store-settings", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ markup_rate: nextMarkupRate }),
        });
        const markupResult = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSaving(false);
          return alert("加價率儲存失敗：" + (markupResult.error || "未知錯誤"));
        }
        if (markupResult.store) setStore(markupResult.store);
      } catch (err) {
        setSaving(false);
        return alert("加價率儲存失敗：" + (err.message || "未知錯誤"));
      }
    }

    const footerPayload = Object.fromEntries(
      Object.entries(footer).map(([k, v]) => [k, String(v || "").trim() || null]),
    );

    const payload = {
      store_name: storeName.trim(),
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      ...footerPayload,
    };

    let { data, error } = await supabase
      .from("stores")
      .update(payload)
      .eq("id", store.id)
      .select()
      .single();

    // 舊 DB 尚未跑 migration 時自動降級
    if (
      error &&
      /description|logo_url|footer_|social_|schema cache/i.test(error.message || "")
    ) {
      const legacy = {
        store_name: payload.store_name,
      };
      ({ data, error } = await supabase
        .from("stores")
        .update(legacy)
        .eq("id", store.id)
        .select()
        .single());
      if (!error) {
        setSaving(false);
        setStore({
          ...data,
          description: payload.description,
          logo_url: payload.logo_url,
          ...footerPayload,
        });
        alert(
          "基本資料已儲存。請至 Supabase 執行 migration「20260714_stores_description_logo.sql」與「20260714_stores_footer_social.sql」，才能永久保存描述、大頭貼與 Footer。",
        );
        return;
      }
    }

    setSaving(false);
    if (error) return alert("儲存失敗：" + error.message);
    setStore(data);
    // 同步舊文章的編輯者名稱 → 當前分店顯示名稱（前台也會即時用 store_name）
    if (payload.store_name && store?.id) {
      await supabase
        .from("store_blog_posts")
        .update({ author_name: payload.store_name })
        .eq("store_id", store.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const relativeStoreUrl = store ? `/p/${store.domain}/` : null;
  const storeUrl = store ? `${SITE_URL}/p/${store.domain}/` : null;

  return (
    <PartnerAdminLayout title="商店設定">
      <div className={PARTNER_UI.page}>
      <div className="mb-5 sm:mb-6">
        <h1 className={PARTNER_UI.title}>商店設定</h1>
        <p className={PARTNER_UI.subtitle}>
          自訂您的專屬賣場品牌資訊，儲存後立即同步至前台
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 左側：設定表單 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-5 sm:gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              賣場大頭貼 / Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="賣場 Logo"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <PhotoIcon className="w-7 h-7 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 w-fit"
                >
                  {uploading ? "上傳中…" : logoUrl ? "更換圖片" : "上傳圖片"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-xs text-red-500 font-bold w-fit"
                  >
                    移除大頭貼
                  </button>
                )}
                <p className="text-[11px] text-slate-400">
                  建議正方形 JPG/PNG，檔案小於 5MB。會顯示於賣場導覽列。
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              分店顯示名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="例如：東京旅遊小幫手"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              顯示於賣場首頁、導覽列、頁面標題（Title）及 Footer
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              商店描述 / Slogan
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="例如：專業日本旅遊 eSIM 推薦，出發前必備！"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">用於 SEO 描述及賣場 About 區塊</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              全局加價比例 (%)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={markupRate}
                  onChange={(e) => setMarkupRate(e.target.value)}
                  className="w-24 sm:w-32 px-3 sm:px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
                <span className="text-sm font-bold text-slate-600">%</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                公式：底價 × (1 + {markupRate || 0}%) = 預設售價
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              若要用「固定加價金額」或逐方案改價，請到「商品管理 → 定價管理」。
            </p>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h2 className="text-sm font-black text-slate-800 mb-1">Footer 資訊</h2>
            <p className="text-xs text-slate-400 mb-4">
              顯示於賣場頁面最底部；留空就不顯示該列。社群連結需含完整網址（https://…）
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Footer 公司／店鋪名稱
                </label>
                <input
                  type="text"
                  value={footer.footer_company_name}
                  onChange={(e) =>
                    updateFooter("footer_company_name", e.target.value)
                  }
                  placeholder={storeName || "未填則用分店顯示名稱"}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  地址
                </label>
                <input
                  type="text"
                  value={footer.footer_address}
                  onChange={(e) => updateFooter("footer_address", e.target.value)}
                  placeholder="例：臺中市北屯區…"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  地址備註
                </label>
                <input
                  type="text"
                  value={footer.footer_address_note}
                  onChange={(e) =>
                    updateFooter("footer_address_note", e.target.value)
                  }
                  placeholder="例：(僅提供收取信件及包裹服務)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  統一編號
                </label>
                <input
                  type="text"
                  value={footer.footer_tax_id}
                  onChange={(e) => updateFooter("footer_tax_id", e.target.value)}
                  placeholder="8 碼統編"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  客服電話
                </label>
                <input
                  type="text"
                  value={footer.footer_phone}
                  onChange={(e) => updateFooter("footer_phone", e.target.value)}
                  placeholder="09xx-xxx-xxx"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  客服信箱
                </label>
                <input
                  type="email"
                  value={footer.footer_email}
                  onChange={(e) => updateFooter("footer_email", e.target.value)}
                  placeholder="service@example.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  版權文字
                </label>
                <input
                  type="text"
                  value={footer.footer_copyright}
                  onChange={(e) =>
                    updateFooter("footer_copyright", e.target.value)
                  }
                  placeholder="未填則自動產生 © 年份＋店名"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
            </div>

            <h3 className="text-xs font-black text-slate-700 uppercase mt-6 mb-3">
              社群連結（IG / FB / LINE）
            </h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Instagram
                </label>
                <input
                  type="url"
                  value={footer.social_instagram}
                  onChange={(e) =>
                    updateFooter("social_instagram", e.target.value)
                  }
                  placeholder="https://www.instagram.com/…"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Facebook
                </label>
                <input
                  type="url"
                  value={footer.social_facebook}
                  onChange={(e) =>
                    updateFooter("social_facebook", e.target.value)
                  }
                  placeholder="https://www.facebook.com/…"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  LINE
                </label>
                <input
                  type="url"
                  value={footer.social_line}
                  onChange={(e) => updateFooter("social_line", e.target.value)}
                  placeholder="https://line.me/…"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E4AD1]/30 focus:border-[#1E4AD1] transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
              專屬網址 — <span className="text-red-400 normal-case">不可修改</span>
            </label>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 opacity-70">
              <span className="text-sm text-slate-400 mr-2 font-mono">www.jeko-esim.com.tw/p/</span>
              <span className="text-sm font-bold text-slate-600 font-mono">{store?.domain}</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1E4AD1] text-white font-bold px-8 py-3 rounded-xl hover:bg-[#1344b5] disabled:opacity-50 transition shadow-sm"
            >
              {saving ? "儲存中..." : "儲存設定"}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-bold">✅ 已儲存，前台已同步！</span>
            )}
          </div>
        </div>

        {/* 右側：預覽卡片 */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">賣場預覽</p>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <PhotoIcon className="w-5 h-5 text-slate-300" />
                  )}
                </div>
                <p className="font-black text-slate-800 text-base">
                  {storeName || "您的店鋪名稱"}
                </p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {description || "商店描述將顯示在此..."}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-[10px] text-slate-400">頁面 Title</p>
                <p className="text-xs font-mono text-slate-600 mt-0.5 truncate">
                  {storeName || "店名"} | 官方授權專屬商城
                </p>
              </div>
            </div>
          </div>

          {storeUrl && (
            <div className="bg-[#1E4AD1] rounded-xl p-5 text-white">
              <p className="text-xs text-blue-200 font-bold uppercase mb-2">我的賣場連結</p>
              <p className="text-xs font-mono text-blue-100 break-all leading-relaxed mb-4">
                {storeUrl}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(storeUrl);
                    alert("已複製！");
                  }}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  <DocumentDuplicateIcon className="w-3.5 h-3.5" /> 複製
                </button>
                <a
                  href={relativeStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-[#FADE2B] text-slate-900 text-xs font-bold px-3 py-2 rounded-lg transition hover:brightness-95"
                >
                  <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> 開啟賣場
                </a>
              </div>
              <p className="text-[10px] text-blue-200/80 mt-3 leading-relaxed">
                點「開啟賣場」進入你的專屬賣場。若要補上架商品，請至「選品管理」。
              </p>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">帳號資訊</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={partner?.name || "avatar"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <UserCircleIcon className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {partner?.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {partner?.email}
                </p>
                <span className="inline-block mt-2 text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  已核准夥伴
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SmartStoreSetupWizard
        open={setupOpen}
        onClose={dismissSetupWizard}
        store={store}
        storePath={relativeStoreUrl}
      />
      </div>
    </PartnerAdminLayout>
  );
}
