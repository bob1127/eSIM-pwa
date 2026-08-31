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
import {
  isEsimUsageExpired,
  resolveEsimExpiryDisplay,
} from "@/lib/esimUsageFormat";
import { formatEsimValidityLinesZh } from "@/lib/esimDisplayZh";
import { inferEsimInstalled, isEsimNotInstalledForUsage, canShowEsimUsageStats } from "@/lib/esimInstallStatus";
import { getPushEndpoint } from "@/lib/pushBind";
import { subscribeToPush } from "@/lib/pushSubscribe";
import { detectPushSupport, getBrowserContext } from "@/lib/pushSupport";
import {
  broadcastPushNotifyState,
  subscribePushNotifySync,
} from "@/lib/pushNotifySync";
import { detectDeviceLabel } from "@/lib/deviceDetect";
import {
  hydrateEsimProfileFields,
  parseLpaString,
  pickInstallUrlForOs,
  resolveInstallUrls,
} from "@/lib/esimInstallLinks";
import { usePWAInstall } from "./usePWAInstall";
import AppInstallGuideModal from "./AppInstallGuideModal";
import MaterialIcon from "@/components/MaterialIcon";
import JekoPillButton from "@/components/ui/JekoPillButton";
import TrafficNotifyToggle from "@/components/ui/TrafficNotifyToggle";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import UsageRingPreview from "@/components/UsageRingPreview";
import EsimQuickBuyPanel from "@/components/EsimQuickBuyPanel";

const COLLAPSED_H = 118;
/** 產品頁預設縮小：只留可上拉的橫槓 */
export const COLLAPSED_H_PRODUCT = 32;
const EXPANDED_VH = 78;
/** 快速購買：接近滿版 */
const EXPANDED_VH_BUY = 94;
/** 高於主站 Navbar（z-1000～10050）與 ShopNavbar（z-8000～8901） */
const SHEET_Z_BACKDROP = 10060;
const SHEET_Z_PANEL = 10061;
const SHEET_Z_DIALOG = 10070;

/** 導覽主色：與 JekoPillButton 一致（#1E4AD1） */
const JEKO_NAV_BLUE = "#1E4AD1";
const NAV_LIQUID_SPRING = {
  type: "spring",
  stiffness: 300,
  damping: 26,
  mass: 0.82,
};

/* ─── 扁平 SVG icons（無陰影）─── */
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

/** 從會員訂單抽出可顯示的 QR 方案（與 AccountOrdersView 同源；依 topup／ICCID 精確去重） */
export function extractQrPlansFromOrders(orders = []) {
  const plans = [];
  const seen = new Set();

  // 新單優先：先掃較新的訂單
  const sorted = [...(orders || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0),
  );

  for (const order of sorted) {
    const items = parseItemDetails(order);
    const qrItems = parseQrcodeData(order.qrcode_data);
    qrItems.forEach((item, idx) => {
      const src = String(item.qrcodeUrl || item.src || "")
        .split(",")[0]
        .trim();
      if (!src) return;
      const topupId = item.topupId || item.topup_id || null;
      const iccid =
        item.iccid ||
        item.ICCID ||
        (() => {
          const m = String(src).match(/\/(\d{18,22})(?:\?|$)/);
          return m ? m[1] : null;
        })();
      const dedupeKey = topupId
        ? `topup:${String(topupId)}`
        : iccid
          ? `iccid:${String(iccid)}`
          : `src:${src}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

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
      const install = resolveInstallUrls(item);
      const lpa = install.lpa || item.lpa || null;
      const parsedLpa = parseLpaString(lpa) || parseLpaString(item.androidCode);
      const smdp =
        item.smdp ||
        item.smdp_address ||
        parsedLpa?.smdp ||
        null;
      const activationCode =
        item.activationCode ||
        item.activation_code ||
        parsedLpa?.activationCode ||
        null;
      const androidCode =
        item.androidCode ||
        (smdp && activationCode ? `LPA:1$${smdp}$${activationCode}` : null) ||
        lpa ||
        null;
      plans.push({
        id: `${order.id}-${topupId || iccid || idx}`,
        name,
        src,
        topupId,
        iccid,
        price: price != null ? Number(price) : null,
        orderId: order.id,
        orderDate: order.created_at,
        status: order.status,
        lpa,
        smdp,
        activationCode,
        androidCode,
        iosInstallUrl: install.iosInstallUrl,
        androidInstallUrl: install.androidInstallUrl,
        serviceDays: item.serviceDays || item.day || "",
        validityPeriod: item.validityPeriod || item.validity_period || "",
        dataAllowance: item.dataAllowance || item.flow || "",
      });
    });
  }
  return plans;
}

function usageForPlan(plan, usageMap) {
  if (!plan || !usageMap) return null;
  if (plan.topupId && usageMap[plan.topupId]) return usageMap[plan.topupId];
  if (plan.iccid && usageMap[plan.iccid]) return usageMap[plan.iccid];
  return null;
}

/** 吃到飽／無固定額度：顯示「使用流量」而非「剩餘用量」 */
function isUnlimitedStyleUsage(usage, planName) {
  const rem = usage?.remainingMb;
  const tot = usage?.totalMb;
  if (rem != null && tot != null && Number(tot) > 0) return false;
  const n = String(planName || usage?.productName || "");
  if (/吃到飽|unlimited|不限流量|不限速吃到飽/i.test(n)) return true;
  if (
    usage &&
    usage.usedMb != null &&
    rem == null &&
    tot == null
  ) {
    return true;
  }
  return false;
}

function usagePlanContext(usage, plan = null) {
  if (!usage && !plan) return null;
  const anchor = usage?.provisionedAt || usage?.createdAt || plan?.orderDate || null;
  return {
    ...(usage || {}),
    validityPeriod: usage?.validityPeriod || plan?.validityPeriod || null,
    serviceDays: usage?.serviceDays || plan?.serviceDays || null,
    productName: usage?.productName || plan?.name || null,
    sku: usage?.sku || plan?.planOfficialName || null,
    createdAt: usage?.createdAt || anchor,
    provisionedAt: usage?.provisionedAt || anchor,
  };
}

function usageExpiryOptions(plan) {
  return {
    validityPeriod: plan?.validityPeriod || null,
    serviceDays: plan?.serviceDays || null,
  };
}

/** 僅在有「已使用」證據時顯示圖表（與一鍵安裝鈕判斷一致） */
function UsageAwaitingInstallNotice({ usage = null, plan = null }) {
  const validityLines = formatEsimValidityLinesZh({
    validityPeriod: plan?.validityPeriod,
    serviceDays: plan?.serviceDays,
  });
  const ctx = usagePlanContext(usage, plan);
  const expiry = resolveEsimExpiryDisplay(ctx, {
    installed: false,
    ...usageExpiryOptions(plan),
  });
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-6 text-center ring-1 ring-slate-200/80">
      <p className="text-[14px] font-bold text-slate-700">尚未安裝或尚未使用</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        請先一鍵安裝或掃描上方 QR；產生用量後才會顯示流量圖表
      </p>
      {validityLines.length ? (
        <div className="mt-3 space-y-1 text-left rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-slate-200/60">
          {validityLines.map((line) => (
            <p key={line} className="text-[11px] leading-relaxed text-slate-600">
              {line}
            </p>
          ))}
        </div>
      ) : null}
      {expiry.line ? (
        <p className="mt-2 text-[11px] font-semibold text-slate-500">
          {expiry.line}
        </p>
      ) : null}
    </div>
  );
}

function ExpiredUsageNotice({ usage = null, plan = null }) {
  const ctx = usagePlanContext(usage, plan);
  const expiry = resolveEsimExpiryDisplay(ctx, usageExpiryOptions(plan));
  return (
    <div className="rounded-2xl bg-slate-100 px-3 py-6 text-center ring-1 ring-slate-200">
      <p className="text-[14px] font-bold text-slate-500">此 eSIM 已過期</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
        無法再查詢流量、安裝或開啟提醒。請另行購買新方案。
      </p>
      {expiry.line ? (
        <p className="mt-2 text-[11px] font-semibold text-slate-400">
          {expiry.line}
        </p>
      ) : null}
      {plan?.validityPeriod || plan?.serviceDays ? (
        <div className="mt-3 space-y-1 text-left rounded-xl bg-white/60 px-3 py-2.5 ring-1 ring-slate-200/60 opacity-80">
          {formatEsimValidityLinesZh({
            validityPeriod: plan.validityPeriod,
            serviceDays: plan.serviceDays,
          }).map((line) => (
            <p key={line} className="text-[10px] leading-relaxed text-slate-500">
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoginGate() {
  return (
    <div className="flex flex-col items-center text-center px-4 py-8">
      <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-[#0A6CD0] mb-3">
        <IconMember />
      </div>
      <p className="text-[15px] font-bold text-gray-900">請先登入會員</p>
      <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">
        登入後即可在此查看 QR Code、使用流量與方案資訊
      </p>
      <JekoPillButton href={buildLoginUrl()} size="sm" className="mt-5 max-w-xs mx-auto">
        登入／加入會員
      </JekoPillButton>
    </div>
  );
}

async function copyTextToClipboard(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

/** 詳細資訊 accordion（預設關閉）＋一鍵複製 */
function EsimDetailAccordion({ plan }) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const rows = useMemo(() => {
    if (!plan) return [];
    const hydrated = hydrateEsimProfileFields(plan);
    const smdp = String(hydrated.smdp || "").trim();
    const code = String(hydrated.activationCode || "").trim();
    const lpa = String(hydrated.lpa || "").trim();
    const android = String(hydrated.androidCode || lpa || "").trim();
    return [
      { key: "iccid", label: "ICCID", value: hydrated.iccid },
      { key: "smdp", label: "SM-DP+ 位址", value: smdp },
      { key: "code", label: "激活碼", value: code },
      { key: "android", label: "Android 激活碼", value: android },
      { key: "lpa", label: "完整 LPA", value: lpa },
    ].filter((r) => String(r.value || "").trim());
  }, [plan]);

  const validityLines = useMemo(
    () =>
      formatEsimValidityLinesZh({
        validityPeriod: plan?.validityPeriod,
        serviceDays: plan?.serviceDays,
      }),
    [plan],
  );

  if (!rows.length && !validityLines.length) return null;

  const onCopy = async (row) => {
    const ok = await copyTextToClipboard(row.value);
    if (!ok) {
      alert("複製失敗，請長按文字手動複製。");
      return;
    }
    setCopiedKey(row.key);
    window.setTimeout(() => {
      setCopiedKey((k) => (k === row.key ? "" : k));
    }, 1600);
  };

  return (
    <div className="w-full max-w-sm mt-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="text-[13px] font-bold text-slate-800">詳細資訊</span>
        <MaterialIcon
          name="expand_more"
          size={20}
          className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-3 pb-3 pt-1 space-y-2">
          {validityLines.length ? (
            <div className="rounded-lg bg-sky-50/80 px-2.5 py-2 ring-1 ring-sky-100">
              <p className="text-[10px] font-bold text-sky-900 tracking-wide">
                效期說明
              </p>
              {validityLines.map((line) => (
                <p
                  key={line}
                  className="mt-1 text-[11px] leading-relaxed text-sky-950/80"
                >
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-500 tracking-wide">
                  {row.label}
                </p>
                <p className="mt-0.5 text-[11px] font-mono text-slate-800 break-all leading-snug">
                  {row.value}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onCopy(row)}
                className="shrink-0 mt-0.5 inline-flex items-center gap-0.5 rounded-md border border-[#1E4AD1]/30 bg-white px-2 py-1 text-[10px] font-bold text-[#1E4AD1]"
                aria-label={`複製${row.label}`}
              >
                <MaterialIcon name="content_copy" size={12} />
                {copiedKey === row.key ? "已複製" : "複製"}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EsimBindSwitchRow({
  plan,
  trafficOn,
  boundTopupId,
  bindBusy,
  onToggleBind,
}) {
  if (!trafficOn || !plan?.topupId) return null;
  const isBound = String(boundTopupId || "") === String(plan.topupId);
  return (
    <div className="mt-3 pt-3 border-t border-gray-200/80 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-gray-800">eSIM 流量綁定</p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">
          {isBound ? "已綁定，流量偏低會提醒" : "開啟後監控此張 eSIM（一次一張）"}
        </p>
      </div>
      <TrafficNotifyToggle
        size="sm"
        on={isBound}
        busy={bindBusy}
        onClick={() => onToggleBind?.(plan)}
        aria-label={isBound ? "關閉此 eSIM 綁定" : "綁定此 eSIM"}
        className="shrink-0"
      />
    </div>
  );
}

function RefreshUsageButton({ loading, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="更新用量"
      aria-label="更新用量"
      className={[
        "inline-flex items-center gap-1 rounded-full border border-[#1E4AD1]/25 bg-white px-2.5 py-1",
        "text-[11px] font-bold text-[#1E4AD1] shadow-sm",
        "transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:bg-[#EFF6FC]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <MaterialIcon
        name="refresh"
        size={14}
        className={loading ? "animate-spin" : ""}
      />
      {loading ? "更新中" : "更新用量"}
    </button>
  );
}

function PlanPillTabs({ plans, activeIdx, onSelect, usageMap, className = "" }) {
  const pillRefs = useRef([]);

  useEffect(() => {
    const el = pillRefs.current[activeIdx];
    el?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeIdx]);

  if (!plans?.length || plans.length <= 1) return null;
  return (
    <div
      className={`flex gap-2 overflow-x-auto px-4 pb-3 ${className}`}
      style={{ scrollbarWidth: "none" }}
    >
      {plans.map((p, i) => {
        const expired = isEsimUsageExpired(usageForPlan(p, usageMap));
        const label =
          p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name;
        return (
          <button
            key={p.id}
            ref={(el) => {
              pillRefs.current[i] = el;
            }}
            type="button"
            disabled={expired}
            onClick={() => {
              if (expired) return;
              onSelect(i);
            }}
            aria-pressed={i === activeIdx}
            title={
              expired ? "此 eSIM 已過期，無法查詢或安裝" : p.name
            }
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors ${
              expired
                ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-70"
                : i === activeIdx
                  ? "border-[#1E4AD1] bg-[#1E4AD1] text-white"
                  : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {expired ? `已過期 · ${label}` : label}
          </button>
        );
      })}
    </div>
  );
}

function PlanUsageBlock({
  plan,
  usageMap,
  usageLoading,
  onRefresh,
  trafficOn,
  boundTopupId,
  bindBusy,
  onToggleBind,
}) {
  const usage = usageForPlan(plan, usageMap);
  const ctx = usagePlanContext(usage, plan);
  const expiryOpts = usageExpiryOptions(plan);
  const unlimitedStyle = isUnlimitedStyleUsage(usage, plan?.name);
  const expired = isEsimUsageExpired(ctx, expiryOpts);
  const showUsageChart = !expired && inferEsimInstalled(usage) === true;
  const expiryFooter = resolveEsimExpiryDisplay(ctx, expiryOpts).footer;

  return (
    <div
      className={`mt-4 w-full rounded-2xl p-4 ${
        expired ? "bg-slate-100/90 opacity-90" : "bg-[#f7f8fa]"
      }`}
    >
      <div className="flex items-start gap-2">
        <p
          className={`min-w-0 flex-1 text-[15px] font-bold leading-snug ${
            expired ? "text-slate-500" : "text-gray-900"
          }`}
        >
          {plan.name}
        </p>
        {!expired ? (
          <RefreshUsageButton
            loading={usageLoading}
            onClick={() => onRefresh?.(plan)}
            className="shrink-0 mt-0.5"
          />
        ) : null}
      </div>
      <div className="mt-3">
        {expired ? (
          <ExpiredUsageNotice usage={usage} plan={plan} />
        ) : usageLoading && (plan.topupId || plan.iccid) && !usage ? (
          <p className="text-[13px] text-gray-400 text-center py-6">查詢中…</p>
        ) : !showUsageChart ? (
          <UsageAwaitingInstallNotice usage={usage} plan={plan} />
        ) : usage?.remainingMb != null &&
          usage?.totalMb != null &&
          Number(usage.totalMb) > 0 &&
          !unlimitedStyle ? (
          <UsageRingPreview
            remainingMb={Number(usage.remainingMb)}
            totalMb={Number(usage.totalMb)}
            usedMb={usage.usedMb}
            expiryFooter={expiryFooter}
            dailyUsedMb={
              Array.isArray(usage.dailyUsedMb) ? usage.dailyUsedMb : null
            }
            variant="quota"
          />
        ) : (
          <UsageRingPreview
            usedMb={usage?.usedMb != null ? Number(usage.usedMb) : 0}
            expiryFooter={expiryFooter}
            variant="muted"
          />
        )}
      </div>
      <EsimBindSwitchRow
        plan={plan}
        trafficOn={trafficOn && !expired}
        boundTopupId={boundTopupId}
        bindBusy={bindBusy}
        onToggleBind={onToggleBind}
      />
    </div>
  );
}

function QrPanel({
  plans,
  activeIdx,
  setActiveIdx,
  usageMap,
  usageLoading,
  onRefresh,
  trafficOn,
  boundTopupId,
  bindBusy,
  onToggleBind,
}) {
  const scrollerRef = useRef(null);
  const scrollSyncRef = useRef(false);

  const scrollToPlan = useCallback(
    (idx, behavior = "smooth") => {
      const el = scrollerRef.current;
      if (!el || idx < 0 || idx >= plans.length) return;
      const w = el.clientWidth;
      if (w <= 0) return;
      scrollSyncRef.current = true;
      el.scrollTo({ left: idx * w, behavior });
    },
    [plans.length],
  );

  const selectPlan = useCallback(
    (idx) => {
      if (idx < 0 || idx >= plans.length) return;
      scrollSyncRef.current = true;
      setActiveIdx(idx);
      requestAnimationFrame(() => scrollToPlan(idx));
    },
    [plans.length, scrollToPlan, setActiveIdx],
  );

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !plans.length) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== activeIdx && idx >= 0 && idx < plans.length) {
      setActiveIdx(idx);
    }
  };

  useEffect(() => {
    if (scrollSyncRef.current) {
      scrollSyncRef.current = false;
      return;
    }
    scrollToPlan(activeIdx);
  }, [activeIdx, scrollToPlan]);

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

  return (
    <div className="pb-2">
      <PlanPillTabs
        plans={plans}
        activeIdx={activeIdx}
        onSelect={selectPlan}
        usageMap={usageMap}
      />

      {/* 橫向滑動：QR + 用量同一頁 */}
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {plans.map((p) => {
          const planExpired = isEsimUsageExpired(usageForPlan(p, usageMap));
          return (
          <div
            key={p.id}
            className={`snap-center shrink-0 w-full flex flex-col items-center px-4 ${
              planExpired ? "opacity-80 grayscale-[0.15]" : ""
            }`}
          >
            <div className="bg-white border border-gray-100 rounded-2xl p-3 w-[200px] h-[200px] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.name}
                className="w-full h-full object-contain"
              />
            </div>
            {p.iccid ? (
              <p className="mt-2 text-[11px] text-slate-500 font-mono">
                iccid: {p.iccid}
              </p>
            ) : null}
            <EsimDetailAccordion plan={p} />
            <PlanUsageBlock
              plan={p}
              usageMap={usageMap}
              usageLoading={usageLoading}
              onRefresh={onRefresh}
              trafficOn={trafficOn}
              boundTopupId={boundTopupId}
              bindBusy={bindBusy}
              onToggleBind={onToggleBind}
            />
          </div>
          );
        })}
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
            {userName || "Jeko"}
          </p>
          <p className="text-[12px] text-gray-500 truncate mt-0.5">
            {email || "已登入"}
          </p>
        </div>
      </div>
      <JekoPillButton type="button" size="sm" className="mt-3" onClick={onAccount}>
        開啟會員中心
      </JekoPillButton>
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
          <JekoPillButton type="button" size="sm" className="mt-4" onClick={onInstall}>
            安裝到主畫面
          </JekoPillButton>
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
        <JekoPillButton
          href="/promo"
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          前進優惠內容
        </JekoPillButton>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="bg-[#f7f8fa] rounded-2xl p-4">
        <div className="flex items-center justify-between py-1">
          <span className="text-[13px] text-gray-600">您的剩餘點數</span>
          {loading ? (
            <LoadingIndicator layout="inline" label="載入中…" size="xs" />
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
            <LoadingIndicator layout="inline" label="載入中…" size="xs" className="py-2" />
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

      <JekoPillButton href="/promo" size="sm" onClick={onClose}>
        前進優惠內容
      </JekoPillButton>
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

  /** mini＝產品頁橫槓；normal＝五格底欄；expanded＝展開內容 */
  const [sheetSnap, setSheetSnap] = useState("normal");
  const [panel, setPanel] = useState("qr"); // qr | install | promo | buy | jbao
  const [dragY, setDragY] = useState(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const startY = useRef(0);
  const dragging = useRef(false);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [usageMap, setUsageMap] = useState({});
  const [usageLoading, setUsageLoading] = useState(false);
  const [trafficBusy, setTrafficBusy] = useState(false);
  const [trafficOn, setTrafficOn] = useState(false);
  const [boundTopupId, setBoundTopupId] = useState(null);
  const [bindBusy, setBindBusy] = useState(false);
  const [promoCoupons, setPromoCoupons] = useState([]);
  const [promoPoints, setPromoPoints] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  /** 從底欄 J寶進客服後：關閉聊天仍保持展開，且導覽只留優惠／快速購買／QR */
  const [compactNav, setCompactNav] = useState(false);
  const chatFromSheetRef = useRef(false);
  const [showBindHint, setShowBindHint] = useState(false);
  const [offerPwaAfterBindHint, setOfferPwaAfterBindHint] = useState(false);

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

  useEffect(() => {
    setSheetSnap(isProductRoute ? "mini" : "normal");
    setCompactNav(false);
  }, [isProductRoute]);

  const expanded = sheetSnap === "expanded";
  const miniCollapsed = sheetSnap === "mini";
  const snapCollapsedH = miniCollapsed ? COLLAPSED_H_PRODUCT : COLLAPSED_H;

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
    const key = plan.topupId || plan.iccid;
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
      if (res.ok && key) {
        if (!isEsimNotInstalledForUsage(data)) {
          setUsageMap((prev) => ({ ...prev, [key]: data }));
        }
      }
    } catch {
      /* ignore */
    } finally {
      setUsageLoading(false);
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

  // QR 頁：預載目前方案用量（吃到飽會顯示已用；並可把安裝鈕改為已安裝）
  useEffect(() => {
    if (!expanded || !isLoggedIn) return;
    if (panel !== "qr") return;
    const plan = plans[activeIdx];
    if (plan && (plan.topupId || plan.iccid) && !usageForPlan(plan, usageMap)) {
      queryUsage(plan);
    }
  }, [expanded, panel, activeIdx, plans, isLoggedIn, usageMap, queryUsage]);

  // plans 變動時重置 index
  useEffect(() => {
    if (activeIdx >= plans.length) setActiveIdx(0);
  }, [plans.length, activeIdx]);

  const [deviceOs, setDeviceOs] = useState("other");
  useEffect(() => {
    setDeviceOs(detectDeviceLabel().os);
  }, []);

  const activePlan = plans[activeIdx] || null;
  const activeUsage = usageForPlan(activePlan, usageMap);
  const esimExpired = isEsimUsageExpired(activeUsage);
  const esimAlreadyInUse =
    !esimExpired && inferEsimInstalled(activeUsage) === true;
  const esimInstallUrl = useMemo(
    () => (activePlan ? pickInstallUrlForOs(deviceOs, activePlan) : ""),
    [activePlan, deviceOs],
  );
  const hasEsimInstallLinks = Boolean(
    activePlan?.iosInstallUrl || activePlan?.androidInstallUrl,
  );

  const handleEsimOneClickInstall = useCallback(() => {
    if (esimExpired || esimAlreadyInUse) return;
    if (esimInstallUrl) {
      window.open(esimInstallUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (hasEsimInstallLinks) {
      alert("請用手機開啟本頁再點一鍵安裝；電腦請掃描上方 QR Code。");
      setPanel("qr");
      return;
    }
    alert("此方案尚無一鍵安裝連結，請掃描上方 QR Code 安裝。");
    setPanel("qr");
  }, [esimExpired, esimAlreadyInUse, esimInstallUrl, hasEsimInstallLinks]);

  const closeBindHint = useCallback(async () => {
    setShowBindHint(false);
    setPanel("qr");
    setSheetSnap("expanded");
    if (!offerPwaAfterBindHint) return;
    setOfferPwaAfterBindHint(false);
    if (
      typeof window !== "undefined" &&
      window.confirm(
        "流量提醒已開好。\n\n要不要再安裝到主畫面？之後更好找（可略過）。",
      )
    ) {
      try {
        await installPWA();
      } catch {
        /* 略過 */
      }
    }
  }, [offerPwaAfterBindHint, installPWA]);

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

  const refreshBindStatus = useCallback(async () => {
    try {
      const endpoint = await getPushEndpoint();
      if (!endpoint) {
        setBoundTopupId(null);
        return null;
      }
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(
        `/api/push/bind-status?endpoint=${encodeURIComponent(endpoint)}`,
        { headers, credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBoundTopupId(null);
        return null;
      }
      if (data.clearedForeignBind) {
        try {
          const { clearLocalPushBindCache } = await import(
            "@/lib/pushAccountClient"
          );
          clearLocalPushBindCache();
        } catch {
          /* ignore */
        }
      }
      const topup =
        data.bound && data.topupId != null ? String(data.topupId) : null;
      setBoundTopupId(topup);
      return data;
    } catch {
      setBoundTopupId(null);
      return null;
    }
  }, [token]);

  /** 依裝置自動分流：iPhone 先裝 App；Android／電腦直接開通知 */
  const enableTrafficAlert = useCallback(async () => {
    if (trafficBusy) return;
    if (!authReady) return;

    if (isGuest || !isLoggedIn) {
      alert("請先註冊或登入會員，才能開啟流量通知。");
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
        setSheetSnap("expanded");
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

      try {
        const { setTrafficNotifyPref } = await import(
          "@/lib/pushAccountClient"
        );
        setTrafficNotifyPref(true);
      } catch {
        /* ignore */
      }

      setTrafficOn(true);
      const bindData = await refreshBindStatus();
      broadcastPushNotifyState({
        on: true,
        topupId:
          bindData?.bound && bindData?.topupId != null
            ? String(bindData.topupId)
            : null,
        source: "esim-bottom-sheet",
      });

      // 與 data-query 一致：訂閱後在此頁手動選綁（不 silent auto-bind）
      const shouldOfferPwa =
        !isApplePhone &&
        !isStandalone &&
        isInstallable &&
        typeof window !== "undefined";
      setOfferPwaAfterBindHint(shouldOfferPwa);
      setShowBindHint(true);
      setPanel("qr");
      setSheetSnap("expanded");
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
    token,
    router,
    refreshBindStatus,
  ]);

  const disableTrafficAlert = useCallback(async () => {
    if (trafficBusy) return;
    setTrafficBusy(true);
    try {
      const endpoint = await getPushEndpoint();
      if (endpoint) {
        const res = await fetch("/api/push/unbind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 404) {
          throw new Error(data.error || "關閉失敗");
        }
      }

      // 保留 Service Worker 訂閱：關閉再開 PWA 仍可還原「已開通知」；
      // 僅解除 eSIM 綁定。一般優惠推播也不被誤砍。
      try {
        const { setTrafficNotifyPref } = await import(
          "@/lib/pushAccountClient"
        );
        setTrafficNotifyPref(false);
      } catch {
        /* ignore */
      }

      setBoundTopupId(null);
      setTrafficOn(false);
      broadcastPushNotifyState({
        on: false,
        topupId: null,
        source: "esim-bottom-sheet",
      });
      alert("已關閉流量通知。");
    } catch (err) {
      alert(err?.message || "關閉失敗，請再試一次");
    } finally {
      setTrafficBusy(false);
    }
  }, [trafficBusy]);

  const toggleTrafficAlert = useCallback(async () => {
    if (trafficBusy) return;
    if (trafficOn) await disableTrafficAlert();
    else await enableTrafficAlert();
  }, [trafficBusy, trafficOn, disableTrafficAlert, enableTrafficAlert]);

  const toggleEsimBind = useCallback(
    async (plan) => {
      if (bindBusy || !trafficOn || !plan?.topupId) return;
      if (isEsimUsageExpired(usageForPlan(plan, usageMap))) {
        alert("此 eSIM 已過期，無法開啟流量綁定。");
        return;
      }
      setBindBusy(true);
      try {
        const endpoint = await getPushEndpoint();
        if (!endpoint) {
          alert("請先開啟流量通知。");
          return;
        }
        const already =
          String(boundTopupId || "") === String(plan.topupId);

        const label = plan.name || "此 eSIM";

        if (already) {
          const res = await fetch("/api/push/unbind", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || "取消綁定失敗");
          }
          setBoundTopupId(null);
          broadcastPushNotifyState({
            on: true,
            topupId: null,
            source: "esim-bottom-sheet",
          });
          alert(`已關閉「${label}」的流量綁定。`);
          return;
        }

        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/push/bind-esim", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            endpoint,
            topupId: plan.topupId,
            bindMethod: "member_order",
            ...(plan.iccid ? { iccid: plan.iccid } : {}),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || data.hint || "綁定失敗");
        }
        const nextId = String(data.topupId || plan.topupId);
        setBoundTopupId(nextId);
        broadcastPushNotifyState({
          on: true,
          topupId: nextId,
          source: "esim-bottom-sheet",
        });
        alert(
          `已綁定「${label}」。\n流量偏低時會推播提醒您（一次僅監控一張）。`,
        );
      } catch (err) {
        alert(err?.message || "操作失敗，請再試一次");
      } finally {
        setBindBusy(false);
      }
    },
    [bindBusy, trafficOn, boundTopupId, token, usageMap],
  );

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

  // 進頁靜默檢查：以 bind-status／訂閱為準，與會員中心「查詢流量」同步
  useEffect(() => {
    if (!authReady || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const endpoint = await getPushEndpoint();
        if (cancelled) return;

        if (!endpoint) {
          const ctx = getBrowserContext();
          // iPhone 未裝 App 且無訂閱 → 顯示未開
          if (ctx.isIOS && !ctx.isStandalone) {
            setTrafficOn(false);
            setBoundTopupId(null);
          }
          return;
        }

        const permissionOk =
          typeof Notification === "undefined" ||
          Notification.permission === "granted";

        let preferOff = false;
        try {
          const { getTrafficNotifyPref } = await import(
            "@/lib/pushAccountClient"
          );
          preferOff = getTrafficNotifyPref() === "off";
        } catch {
          /* ignore */
        }

        // 使用者曾明確關閉流量通知 → 保留 OFF（仍可讀綁定狀態）
        if (preferOff) {
          setTrafficOn(false);
          if (!cancelled) await refreshBindStatus();
          return;
        }

        if (permissionOk) {
          setTrafficOn(true);
          if (!cancelled) await refreshBindStatus();
          return;
        }

        // 有 endpoint 但權限被關：仍嘗試讀綁定，UI 顯示未開推播
        setTrafficOn(false);
        if (!cancelled) await refreshBindStatus();
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, isLoggedIn, isStandalone, refreshBindStatus]);

  // 與 data-query／首頁推播雙向同步（含綁定 topup）
  useEffect(() => {
    return subscribePushNotifySync((detail) => {
      if (detail?.source === "esim-bottom-sheet") return;
      if (Object.prototype.hasOwnProperty.call(detail || {}, "on")) {
        if (detail.on) {
          setTrafficOn(true);
          refreshBindStatus();
        } else {
          setTrafficOn(false);
          setBoundTopupId(null);
        }
      }
      if (Object.prototype.hasOwnProperty.call(detail || {}, "topupId")) {
        setBoundTopupId(detail.topupId);
        if (detail.topupId) setTrafficOn(true);
      }
    });
  }, [refreshBindStatus]);

  // 切回分頁時重抓綁定（與 data-query 對齊）
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") refreshBindStatus();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [refreshBindStatus]);

  const trafficButtonLabel = (() => {
    if (trafficBusy) return trafficOn ? "關閉中…" : "開啟中…";
    if (trafficOn) return "關閉流量通知";
    if (needsAppleInstall) return "先安裝再通知";
    return "開啟流量通知";
  })();

  const openPanel = (id) => {
    if (id === "jbao") {
      if (!chatOpen) {
        chatFromSheetRef.current = true;
        setCompactNav(true);
        setPanel("qr");
        setSheetSnap("expanded");
      } else if (chatFromSheetRef.current) {
        // 從底欄開啟的客服：關閉後仍回到展開的 QR 主 tab
        chatFromSheetRef.current = true;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(chatOpen ? "jeko:close-ai-chat" : "jeko:open-ai-chat"),
        );
      }
      return;
    }
    setPanel(id);
    setSheetSnap("expanded");
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
    if (sheetSnap === "expanded") {
      setDragY(Math.max(0, delta));
    } else if (sheetSnap === "normal") {
      setDragY(delta);
    } else {
      setDragY(Math.min(0, delta));
    }
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const dy = dragY;
    if (sheetSnap === "expanded") {
      if (dy > 60) setSheetSnap("mini");
    } else if (sheetSnap === "normal") {
      if (dy > 50) setSheetSnap("mini");
      else if (dy < -40) {
        setSheetSnap("expanded");
        if (!panel) setPanel("qr");
      }
    } else if (dy < -40) {
      setSheetSnap("expanded");
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

  useEffect(() => {
    const onVis = (e) => {
      const open = Boolean(e?.detail?.open);
      setChatOpen(open);
      if (!open && chatFromSheetRef.current) {
        chatFromSheetRef.current = false;
        setSheetSnap("expanded");
        setPanel("qr");
        setCompactNav(true);
      }
    };
    window.addEventListener("jeko:ai-chat-visibility", onVis);
    return () => window.removeEventListener("jeko:ai-chat-visibility", onVis);
  }, []);

  useEffect(() => {
    if (sheetSnap !== "expanded") setCompactNav(false);
  }, [sheetSnap]);

  const expandedPx =
    typeof window !== "undefined"
      ? (window.innerHeight *
          (panel === "buy" ? EXPANDED_VH_BUY : EXPANDED_VH)) /
        100
      : 560;

  const height = useMemo(() => {
    if (sheetSnap === "expanded") {
      return Math.max(snapCollapsedH, expandedPx - dragY);
    }
    if (sheetSnap === "normal") {
      if (dragY > 0) {
        return Math.max(COLLAPSED_H_PRODUCT, COLLAPSED_H - dragY);
      }
      if (dragY < 0) {
        return Math.min(expandedPx, COLLAPSED_H - dragY);
      }
      return COLLAPSED_H;
    }
    if (dragY < 0) {
      return Math.min(COLLAPSED_H, COLLAPSED_H_PRODUCT - dragY);
    }
    return COLLAPSED_H_PRODUCT;
  }, [sheetSnap, expandedPx, dragY, snapCollapsedH]);

  const navItems = [
    {
      id: "promo",
      label: "優惠活動",
      Icon: (props) => (
        <MaterialIcon name="local_activity" size={20} {...props} />
      ),
    },
    {
      id: "buy",
      label: "快速購買",
      Icon: (props) => (
        <MaterialIcon name="sim_card" size={20} {...props} />
      ),
    },
    { id: "qr", label: "QR Code", center: true, Icon: IconQr },
    { id: "install", label: "下載 APP", Icon: IconInstall },
    {
      id: "jbao",
      label: "J寶客服",
      Icon: (props) => (
        <MaterialIcon name="smart_toy" size={20} {...props} />
      ),
    },
  ];

  /** 收合時維持 QR 為品牌藍 CTA；展開時跟隨目前功能 */
  const activeNavId = expanded ? panel || "qr" : "qr";

  const visibleNavItems = compactNav
    ? navItems.filter((item) =>
        item.id === "promo" || item.id === "buy" || item.id === "qr",
      )
    : navItems;

  const displayName =
    supabaseUser?.user_metadata?.full_name ||
    session?.user?.name ||
    null;

  if (isShopRoute) return null;

  // 底欄佔位改由 Footer pb 負責；此處若再插 h-[118px] 會在 footer 上方留出大空白
  return (
    <>
      {expanded && (
        <button
          type="button"
          aria-label="關閉面板"
          className="fixed inset-0 bg-black/35 md:hidden"
          style={{ zIndex: SHEET_Z_BACKDROP }}
          onClick={() => setSheetSnap("normal")}
        />
      )}

      <div
        className="fixed bottom-0 left-0 right-0 md:hidden"
        style={{
          zIndex: SHEET_Z_PANEL,
          height,
          transition: dragging.current
            ? "none"
            : "height 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <div className="h-full bg-white rounded-t-[22px] border-t border-slate-200 shadow-none flex flex-col overflow-hidden">
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
              if (sheetSnap === "expanded") {
                setSheetSnap("normal");
              } else {
                setPanel((p) => p || "qr");
                setSheetSnap("expanded");
              }
            }}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={
              sheetSnap === "mini"
                ? "展開我的 eSIM"
                : expanded
                  ? "收合我的 eSIM"
                  : "展開我的 eSIM"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSheetSnap((v) => (v === "expanded" ? "normal" : "expanded"));
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
          <div className="shrink-0 px-2 pt-1 pb-2">
            <LayoutGroup id="esim-sheet-nav">
              <div
                className={`grid items-end gap-0.5 ${
                  compactNav ? "grid-cols-3" : "grid-cols-5"
                }`}
              >
                {visibleNavItems.map((item) => {
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
                      className={`relative flex flex-col items-center gap-0.5 ${
                        item.center ? "-mt-1" : "py-1"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span
                        className={`relative z-0 flex items-center justify-center ${
                          item.center ? "w-[48px] h-[48px]" : "w-9 h-9"
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="esim-sheet-nav-liquid"
                            className="absolute inset-0 rounded-[14px] shadow-none"
                            style={{
                              backgroundColor: JEKO_NAV_BLUE,
                              boxShadow: "none",
                            }}
                            transition={NAV_LIQUID_SPRING}
                            initial={false}
                          />
                        )}
                        <motion.span
                          className="relative z-10 flex items-center justify-center"
                          animate={{
                            color: isActive ? "#ffffff" : "#6b7280",
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
                        className="max-w-full truncate px-0.5 text-center text-[9px] font-semibold leading-tight"
                        animate={{
                          color: isActive ? JEKO_NAV_BLUE : "#6b7280",
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
            <div
              className={
                panel === "buy"
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "flex-1 overflow-y-auto overscroll-contain"
              }
            >
              {!authReady ||
              (isLoggedIn &&
                ordersLoading &&
                panel !== "install" &&
                panel !== "promo" &&
                panel !== "buy") ? (
                <LoadingIndicator layout="center" label="載入中…" className="py-10" />
              ) : panel === "promo" ? (
                <PromoPanel
                  isGuest={isGuest}
                  loading={promoLoading}
                  points={promoPoints}
                  coupons={promoCoupons}
                  onClose={() => setSheetSnap("normal")}
                />
              ) : panel === "buy" ? (
                <div className="min-h-0 flex-1">
                  <EsimQuickBuyPanel onCloseSheet={() => setSheetSnap("normal")} />
                </div>
              ) : isGuest ? (
                <LoginGate />
              ) : panel === "qr" ? (
                <QrPanel
                  plans={plans}
                  activeIdx={activeIdx}
                  setActiveIdx={setActiveIdx}
                  usageMap={usageMap}
                  usageLoading={usageLoading}
                  onRefresh={queryUsage}
                  trafficOn={trafficOn}
                  boundTopupId={boundTopupId}
                  bindBusy={bindBusy}
                  onToggleBind={toggleEsimBind}
                />
              ) : panel === "install" ? (
                <InstallPanel
                  onInstall={handleInstall}
                  isStandalone={isStandalone}
                />
              ) : null}

              {panel === "qr" && isLoggedIn && (
                <div className="px-4 pb-8 pt-2 space-y-1.5">
                  <div className="flex items-stretch gap-2">
                    {!plans.length ? (
                      <JekoPillButton
                        href="/product"
                        size="sm"
                        className="flex-1 min-w-0 basis-0 !min-h-[42px]"
                        onClick={() => setSheetSnap("normal")}
                      >
                        購買 eSIM
                      </JekoPillButton>
                    ) : esimExpired ? (
                      <JekoPillButton
                        type="button"
                        size="sm"
                        className="flex-1 min-w-0 basis-0 !min-h-[42px] !bg-slate-300 !text-slate-600 !shadow-none opacity-90 pointer-events-none"
                        disabled
                        title="此 eSIM 已過期"
                      >
                        此 eSIM 已過期
                      </JekoPillButton>
                    ) : esimAlreadyInUse ? (
                      <JekoPillButton
                        type="button"
                        size="sm"
                        className="flex-1 min-w-0 basis-0 !min-h-[42px] !bg-slate-300 !text-slate-600 !shadow-none opacity-90 pointer-events-none"
                        disabled
                        title="此方案已有用量，無需再安裝"
                      >
                        已安裝／使用中
                      </JekoPillButton>
                    ) : esimInstallUrl ? (
                      <JekoPillButton
                        href={esimInstallUrl}
                        external
                        size="sm"
                        className="flex-1 min-w-0 basis-0 !min-h-[42px]"
                      >
                        一鍵安裝 eSIM
                      </JekoPillButton>
                    ) : (
                      <JekoPillButton
                        type="button"
                        size="sm"
                        className="flex-1 min-w-0 basis-0 !min-h-[42px]"
                        onClick={handleEsimOneClickInstall}
                      >
                        一鍵安裝 eSIM
                      </JekoPillButton>
                    )}
                    <div className="flex-1 min-w-0 basis-0 flex items-center justify-between gap-2 rounded-full border border-slate-200 bg-white px-3 min-h-[42px]">
                      <span className="text-[12px] font-bold text-slate-800 leading-tight truncate">
                        {trafficBusy
                          ? "處理中…"
                          : trafficOn
                            ? "已開啟流量提醒"
                            : needsAppleInstall
                              ? "先安裝再通知"
                              : "流量提醒"}
                      </span>
                      <TrafficNotifyToggle
                        size="md"
                        on={trafficOn}
                        busy={trafficBusy}
                        onClick={toggleTrafficAlert}
                        aria-label={trafficButtonLabel}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 text-center leading-tight">
                    {!plans.length
                      ? trafficOn
                        ? boundTopupId
                          ? "流量通知已開 · 已綁定 eSIM"
                          : "流量通知已開 · 請綁定 eSIM"
                        : needsAppleInstall
                          ? "先安裝再開"
                          : "點右側開關開啟／關閉流量通知"
                      : [
                          esimExpired
                            ? "此 eSIM 已過期"
                            : esimAlreadyInUse
                            ? "左側已安裝（無需再點）"
                            : esimInstallUrl
                              ? deviceOs === "ios"
                                ? "左側一鍵安裝（iOS）"
                                : "左側一鍵安裝（Android）"
                              : hasEsimInstallLinks
                                ? "請用手機開啟以一鍵安裝"
                                : "請掃描上方 QR 安裝",
                          trafficOn
                            ? boundTopupId
                              ? "流量通知已開"
                              : "請綁定 eSIM"
                            : "右側流量通知",
                        ].join(" · ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showBindHint ? (
        <div
          className="fixed inset-0 flex items-center justify-center p-5 bg-black/40"
          style={{ zIndex: SHEET_Z_DIALOG }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="esim-bind-hint-title"
          onClick={closeBindHint}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl bg-white shadow-xl px-5 pt-5 pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-[#EFF6FC] flex items-center justify-center">
                <MaterialIcon
                  name="notifications_active"
                  size={22}
                  className="text-[#1E4AD1]"
                />
              </div>
              <div className="min-w-0">
                <h3
                  id="esim-bind-hint-title"
                  className="text-[15px] font-bold text-slate-900 leading-snug"
                >
                  流量提醒已開啟
                </h3>
                <p className="mt-1.5 text-[13px] text-slate-600 leading-relaxed">
                  請針對需要監控的 eSIM，在方案卡片開啟「eSIM
                  流量綁定」，系統才會在流量偏低時通知您。
                </p>
              </div>
            </div>
            <JekoPillButton
              type="button"
              size="sm"
              className="mt-4 !min-h-[42px]"
              onClick={closeBindHint}
            >
              知道了，去綁定
            </JekoPillButton>
          </div>
        </div>
      ) : null}

      <AppInstallGuideModal
        open={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
      />
    </>
  );
}
