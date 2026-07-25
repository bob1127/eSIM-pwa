"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, LayoutGroup } from "framer-motion";
import { useSession } from "next-auth/react";
import { useUser } from "@/components/context/UserContext";
import { useAuth } from "@/hooks/useAuth";
import { buildLoginUrl } from "@/lib/authRedirect";
import { resolveMemberEmail } from "@/lib/memberIdentity";
import { parseQrcodeData } from "@/lib/esimOrderExtract";
import { formatMb, usagePercent } from "@/lib/esimUsageFormat";
import { normalizeIccid, getPushEndpoint } from "@/lib/pushBind";
import { subscribeToPush } from "@/lib/pushSubscribe";
import { detectPushSupport, getBrowserContext } from "@/lib/pushSupport";
import { usePWAInstall } from "./usePWAInstall";
import AppInstallGuideModal from "./AppInstallGuideModal";
import MaterialIcon from "@/components/MaterialIcon";

const COLLAPSED_H = 118;
/** 產品頁預設縮小：只留可上拉的橫槓 */
export const COLLAPSED_H_PRODUCT = 32;
const EXPANDED_VH = 78;

/** 導覽藍底液態過渡（維持品牌藍 #0A6CD0） */
const NAV_LIQUID_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 26,
  mass: 0.82,
};

/* ─── 扁平 SVG icons（無陰影）─── */
const IconUsage = ({ className = "" }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-8" />
    <path d="M22 20V7" />
  </svg>
);

const IconMember = ({ className = "" }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconQr = ({ className = "" }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <rect x="7" y="7" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <rect x="13.8" y="7" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <rect x="7" y="13.8" width="3.2" height="3.2" fill="currentColor" stroke="none" />
    <path d="M14 14h1.5v1.5H14zm3 0h1.5v3H14.5v-1.5H16V14zm-3 3.5H15.5V19H14z" fill="currentColor" stroke="none" />
  </svg>
);

const IconInstall = ({ className = "" }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3v12" />
    <path d="m8 11 4 4 4-4" />
    <path d="M5 19h14" />
  </svg>
);

function parseItemDetails(order) {
  let items = order?.item_details;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  return Array.isArray(items) ? items : [];
}

/** 從會員訂單抽出可顯示的 QR 方案（與 AccountOrdersView 同源） */
export function extractQrPlansFromOrders(orders = []) {
  const plans = [];
  for (const order of orders) {
    const items = parseItemDetails(order);
    const qrItems = parseQrcodeData(order.qrcode_data);
    qrItems.forEach((item, idx) => {
      const src = String(item.qrcodeUrl || item.src || "")
        .split(",")[0]
        .trim();
      if (!src) return;
      const name = item.productName || item.name || "eSIM 方案";
      const match =
        items.find((i) => i.name === name || i.productName === name) ||
        items[idx] ||
        items[0];
      const price =
        match?.unit_price ??
        match?.price ??
        match?.total ??
        order.total_amount ??
        null;
      plans.push({
        id: `${order.id}-${item.topupId || item.topup_id || idx}`,
        name,
        src,
        topupId: item.topupId || item.topup_id || null,
        iccid: item.iccid || item.ICCID || null,
        price: price != null ? Number(price) : null,
        orderId: order.id,
        orderDate: order.created_at,
        status: order.status,
      });
    });
  }
  return plans;
}

function formatPrice(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `NT$ ${Number(n).toLocaleString("zh-TW")}`;
}

function LoginGate() {
  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0A6CD0] mb-3">
        <IconMember />
      </div>
      <p className="text-[15px] font-bold text-gray-900">請先登入會員</p>
      <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">
        登入後即可在此查看 QR Code、剩餘用量與方案資訊
      </p>
      <Link
        href={buildLoginUrl()}
        className="mt-5 w-full max-w-xs bg-[#0A6CD0] text-white text-[14px] font-bold py-3 rounded-2xl text-center active:opacity-90"
      >
        登入／加入會員
      </Link>
    </div>
  );
}

function QrPanel({ plans, activeIdx, setActiveIdx, usageMap, usageLoading }) {
  const scrollerRef = useRef(null);
  const plan = plans[activeIdx];

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !plans.length) return;
    const w = el.clientWidth;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== activeIdx && idx >= 0 && idx < plans.length) {
      setActiveIdx(idx);
    }
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    el.scrollTo({ left: activeIdx * w, behavior: "smooth" });
  }, [activeIdx]);

  if (!plans.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] font-bold text-gray-800">尚無 eSIM QR Code</p>
        <p className="text-[12px] text-gray-500 mt-1.5">
          完成購買後，安裝碼會顯示在這裡
        </p>
        <Link
          href="/product"
          className="inline-block mt-4 text-[13px] font-bold text-[#0284c7]"
        >
          去選購方案 →
        </Link>
      </div>
    );
  }

  const usage = plan?.topupId ? usageMap[plan.topupId] : null;
  const pct = usage
    ? usagePercent(usage.remainingMb, usage.totalMb)
    : null;

  return (
    <div className="pb-2">
      {/* 橫向滑動 QR */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {plans.map((p) => (
          <div
            key={p.id}
            className="snap-center shrink-0 w-full flex flex-col items-center px-6"
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-3 w-[200px] h-[200px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        ))}
      </div>

      {plans.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`方案 ${i + 1}`}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all ${
                i === activeIdx ? "w-4 h-1.5 bg-[#0A6CD0]" : "w-1.5 h-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* 方案資訊 */}
      {plan && (
        <div className="mx-4 mt-4 bg-[#f7f8fa] rounded-2xl p-4">
          <p className="text-[15px] font-bold text-gray-900 leading-snug">
            {plan.name}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wide">
                價格
              </p>
              <p className="text-[15px] font-black text-gray-900 mt-0.5">
                {formatPrice(plan.price)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-semibold tracking-wide">
                剩餘用量
              </p>
              {usageLoading && plan.topupId ? (
                <p className="text-[13px] text-gray-400 mt-0.5">查詢中…</p>
              ) : usage ? (
                <p className="text-[15px] font-black text-gray-900 mt-0.5">
                  {formatMb(usage.remainingMb) || "—"}
                  {usage.totalMb != null && (
                    <span className="text-[11px] font-medium text-gray-400">
                      {" "}
                      / {formatMb(usage.totalMb)}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[13px] text-gray-400 mt-0.5">尚無資料</p>
              )}
            </div>
          </div>
          {pct != null && (
            <div className="mt-3">
              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0A6CD0] transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">剩餘 {Math.round(pct)}%</p>
            </div>
          )}
          {plans.length > 1 && (
            <p className="text-[11px] text-gray-400 mt-3 text-center">
              ← 左右滑動切換方案（{activeIdx + 1}/{plans.length}）
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function UsagePanel({
  isGuest,
  plans,
  activeIdx,
  setActiveIdx,
  usageMap,
  usageLoading,
  onRefresh,
  guestUsage,
  guestLoading,
  onGuestQuery,
}) {
  const [iccid, setIccid] = useState("");
  const [guestError, setGuestError] = useState("");

  // ── 訪客：警示 + ICCID 輸入 ──
  if (isGuest) {
    const pct = guestUsage
      ? usagePercent(guestUsage.remainingMb, guestUsage.totalMb)
      : null;

    const submitIccid = async () => {
      const value = normalizeIccid(iccid);
      if (!value || value.length < 18) {
        setGuestError("請輸入有效的 ICCID（約 19～20 碼）");
        return;
      }
      setGuestError("");
      await onGuestQuery(value);
    };

    return (
      <div className="px-4 pb-2">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-3 mb-3">
          <p className="text-[13px] font-bold text-amber-800">尚未登入會員</p>
          <p className="text-[11px] text-amber-700/90 mt-1 leading-relaxed">
            未登入無法讀取訂單內的 eSIM。請輸入 ICCID 查詢剩餘流量，或登入會員一鍵查詢。
          </p>
        </div>

        <div className="bg-[#f7f8fa] rounded-2xl p-4">
          <label className="block text-[11px] font-bold text-gray-500 tracking-wide mb-1.5">
            ICCID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={iccid}
              onChange={(e) => setIccid(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitIccid();
              }}
              placeholder="輸入 ICCID（19～20 碼）"
              className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[14px] text-gray-900 outline-none focus:border-[#0A6CD0]"
            />
            <button
              type="button"
              onClick={submitIccid}
              disabled={guestLoading}
              className="shrink-0 rounded-xl bg-[#0A6CD0] px-4 text-[13px] font-bold text-white disabled:opacity-60 active:opacity-90"
            >
              {guestLoading ? "查詢中" : "查流量"}
            </button>
          </div>
          {guestError && (
            <p className="mt-2 text-[12px] text-red-500 font-medium">{guestError}</p>
          )}

          {guestUsage && (
            <div className="mt-4 text-center border-t border-gray-200 pt-4">
              <p className="text-[11px] text-gray-400 font-semibold tracking-wide">
                剩餘流量
              </p>
              <p className="text-[32px] font-black text-gray-900 leading-none mt-1">
                {formatMb(guestUsage.remainingMb) || "—"}
              </p>
              {guestUsage.totalMb != null && (
                <p className="text-[12px] text-gray-500 mt-2">
                  總量 {formatMb(guestUsage.totalMb)}
                  {pct != null && ` · 剩餘 ${Math.round(pct)}%`}
                </p>
              )}
              {pct != null && (
                <div className="mt-3 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#0A6CD0]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {guestUsage.productName && (
                <p className="text-[12px] text-gray-600 mt-3 font-medium">
                  {guestUsage.productName}
                </p>
              )}
              {guestUsage.note && (
                <p className="text-[10px] text-gray-400 mt-2">{guestUsage.note}</p>
              )}
            </div>
          )}
        </div>

        <Link
          href={buildLoginUrl()}
          className="mt-3 block w-full text-center text-[13px] font-bold py-3 rounded-2xl bg-[#0A6CD0] text-white active:opacity-90"
        >
          登入／註冊會員
        </Link>
      </div>
    );
  }

  // ── 會員：方案列表 + 一鍵查剩餘流量 ──
  const plan = plans[activeIdx];
  const usage = plan?.topupId ? usageMap[plan.topupId] : null;
  const pct = usage ? usagePercent(usage.remainingMb, usage.totalMb) : null;

  if (!plans.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[14px] font-bold text-gray-800">尚無可查詢的 eSIM</p>
        <p className="text-[12px] text-gray-500 mt-1.5">
          購買並啟用後即可一鍵查詢剩餘流量
        </p>
        <Link
          href="/product"
          className="inline-block mt-4 text-[13px] font-bold text-[#0284c7]"
        >
          去選購方案 →
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-2">
      {plans.length > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-3"
          style={{ scrollbarWidth: "none" }}
        >
          {plans.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActiveIdx(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                i === activeIdx
                  ? "bg-[#0A6CD0] text-white border-[#0A6CD0]"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
            >
              {p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#f7f8fa] rounded-2xl p-4">
        <p className="text-[15px] font-bold text-gray-900 leading-snug">
          {plan.name}
        </p>
        <p className="text-[12px] text-gray-500 mt-1">{formatPrice(plan.price)}</p>

        <button
          type="button"
          onClick={() => onRefresh(plan)}
          disabled={usageLoading}
          className="mt-4 w-full rounded-2xl bg-[#0A6CD0] py-3.5 text-[14px] font-bold text-white disabled:opacity-60 active:opacity-90"
        >
          {usageLoading ? "查詢中…" : "查詢剩餘流量"}
        </button>

        <div className="mt-4 text-center">
          {usageLoading && !usage ? (
            <p className="text-[28px] font-black text-gray-300">…</p>
          ) : usage ? (
            <>
              <p className="text-[11px] text-gray-400 font-semibold tracking-wide">
                剩餘流量
              </p>
              <p className="text-[36px] font-black text-gray-900 leading-none mt-1">
                {formatMb(usage.remainingMb) || "—"}
              </p>
              {usage.totalMb != null && (
                <p className="text-[12px] text-gray-500 mt-2">
                  總量 {formatMb(usage.totalMb)}
                  {pct != null && ` · 剩餘 ${Math.round(pct)}%`}
                </p>
              )}
              {pct != null && (
                <div className="mt-4 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pct <= 15
                        ? "bg-red-500"
                        : pct <= 40
                          ? "bg-amber-400"
                          : "bg-[#0A6CD0]"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {usage.expiresAt && (
                <p className="text-[11px] text-gray-400 mt-3">
                  到期：
                  {new Date(usage.expiresAt).toLocaleString("zh-TW", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {usage.note && (
                <p className="text-[10px] text-gray-400 mt-2 leading-relaxed">
                  {usage.note}
                </p>
              )}
            </>
          ) : (
            <p className="text-[12px] text-gray-400 py-2">
              點上方按鈕即可查詢此方案剩餘流量
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberPanel({ userName, email, onAccount }) {
  return (
    <div className="px-4 pb-2">
      <div className="bg-[#f7f8fa] rounded-2xl p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
          <IconMember />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-gray-900 truncate">
            {userName || "Jeko 會員"}
          </p>
          <p className="text-[12px] text-gray-500 truncate mt-0.5">
            {email || "已登入"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onAccount}
        className="mt-3 w-full text-[14px] font-bold py-3 rounded-2xl bg-[#0A6CD0] text-white active:opacity-90"
      >
        開啟會員中心
      </button>
    </div>
  );
}

function InstallPanel({ onInstall, isStandalone }) {
  return (
    <div className="px-4 pb-2">
      <div className="bg-[#f7f8fa] rounded-2xl p-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-600 mb-3">
          <IconInstall />
        </div>
        <p className="text-[15px] font-bold text-gray-900">
          {isStandalone ? "已安裝 Jeko APP" : "下載 Jeko APP"}
        </p>
        <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">
          {isStandalone
            ? "可開啟推播通知與 eSIM 低流量警示"
            : "加入主畫面，隨時查用量、收推播提醒"}
        </p>
        {!isStandalone && (
          <button
            type="button"
            onClick={onInstall}
            className="mt-4 w-full bg-[#0A6CD0] text-white text-[14px] font-bold py-3 rounded-2xl active:opacity-90"
          >
            安裝到主畫面
          </button>
        )}
      </div>
    </div>
  );
}

/** 優惠活動面板：點數／優惠券摘要，再連到完整優惠頁 */
function PromoPanel({
  isGuest,
  loading,
  points,
  coupons = [],
  onClose,
}) {
  const available = coupons.filter((c) => c.status === "available");

  if (isGuest) {
    return (
      <div className="px-4 pb-4 space-y-3">
        <div className="bg-[#f7f8fa] rounded-2xl p-4">
          <p className="text-[13px] font-bold text-gray-900 mb-3">優惠摘要</p>
          <div className="flex items-center justify-between text-[13px] py-2 border-b border-gray-100">
            <span className="text-gray-500">您的剩餘點數</span>
            <span className="font-bold text-gray-400">登入後查看</span>
          </div>
          <div className="pt-3">
            <p className="text-[13px] text-gray-500 mb-1">目前有的優惠券</p>
            <p className="text-[12px] text-gray-400">登入後即可查看折價券</p>
          </div>
        </div>
        <LoginGate />
        <Link
          href="/promo"
          onClick={onClose}
          className="flex items-center justify-center gap-1 w-full text-[14px] font-bold py-3 rounded-2xl border border-[#0A6CD0] text-[#0A6CD0] active:opacity-90"
        >
          前進優惠內容
          <MaterialIcon name="chevron_right" size={18} />
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="bg-[#f7f8fa] rounded-2xl p-4">
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-gray-600">您的剩餘點數</span>
          {loading ? (
            <span className="text-[13px] text-gray-400">載入中…</span>
          ) : (
            <span className="text-[18px] font-black text-[#0A6CD0] tabular-nums">
              {Number(points || 0).toLocaleString("zh-TW")}
              <span className="text-[12px] font-bold ml-1 text-gray-500">點</span>
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200/80">
          <p className="text-[13px] font-bold text-gray-900 mb-2">
            目前有的優惠券
          </p>
          {loading ? (
            <p className="text-[12px] text-gray-400 py-2">載入中…</p>
          ) : available.length === 0 ? (
            <p className="text-[12px] text-gray-500 leading-relaxed py-1">
              尚無可用優惠券。可至優惠頁拉霸抽獎或領取新會員禮。
            </p>
          ) : (
            <ul className="space-y-2 max-h-[28vh] overflow-y-auto">
              {available.map((c) => (
                <li
                  key={c.id || c.code}
                  className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2.5 border border-gray-100"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-gray-900 truncate">
                      {c.label || `${c.amount} 元折抵`}
                    </p>
                    <p className="text-[11px] font-mono text-gray-400 truncate">
                      {c.code}
                    </p>
                  </div>
                  <span className="shrink-0 text-[12px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    NT${Number(c.amount || 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        href="/promo"
        onClick={onClose}
        className="flex items-center justify-center gap-1 w-full text-[14px] font-bold py-3.5 rounded-2xl bg-[#0A6CD0] text-white active:opacity-90"
      >
        前進優惠內容
        <MaterialIcon name="chevron_right" size={18} />
      </Link>
    </div>
  );
}

export default function EsimBottomSheet() {
  const router = useRouter();
  const { user: supabaseUser, token } = useUser();
  const { data: session } = useSession();
  const { isLoggedIn, authReady, isGuest } = useAuth();
  const { isInstallable, installPWA, deviceType, isStandalone } = usePWAInstall();

  // shop 相關頁面：不顯示手機上拉選單，改用完整 Footer
  const isShopRoute =
    typeof router.pathname === "string" &&
    (router.pathname === "/shop" || router.pathname.startsWith("/shop/"));

  // eSIM 產品頁：預設縮成橫槓，避免擋立即購買
  const isProductRoute = useMemo(() => {
    const path = String(router.asPath || router.pathname || "").split("?")[0];
    return path === "/product" || path.startsWith("/product/");
  }, [router.asPath, router.pathname]);

  const collapsedH = isProductRoute ? COLLAPSED_H_PRODUCT : COLLAPSED_H;

  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState("qr"); // qr | usage | member | install | promo
  const [dragY, setDragY] = useState(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const startY = useRef(0);
  const dragging = useRef(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [usageMap, setUsageMap] = useState({});
  const [usageLoading, setUsageLoading] = useState(false);
  const [guestUsage, setGuestUsage] = useState(null);
  const [guestLoading, setGuestLoading] = useState(false);
  const [trafficBusy, setTrafficBusy] = useState(false);
  const [trafficOn, setTrafficOn] = useState(false);
  const [promoCoupons, setPromoCoupons] = useState([]);
  const [promoPoints, setPromoPoints] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);

  const memberEmail = useMemo(
    () =>
      resolveMemberEmail({
        supabaseUser,
        sessionUser: session?.user,
      }),
    [supabaseUser, session],
  );

  const plans = useMemo(() => extractQrPlansFromOrders(orders), [orders]);

  const needsAppleInstall =
    !isStandalone && (deviceType === "ios" || deviceType === "mac");

  const loadOrders = useCallback(async () => {
    if (!memberEmail) return;
    setOrdersLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `/api/orders/user-orders?email=${encodeURIComponent(memberEmail)}`,
        { method: "GET", headers, credentials: "include" },
      );
      const result = await res.json();
      if (result.success) setOrders(result.data || []);
      else setOrders([]);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [memberEmail, token]);

  const queryUsage = useCallback(async (plan) => {
    if (!plan?.topupId && !plan?.iccid) return;
    setUsageLoading(true);
    try {
      const res = await fetch("/api/esim/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(plan.topupId ? { topupId: plan.topupId } : {}),
          ...(plan.iccid ? { iccid: plan.iccid } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok && plan.topupId) {
        setUsageMap((prev) => ({ ...prev, [plan.topupId]: data }));
      }
    } catch {
      /* ignore */
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const queryGuestUsage = useCallback(async (iccid) => {
    setGuestLoading(true);
    setGuestUsage(null);
    try {
      const res = await fetch("/api/esim/usage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iccid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "查詢失敗");
      setGuestUsage(data);
    } catch (e) {
      setGuestUsage({
        remainingMb: null,
        totalMb: null,
        note: e.message || "查詢失敗，請確認 ICCID 是否正確",
      });
    } finally {
      setGuestLoading(false);
    }
  }, []);

  // 展開且已登入時載入訂單
  useEffect(() => {
    if (expanded && isLoggedIn && memberEmail) {
      loadOrders();
    }
  }, [expanded, isLoggedIn, memberEmail, loadOrders]);

  // 優惠活動面板：載入點數／優惠券
  useEffect(() => {
    if (!expanded || panel !== "promo" || !isLoggedIn) return undefined;
    let cancelled = false;

    (async () => {
      setPromoLoading(true);
      try {
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/promo/member-coupons", {
          headers,
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.success) {
          const list = Array.isArray(data.coupons) ? data.coupons : [];
          setPromoCoupons(list);
          // 尚無獨立點數系統：以可用折價券金額加總作為可折抵點數顯示
          const pts = list
            .filter((c) => c.status === "available")
            .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
          setPromoPoints(pts);
        } else {
          setPromoCoupons([]);
          setPromoPoints(0);
        }
      } catch {
        if (!cancelled) {
          setPromoCoupons([]);
          setPromoPoints(0);
        }
      } finally {
        if (!cancelled) setPromoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expanded, panel, isLoggedIn, token]);

  // 會員進入用量頁：不自動查，等按按鈕（依需求）
  // QR 切換時可預載用量（可選，保留輕量）
  useEffect(() => {
    if (!expanded || !isLoggedIn) return;
    if (panel !== "qr") return;
    const plan = plans[activeIdx];
    if (plan?.topupId && !usageMap[plan.topupId]) {
      queryUsage(plan);
    }
  }, [expanded, panel, activeIdx, plans, isLoggedIn, usageMap, queryUsage]);

  // plans 變動時重置 index
  useEffect(() => {
    if (activeIdx >= plans.length) setActiveIdx(0);
  }, [plans.length, activeIdx]);

  const handleInstall = useCallback(async () => {
    if (isStandalone) {
      alert("您已安裝 Jeko APP。");
      return;
    }
    // Chromium：先試系統一鍵安裝；失敗再開圖文教學
    if (isInstallable) {
      const outcome = await installPWA();
      if (outcome === "accepted") return;
      if (outcome === "dismissed") return;
    }
    setShowInstallGuide(true);
  }, [isInstallable, installPWA, isStandalone]);

  const goLogin = () => {
    router.push(buildLoginUrl());
  };

  /** 依裝置自動分流：iPhone 先裝 App；Android／電腦直接開通知 */
  const enableTrafficAlert = useCallback(async () => {
    if (trafficBusy) return;
    if (!authReady) return;

    if (isGuest || !isLoggedIn) {
      alert("請先登入，登入後會自動幫您開啟流量通知。");
      const path =
        typeof window !== "undefined"
          ? `${window.location.pathname}?enableTraffic=1`
          : "/?enableTraffic=1";
      router.push(buildLoginUrl(path));
      return;
    }

    setTrafficBusy(true);
    try {
      const ctx = getBrowserContext();
      const support = await detectPushSupport();
      const isApplePhone = !!ctx.isIOS;

      // ── iPhone／iPad：必須先用主畫面 App 開啟 ──
      if (isApplePhone && !ctx.isStandalone) {
        setPanel("install");
        setExpanded(true);
        setShowInstallGuide(true);
        return;
      }

      if (!support.supported) {
        alert(
          support.hint ||
            "此裝置暫不支援通知，請改用 Chrome，或將本站加入主畫面。",
        );
        return;
      }

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "denied"
      ) {
        alert(
          isApplePhone
            ? "通知被關掉了。\n\n請到「設定 → 通知」找到 Jeko，改成允許後再試。"
            : "通知被關掉了。\n\n請點網址列左邊的鎖頭 → 通知 → 允許，然後再點一次即可。",
        );
        return;
      }

      // ── Android／電腦／已安裝的 iPhone App：直接開通知（不強制裝 PWA）──
      await subscribeToPush({ token });

      const endpoint = await getPushEndpoint();
      let bound = false;
      if (endpoint) {
        const res = await fetch("/api/push/auto-bind-member", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ endpoint }),
        });
        const data = await res.json().catch(() => ({}));
        bound = res.ok && !!data.success;
      }

      setTrafficOn(true);

      if (bound) {
        alert("完成！已自動對應您的 eSIM，流量快用完時會通知您。");
      } else {
        alert(
          "通知已開啟！\n\n系統會自動對應本站訂單。若暫時對應不到，到「剩餘用量」查看方案即可，一般會員不必手動輸入 ICCID。",
        );
      }

      // Android／Chrome：通知開好後「可選」安裝，不擋主流程
      if (
        !isApplePhone &&
        !isStandalone &&
        isInstallable &&
        typeof window !== "undefined" &&
        window.confirm("通知已開好。\n\n要不要再安裝到主畫面？之後更好找（可略過）。")
      ) {
        try {
          await installPWA();
        } catch {
          /* 略過 */
        }
      }
    } catch (err) {
      const msg = err?.message || String(err);
      alert(
        msg.includes("封鎖") || msg.includes("允許")
          ? msg
          : `開啟失敗：${msg}\n\n請再試一次。`,
      );
    } finally {
      setTrafficBusy(false);
    }
  }, [
    trafficBusy,
    authReady,
    isGuest,
    isLoggedIn,
    isInstallable,
    isStandalone,
    installPWA,
    token,
    router,
  ]);

  // 登入後帶 ?enableTraffic=1 → 自動開啟
  useEffect(() => {
    if (!authReady || !isLoggedIn || isGuest || trafficOn || trafficBusy) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("enableTraffic") !== "1") return;

    params.delete("enableTraffic");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, "", next);
    enableTrafficAlert();
  }, [authReady, isLoggedIn, isGuest, trafficOn, trafficBusy, enableTrafficAlert]);

  // 進頁靜默檢查：iPhone 未裝 App 不算已開
  useEffect(() => {
    if (!authReady || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const ctx = getBrowserContext();
        if (ctx.isIOS && !ctx.isStandalone) {
          if (!cancelled) setTrafficOn(false);
          return;
        }
        const endpoint = await getPushEndpoint();
        if (!endpoint || cancelled) return;
        if (
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          setTrafficOn(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, isLoggedIn, isStandalone]);

  const trafficButtonLabel = (() => {
    if (trafficBusy) return "開啟中…";
    if (trafficOn) return "流量通知已開";
    if (needsAppleInstall) return "先安裝再通知";
    return "開啟流量通知";
  })();

  const openPanel = (id) => {
    setPanel(id);
    setExpanded(true);
  };

  const onPointerDown = (e) => {
    dragging.current = true;
    startY.current = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    setDragY(0);
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    const y = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const delta = y - startY.current;
    if (expanded) setDragY(Math.max(0, delta));
    else setDragY(Math.min(0, delta));
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (expanded && dragY > 60) setExpanded(false);
    else if (!expanded && dragY < -40) {
      setExpanded(true);
      if (!panel) setPanel("qr");
    }
    setDragY(0);
  };

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const expandedPx =
    typeof window !== "undefined"
      ? (window.innerHeight * EXPANDED_VH) / 100
      : 560;
  const baseH = expanded ? expandedPx : collapsedH;
  const height = Math.max(collapsedH, baseH - dragY);

  const navItems = [
    { id: "usage", label: "剩餘用量", Icon: IconUsage },
    { id: "member", label: "會員", Icon: IconMember },
    { id: "qr", label: "QR Code", center: true, Icon: IconQr },
    { id: "install", label: "下載 APP", Icon: IconInstall },
    {
      id: "promo",
      label: "優惠活動",
      Icon: (props) => (
        <MaterialIcon name="local_activity" size={22} {...props} />
      ),
    },
  ];

  /** 收合時維持 QR 為品牌藍 CTA；展開時跟隨目前功能 */
  const activeNavId = expanded ? panel || "qr" : "qr";

  const displayName =
    supabaseUser?.user_metadata?.full_name ||
    session?.user?.name ||
    null;

  if (isShopRoute) return null;

  const miniCollapsed = isProductRoute && !expanded;

  return (
    <>
      {/* 佔位：避免頁面內容被固定底欄遮住 */}
      <div
        className={`md:hidden ${miniCollapsed ? "h-8" : "h-[118px]"}`}
        aria-hidden
      />

      {expanded && (
        <button
          type="button"
          aria-label="關閉面板"
          className="fixed inset-0 z-[90] bg-black/35 md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-[95] md:hidden"
        style={{
          height,
          transition: dragging.current
            ? "none"
            : "height 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="h-full bg-white rounded-t-[22px] border-t border-gray-300 flex flex-col overflow-hidden">
          {/* 拉把 */}
          <div
            className={`shrink-0 touch-none select-none ${
              miniCollapsed ? "py-2.5 px-4" : "pt-2.5 pb-1 px-4"
            }`}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
            onClick={() => {
              if (!expanded) {
                setPanel((p) => p || "qr");
                setExpanded(true);
              } else {
                setExpanded(false);
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={expanded ? "收合我的 eSIM" : "展開我的 eSIM"}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full bg-gray-300 ${
                  miniCollapsed ? "w-10 h-1" : "w-9 h-1 mb-1.5"
                }`}
              />
              {!miniCollapsed && (
                <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-800">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <rect x="3" y="4" width="2.2" height="16" rx="0.5" />
                    <rect x="7" y="4" width="1.4" height="16" rx="0.5" />
                    <rect x="10" y="4" width="2.8" height="16" rx="0.5" />
                    <rect x="14.5" y="4" width="1.2" height="16" rx="0.5" />
                    <rect x="17.5" y="4" width="3.5" height="16" rx="0.5" />
                  </svg>
                  我的 eSIM
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="2.5"
                    className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                  >
                    <path
                      d="M18 15l-6-6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* 五格導覽 — 產品頁縮小時隱藏 */}
          {!miniCollapsed && (
          <div className="shrink-0 px-3 pt-1 pb-2">
            <LayoutGroup id="esim-sheet-nav">
              <div className="grid grid-cols-5 items-end gap-1">
                {navItems.map((item) => {
                  const isActive = activeNavId === item.id;
                  const Icon = item.Icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPanel(item.id);
                      }}
                      className={`relative flex flex-col items-center gap-1 ${
                        item.center ? "-mt-1" : "py-1"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={`relative z-0 flex items-center justify-center ${
                          item.center ? "w-[52px] h-[52px]" : "w-10 h-10"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="esim-sheet-nav-liquid"
                            className="absolute inset-0 rounded-[14px] bg-[#0A6CD0]"
                            style={{
                              boxShadow: "0 6px 16px rgba(10, 108, 208, 0.32)",
                            }}
                            transition={NAV_LIQUID_SPRING}
                            initial={false}
                          />
                        )}
                        <motion.span
                          className="relative z-10 flex items-center justify-center"
                          animate={{
                            color: isActive ? "#ffffff" : "#4b5563",
                            scale: isActive ? 1 : 0.97,
                          }}
                          transition={{
                            duration: 0.25,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <Icon />
                        </motion.span>
                      </span>
                      <motion.span
                        className="text-[10px] font-semibold leading-tight"
                        animate={{
                          color: isActive ? "#0A6CD0" : "#374151",
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        {item.label}
                      </motion.span>
                    </button>
                  );
                })}
              </div>
            </LayoutGroup>
          </div>
          )}

          {/* 展開內容 */}
          {expanded && (
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {!authReady ||
              (isLoggedIn &&
                ordersLoading &&
                panel !== "usage" &&
                panel !== "install" &&
                panel !== "promo") ? (
                <div className="py-10 text-center text-[13px] text-gray-400">
                  載入中…
                </div>
              ) : panel === "promo" ? (
                <PromoPanel
                  isGuest={isGuest}
                  loading={promoLoading}
                  points={promoPoints}
                  coupons={promoCoupons}
                  onClose={() => setExpanded(false)}
                />
              ) : panel === "usage" ? (
                <UsagePanel
                  isGuest={isGuest}
                  plans={plans}
                  activeIdx={activeIdx}
                  setActiveIdx={setActiveIdx}
                  usageMap={usageMap}
                  usageLoading={usageLoading}
                  onRefresh={queryUsage}
                  guestUsage={guestUsage}
                  guestLoading={guestLoading}
                  onGuestQuery={queryGuestUsage}
                />
              ) : isGuest ? (
                <LoginGate />
              ) : panel === "qr" ? (
                <QrPanel
                  plans={plans}
                  activeIdx={activeIdx}
                  setActiveIdx={setActiveIdx}
                  usageMap={usageMap}
                  usageLoading={usageLoading}
                />
              ) : panel === "member" ? (
                <MemberPanel
                  userName={displayName}
                  email={memberEmail}
                  onAccount={() => router.push("/account")}
                />
              ) : panel === "install" ? (
                <InstallPanel
                  onInstall={handleInstall}
                  isStandalone={isStandalone}
                />
              ) : null}

              {(panel === "qr" || panel === "usage") && isLoggedIn && (
                <div className="px-4 pb-8 pt-2 flex gap-2">
                  <Link
                    href="/product"
                    className="flex-1 text-center text-[13px] font-bold py-3 rounded-2xl bg-[#0A6CD0] text-white active:opacity-90"
                    onClick={() => setExpanded(false)}
                  >
                    購買 eSIM
                  </Link>
                  <button
                    type="button"
                    disabled={trafficBusy}
                    onClick={enableTrafficAlert}
                    className={`flex-1 text-center text-[13px] font-bold py-3 rounded-2xl active:opacity-90 disabled:opacity-60 ${
                      trafficOn
                        ? "bg-[#e8fbf2] text-[#0F8A52]"
                        : "bg-[#e8f2fc] text-[#0A6CD0]"
                    }`}
                  >
                    {trafficButtonLabel}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AppInstallGuideModal
        open={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
      />
    </>
  );
}
