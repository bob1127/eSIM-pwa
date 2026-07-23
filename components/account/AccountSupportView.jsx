"use client";

import Link from "next/link";
import MaterialIcon from "@/components/MaterialIcon";
import { AccountPageWrap } from "./AccountShell";

function formatShort(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Shopify 首頁風 — 圖 1 */
export default function AccountSupportView({
  user,
  orders = [],
  onGuideClick,
  onTabChange,
}) {
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;
  const refundPending = orders.filter((o) => o.status === "refund_pending").length;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "早安";
    if (h < 18) return "午安";
    return "晚安";
  };

  const todos = [
    pendingCount > 0 && {
      icon: "inventory_2",
      label: `請完成 ${pendingCount} 筆待付款訂單`,
      action: () => onTabChange?.("orders"),
    },
    completedCount > 0 && {
      icon: "qr_code_scanner",
      label: `您有 ${completedCount} 張 eSIM 可安裝`,
      action: () => onTabChange?.("orders"),
    },
    {
      icon: "speed",
      label: "查詢 eSIM 剩餘流量",
      action: () => onTabChange?.("traffic"),
    },
    refundPending > 0 && {
      icon: "undo",
      label: `${refundPending} 筆退款審核中`,
      action: () => onTabChange?.("orders"),
    },
  ].filter(Boolean);

  const activities = [
    ...orders.slice(0, 5).map((o) => ({
      id: o.id,
      text: `訂單 #${o.id} · ${o.status === "completed" ? "已發貨" : o.status}`,
      at: o.created_at,
    })),
    { id: "guide", text: "eSIM 安裝指南已更新", at: new Date().toISOString() },
  ];

  return (
    <AccountPageWrap>
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-5 xl:gap-6">
        {/* 左欄 — Shopify 主區 */}
        <div className="space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-[#1e3a5f]">
              {greeting()}，{user?.name?.split(" ")[0] || "會員"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">一起確認您的 eSIM 使用狀況</p>
          </div>

          {/* 三格指標 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: "sim_card", label: "有效 eSIM", val: completedCount },
              { icon: "pending_actions", label: "待處理", val: pendingCount + refundPending },
              { icon: "menu_book", label: "教學文件", val: "4 篇" },
            ].map((m) => (
              <div
                key={m.label}
                className="bg-white border border-slate-200 rounded-sm p-4 flex items-start gap-3 shadow-sm"
              >
                <MaterialIcon name={m.icon} size={22} className="text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className="text-xl font-bold text-[#1e3a5f] mt-0.5">{m.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live 狀態卡 */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-bold text-[#1e3a5f]">
                  {completedCount} 張 eSIM 可使用
                </p>
                <p className="text-xs text-slate-400">掃描 QR Code 即可安裝</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-700">
              Live
            </span>
          </div>

          {/* 待辦清單 */}
          <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-[#1e3a5f]">建議事項</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {todos.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400">
                  目前沒有待辦事項 🎉
                </li>
              ) : (
                todos.map((t) => (
                  <li key={t.label}>
                    <button
                      type="button"
                      onClick={t.action}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition text-left group"
                    >
                      <MaterialIcon name={t.icon} size={22} className="text-slate-400" />
                      <span className="flex-1 text-sm font-medium text-slate-700">{t.label}</span>
                      <MaterialIcon
                        name="chevron_right"
                        size={20}
                        className="text-slate-300 group-hover:text-[#2563eb]"
                      />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* 智能裝置 */}
          <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <MaterialIcon name="devices" size={20} className="text-[#2563eb]" />
              <h3 className="text-sm font-black text-[#1e3a5f]">智能裝置偵測</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              依您目前使用的裝置，自動開啟對應的 eSIM 安裝圖文教學。
            </p>
            <button
              type="button"
              onClick={onGuideClick}
              className="px-4 py-2 bg-[#2563eb] text-white text-sm font-bold rounded-sm hover:bg-[#1d4ed8]"
            >
              開啟適合我的教學
            </button>
          </div>

          {/* 黃色通知橫幅 */}
          <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex gap-3">
              <MaterialIcon name="info" size={22} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-900">iPhone 推播需先安裝 PWA</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Safari → 分享 → 加入主畫面，才能接收流量偏低推播。
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onTabChange?.("traffic")}
                className="text-xs font-bold text-amber-900 underline"
              >
                了解更多
              </button>
              <button type="button" className="text-xs text-amber-700 px-2 py-1 rounded hover:bg-amber-100">
                關閉
              </button>
            </div>
          </div>
        </div>

        {/* 右欄 — Shopify 側邊摘要 */}
        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500">快速連結</span>
              <MaterialIcon name="expand_more" size={18} className="text-slate-400" />
            </div>
            <ul className="space-y-2 text-sm">
              {[
                { label: "iOS 安裝教學", href: "/operation-ios" },
                { label: "Android 教學", href: "/operation-android" },
                { label: "FAQ 常見問題", href: "/faq" },
                { label: "會員優惠", href: "/member-offers" },
                { label: "退換貨政策", href: "/refund-policy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[#2563eb] font-medium hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
            <p className="text-xs font-bold text-slate-500 mb-2">客服摘要</p>
            <p className="text-2xl font-black text-[#1e3a5f]">24h</p>
            <p className="text-xs text-slate-400">Email 回覆時間</p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-xs font-bold text-[#2563eb] hover:underline"
            >
              聯絡客服 →
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-[#1e3a5f]">動態</h3>
              <span className="text-[10px] text-slate-400">Activity</span>
            </div>
            <ul className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="flex gap-2 text-xs">
                  <MaterialIcon name="event" size={16} className="text-slate-300 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-700 font-medium">{a.text}</p>
                    <p className="text-slate-400 mt-0.5">{formatShort(a.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </AccountPageWrap>
  );
}
