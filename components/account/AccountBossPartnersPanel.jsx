"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { bossFetch } from "@/lib/bossAdminClient";
import { SITE_URL } from "@/lib/seo.config";
import { buildReferralShareUrl } from "@/lib/partnerReferral";
import { parsePartnerType, parseCooperationModel } from "@/lib/partnerDescriptionParse";
import PartnerDetailPanel from "@/components/admin/PartnerDetailPanel";
import { MetricTile } from "./AccountShell";

export default function AccountBossPartnersPanel() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [detailPartner, setDetailPartner] = useState(null);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bossFetch("/api/admin/partners");
      setPartners(data.partners || []);
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const updateStatus = async (partner, newStatus) => {
    const label = newStatus === "active" ? "批准" : "停用";
    if (!window.confirm(`確定要${label}「${partner.name}」嗎？`)) return;

    setActionId(partner.id);
    try {
      const data = await bossFetch("/api/admin/partners", {
        method: "PATCH",
        body: JSON.stringify({ id: partner.id, status: newStatus }),
      });

      if (data.warning) {
        setToast(data.warning);
      } else if (newStatus === "active") {
        const storeLine = data.storeUrl || "";
        const refLine = data.referralUrl || "";
        const linkLine = refLine
          ? `推薦連結：${refLine}`
          : storeLine
            ? `賣場：${storeLine}`
            : "";
        if (data.emailSent) {
          setToast(
            `已批准！開通通知信已寄至 ${partner.email}${linkLine ? ` · ${linkLine}` : ""}`,
          );
        } else if (data.emailError) {
          setToast(
            `已批准，但開通通知信寄送失敗：${data.emailError}${linkLine ? ` · ${linkLine}` : ""}`,
          );
        } else {
          setToast(`已批准！${linkLine || partner.name}`);
        }
      } else {
        setToast(`已將 ${partner.name} 設為停用`);
      }
      fetchPartners();
    } catch (err) {
      setToast(err.message);
    } finally {
      setActionId(null);
    }
  };

  const toggleBlog = async (partner, enable) => {
    const label = enable ? "開通自訂文章" : "關閉自訂文章";
    if (
      !window.confirm(
        enable
          ? `確定為「${partner.name}」一鍵開通文章加值？\n（對方需已透過 LINE 提出申請）`
          : `確定關閉「${partner.name}」的自訂文章功能？`,
      )
    ) {
      return;
    }
    setActionId(`blog-${partner.id}`);
    try {
      const data = await bossFetch("/api/admin/partners", {
        method: "PATCH",
        body: JSON.stringify({
          id: partner.id,
          blog_custom_enabled: enable,
        }),
      });
      setToast(
        enable
          ? `已開通文章加值${data.blogUrl ? ` · ${data.blogUrl}` : ""}`
          : "已關閉文章加值",
      );
      fetchPartners();
    } catch (err) {
      setToast(err.message);
    } finally {
      setActionId(null);
    }
  };

  const pending = partners.filter((p) => p.status === "pending").length;
  const active = partners.filter((p) => p.status === "active").length;

  const filtered = partners.filter((p) => {
    if (filter === "pending") return p.status === "pending";
    if (filter === "active") return p.status === "active";
    if (filter === "rejected") return p.status === "rejected";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-[#1E4AD1]">合作夥伴審核</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            批准後夥伴可至{" "}
            <Link href="/partner/login" className="text-[#0071EB] font-bold hover:underline">
              /partner/login
            </Link>
            。若夥伴透過官方 LINE 申請「自訂文章」，於此表一鍵「開通文章」。
          </p>
        </div>
        <button
          type="button"
          onClick={fetchPartners}
          disabled={loading}
          className="text-xs font-bold text-[#0071EB] border border-[#0071EB] px-3 py-1.5 rounded-sm hover:bg-blue-50 disabled:opacity-50"
        >
          {loading ? "更新中…" : "重新整理"}
        </button>
      </div>

      {toast && (
        <div className="text-sm bg-white border border-slate-200 rounded-sm px-4 py-3 text-slate-700 shadow-sm flex justify-between gap-3">
          <span>{toast}</span>
          <button type="button" className="text-slate-400 hover:text-slate-600 shrink-0" onClick={() => setToast("")}>
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricTile icon="groups" label="全部申請" value={partners.length} variant="navy" />
        <MetricTile icon="pending_actions" label="待審核" value={pending} variant="sky" />
        <MetricTile icon="store" label="已開通" value={active} variant="green" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "全部" },
          { id: "pending", label: "待審核" },
          { id: "active", label: "已開通" },
          { id: "rejected", label: "已停用" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-sm border transition ${
              filter === f.id
                ? "bg-[#1E4AD1] text-white border-[#1E4AD1]"
                : "bg-white text-slate-600 border-slate-200 hover:border-[#0071EB]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
        {loading && !partners.length ? (
          <div className="py-16 text-center text-slate-400 text-sm">讀取申請資料中…</div>
        ) : !filtered.length ? (
          <div className="py-16 text-center text-slate-400 text-sm">尚無符合條件的申請</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                  <th className="px-4 py-3 font-bold">夥伴 / Email</th>
                  <th className="px-4 py-3 font-bold">合作類型</th>
                  <th className="px-4 py-3 font-bold">Slug</th>
                  <th className="px-4 py-3 font-bold">折扣碼</th>
                  <th className="px-4 py-3 font-bold">狀態</th>
                  <th className="px-4 py-3 font-bold">文章加值</th>
                  <th className="px-4 py-3 font-bold text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.store_name ? (
                        <div className="text-xs font-bold text-[#0071EB] mt-0.5">
                          店鋪：{p.store_name}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-400">{p.email}</div>
                      {p.bank ? (
                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[200px]">
                          收款：{p.bank.bank_name || p.bank.payout_method || "已設定"}
                          {p.bank_updated_at
                            ? ` · ${new Date(p.bank_updated_at).toLocaleDateString("zh-TW")}`
                            : ""}
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 mt-1">尚未設定收款帳戶</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className="bg-blue-50 text-[#0071EB] px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap w-fit">
                          {parsePartnerType(p.description)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">
                          {parseCooperationModel(p.description, p)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {p.cooperation_model === "referral" ? (
                        <a
                          href={buildReferralShareUrl(SITE_URL, p.referral_code || p.slug)}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-[#0071EB] bg-slate-50 px-2 py-1 rounded-sm hover:underline break-all"
                        >
                          /r/{p.referral_code || p.slug}
                        </a>
                      ) : (
                        <Link
                          href={`/p/${p.slug}`}
                          target="_blank"
                          className="font-mono text-xs text-[#0071EB] bg-slate-50 px-2 py-1 rounded-sm hover:underline"
                        >
                          /p/{p.slug}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.cooperation_model === "referral" ? (
                        <div className="text-[11px] leading-relaxed">
                          <span className="font-bold text-slate-700">
                            依商品電信商
                          </span>
                          <br />
                          {p.referral_discount_enabled !== false ? (
                            <span className="text-emerald-600 font-bold">
                              折扣碼開啟
                            </span>
                          ) : (
                            <span className="text-slate-400">未開放折扣</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.status === "pending" && (
                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          待審核
                        </span>
                      )}
                      {p.status === "active" && (
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          已開通
                        </span>
                      )}
                      {p.status === "rejected" && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          已停用
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.status === "active" ? (
                        p.blog_custom_enabled ? (
                          <span className="bg-[#FADE2B]/40 text-[#5c4a00] px-2 py-0.5 rounded-full text-[11px] font-bold">
                            文章已開
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[11px] font-bold">
                            未開通
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setDetailPartner(p)}
                          className="text-xs font-bold text-slate-500 hover:text-[#0071EB] px-2.5 py-1.5 rounded-sm hover:bg-slate-50"
                        >
                          詳情
                        </button>
                        {p.status === "active" && (
                          <button
                            type="button"
                            disabled={actionId === `blog-${p.id}`}
                            onClick={() =>
                              toggleBlog(p, !p.blog_custom_enabled)
                            }
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-sm disabled:opacity-50 ${
                              p.blog_custom_enabled
                                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                : "text-[#111] hover:brightness-95"
                            }`}
                            style={
                              p.blog_custom_enabled
                                ? undefined
                                : { backgroundColor: "#FADE2B" }
                            }
                          >
                            {actionId === `blog-${p.id}`
                              ? "處理中…"
                              : p.blog_custom_enabled
                                ? "關閉文章"
                                : "開通文章"}
                          </button>
                        )}
                        {p.status !== "active" && (
                          <button
                            type="button"
                            disabled={actionId === p.id}
                            onClick={() => updateStatus(p, "active")}
                            className="text-xs font-bold bg-[#0071EB] text-white px-2.5 py-1.5 rounded-sm hover:bg-[#1E4AD1] disabled:opacity-50"
                          >
                            {actionId === p.id ? "處理中…" : "批准"}
                          </button>
                        )}
                        {p.status !== "rejected" && (
                          <button
                            type="button"
                            disabled={actionId === p.id}
                            onClick={() => updateStatus(p, "rejected")}
                            className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1.5 rounded-sm hover:bg-red-100 disabled:opacity-50"
                          >
                            停用
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PartnerDetailPanel
        partner={detailPartner}
        onClose={() => setDetailPartner(null)}
        onUpdated={(updated) => {
          if (!updated) return;
          setDetailPartner(updated);
          setPartners((prev) =>
            prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)),
          );
        }}
      />
    </div>
  );
}
