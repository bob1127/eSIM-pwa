"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import AccountIcon from "@/components/account/AccountIcon";
import MaterialIcon from "@/components/MaterialIcon";
import RefundRequestModal from "@/components/refund/RefundRequestModal";
import RefundBlockedModal, {
  refundBlockedFromApi,
} from "@/components/refund/RefundBlockedModal";
import OrderRefundDetailModal from "@/components/refund/OrderRefundDetailModal";
import { useCart } from "@/components/context/CartContext";
import {
  ACCOUNT_UI,
  ACCOUNT_THEME,
  SHOPIFY_BADGE,
} from "@/lib/accountUi";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  ShopifyTabs,
  ShopifyDropdown,
  ShopifyPagination,
} from "@/components/partner/ShopifyControls";
import {
  getRefundEligibility,
  getRefundUiState,
  refundColumnLabel,
  orderItemSummary,
} from "@/lib/refundPolicy";
import {
  runRefundPrecheck,
  enrichOrderFromPrecheck,
} from "@/lib/refundPrecheckClient";
import {
  AccountPageWrap,
  AccountBadge,
  NavyPanel,
} from "./AccountShell";

const PAGE_SIZE = 10;

const UI = {
  dark: ACCOUNT_THEME.dark,
  mid: ACCOUNT_THEME.mid,
  soft: ACCOUNT_THEME.soft,
  border: ACCOUNT_THEME.border,
  light: ACCOUNT_THEME.light,
  wash: ACCOUNT_THEME.wash,
  white: ACCOUNT_THEME.white,
  radius: ACCOUNT_UI.radius,
  radiusSm: ACCOUNT_UI.radiusSm,
};

/** 解析訂單商品列（排除付款 demo 標記） */
function parseOrderLineItems(order) {
  let items = order?.item_details ?? order?.items;
  if (typeof items === "string") {
    try {
      items = JSON.parse(items);
    } catch {
      items = [];
    }
  }
  if (!Array.isArray(items)) items = [];
  return items.filter((i) => i && !i._payment_demo);
}

function productPageHrefFromItem(item) {
  if (!item) return null;
  if (item.href) return item.href;
  const slug = item.slug || item.handle;
  const cat = item.categorySlug || item.category || item.category_slug;
  if (cat && slug) return `/product/${cat}/${slug}`;
  if (slug) return `/product/${slug}`;
  return null;
}

/**
 * 再次購買：把原訂單方案加回購物車並導向結帳；
 * 若缺 planId／規格則改開商品頁（或首頁）。
 */
function useBuyAgain(order) {
  const cart = useCart();
  const addToCart = cart?.addToCart;

  return useCallback(() => {
    const lines = parseOrderLineItems(order);
    const firstHref = productPageHrefFromItem(lines[0]);

    const canCheckout = lines.some(
      (i) => i.planId || i.plan_id || i.variant_id || i.variantId || i.id,
    );

    if (canCheckout && typeof addToCart === "function" && lines.length > 0) {
      lines.forEach((item) => {
        addToCart(
          {
            id: item.variant_id || item.variantId || item.id,
            variant_id: item.variant_id || item.variantId || item.id,
            parentId: item.parentId || item.parent_id || null,
            name: item.name || item.productName || item.title || "eSIM 方案",
            price: Number(item.price) || 0,
            sku: item.sku || null,
            planId: item.planId || item.plan_id || null,
            image: item.image || item.thumbnail || "/images/jeko-esim.png",
            slug: item.slug || item.handle || null,
            categorySlug:
              item.categorySlug || item.category || item.category_slug || null,
            href: productPageHrefFromItem(item),
            quantity: Math.max(1, Number(item.quantity) || 1),
            options: item.options || item.specLabel || "",
            specLabel: item.specLabel || item.options || "",
            type: item.type || "esim",
            store_id: item.store_id || null,
            telecom: item.telecom,
            days: item.days,
            data_amount: item.data_amount,
          },
          { open: false },
        );
      });

      const hasPlan = lines.some((i) => i.planId || i.plan_id);
      try {
        window.dispatchEvent(new Event("open-cart-sidebar"));
      } catch {
        /* ignore */
      }

      // 有 planId 可直接結帳；否則開商品頁讓使用者重選規格
      if (hasPlan) {
        window.location.assign("/checkout");
        return;
      }
      if (firstHref) {
        window.location.assign(firstHref);
        return;
      }
      window.location.assign("/checkout");
      return;
    }

    if (firstHref) {
      window.location.assign(firstHref);
      return;
    }
    window.location.assign("/");
  }, [order, addToCart]);
}

function getEsimQRCodes(order) {
  if (!order?.qrcode_data) return [];
  let data = order.qrcode_data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data = [data];
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const cleanSrc = String(item.qrcodeUrl || item.src || "")
        .split(",")[0]
        .trim();
      return {
        name: item.productName || item.name || "eSIM 方案",
        src: cleanSrc,
        topupId: item.topupId || item.topup_id || "—",
        iccid: item.iccid || item.ICCID || null,
      };
    })
    .filter((item) => item.src);
}

function getEsimIccids(order) {
  if (!order?.qrcode_data) return [];
  let data = order.qrcode_data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (data && typeof data === "object" && !Array.isArray(data)) data = [data];
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      const src = String(item.qrcodeUrl || item.src || "");
      const fromUrl = (src.match(/\/(\d{18,22})(?:\?|$)/) || [])[1] || null;
      return {
        name: item.productName || item.name || "eSIM 方案",
        iccid: item.iccid || item.ICCID || fromUrl || null,
        topupId: item.topupId || item.topup_id || null,
      };
    })
    .filter((item) => item.iccid || item.topupId);
}

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  refund_pending: "warning",
  refunded: "neutral",
  cancelled: "neutral",
  failed: "critical",
};

const STATUS_LABEL = {
  completed: "已發貨",
  pending: "待付款",
  refund_pending: "退款審核",
  refunded: "已退款",
  cancelled: "已取消",
  failed: "失敗",
};

function statusMeta(status) {
  const s = String(status || "").toLowerCase();
  return {
    label: STATUS_LABEL[s] || status,
    tone: STATUS_TONE[s] || "neutral",
    icon:
      s === "completed"
        ? "check_circle"
        : s === "pending"
          ? "schedule"
          : s === "refund_pending" || s === "failed"
            ? "error"
            : s === "refunded"
              ? "undo"
              : "help",
    flag: ["pending", "refund_pending", "failed"].includes(s),
  };
}

function formatNTD(val) {
  return Math.round(Number(val) || 0).toLocaleString("zh-TW");
}

function formatDateFull(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const wd = ["日", "一", "二", "三", "四", "五", "六"][dt.getDay()];
  return `${dt.getFullYear()}/${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}（${wd}）`;
}

function monthKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}`;
}

function parsePaymentInfo(order) {
  let info = order?.payment_info;
  if (!info && Array.isArray(order?.item_details)) {
    const demo = order.item_details.find((i) => i?._payment_demo)?._payment_demo;
    if (demo && typeof demo === "object") info = demo;
  }
  if (!info) return null;
  if (typeof info === "string") {
    try {
      info = JSON.parse(info);
    } catch {
      return null;
    }
  }
  return info && typeof info === "object" ? info : null;
}

function paymentLabel(info) {
  if (!info) return "";
  if (info.payment_method_label) return info.payment_method_label;
  const t = String(info.payment_type || "").toUpperCase();
  if (t === "CVS") return "超商代碼繳費";
  if (t === "VACC") return "ATM 轉帳";
  if (t === "BARCODE") return "超商條碼繳費";
  return info.payment_type || "待付款";
}

function orderShortId(id) {
  return String(id || "").slice(0, 8).toUpperCase();
}

function SecondaryBtn({ children, onClick, href, disabled, className = "" }) {
  const style = {
    backgroundColor: "#fafafa",
    color: "#303030",
    border: "1px solid #8a8a8a",
    borderRadius: "0.5rem",
  };
  const cls = `inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[13px] font-semibold transition disabled:opacity-40 ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cls}
      style={style}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, onClick, href, className = "" }) {
  const style = {
    backgroundColor: UI.dark,
    borderRadius: "0.5rem",
  };
  const cls = `inline-flex items-center justify-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold text-white transition ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {children}
    </button>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: UI.white,
        border: `1px solid ${UI.border}`,
        borderRadius: UI.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ModalShell({ title, eyebrow, onClose, children, maxW = "max-w-md" }) {
  return (
    <div className={ACCOUNT_UI.modalOverlay}>
      <div
        className={`bg-white shadow-xl ${maxW} w-full max-h-[90vh] overflow-y-auto`}
        style={{ borderRadius: "0.75rem" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${UI.border}` }}
        >
          <div>
            {eyebrow ? (
              <p
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: SHOPIFY_BADGE.warning.text }}
              >
                {eyebrow}
              </p>
            ) : null}
            <h3 className="font-bold" style={{ color: UI.dark }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center transition"
            style={{
              borderRadius: UI.radiusSm,
              color: UI.soft,
              backgroundColor: UI.light,
            }}
            aria-label="關閉"
          >
            <AccountIcon name="close" size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function PendingPaymentModal({ order, onClose }) {
  const pay = parsePaymentInfo(order);
  const code = pay?.code_no || pay?.payment_no || "";
  const isCvs = String(pay?.payment_type || "").toUpperCase() === "CVS";

  const copyCode = () => {
    if (code && navigator.clipboard) navigator.clipboard.writeText(code);
  };

  return (
    <ModalShell
      title={`訂單 #${orderShortId(order.id)}`}
      eyebrow="待付款"
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm" style={{ color: UI.mid }}>
          {orderItemSummary(order)} · NT$ {formatNTD(order.total_amount)}
        </p>
        {pay ? (
          <>
            <div
              className="p-4 space-y-3"
              style={{
                backgroundColor: "#fffbeb",
                border: `1px solid ${SHOPIFY_BADGE.warning.bg}`,
                borderRadius: UI.radius,
              }}
            >
              <div className="flex items-center gap-2">
                <AccountIcon
                  name="store"
                  size={22}
                  style={{ color: SHOPIFY_BADGE.warning.dot }}
                />
                <span
                  className="font-bold"
                  style={{ color: SHOPIFY_BADGE.warning.text }}
                >
                  {paymentLabel(pay)}
                </span>
              </div>
              {isCvs && pay.store_type ? (
                <p className="text-sm" style={{ color: UI.mid }}>
                  <span style={{ color: UI.soft }}>超商別：</span>
                  {pay.store_type}
                </p>
              ) : null}
              {code ? (
                <div>
                  <p className="text-xs mb-1" style={{ color: UI.soft }}>
                    繳費代碼
                  </p>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-lg font-bold tracking-wider px-3 py-2"
                      style={{
                        backgroundColor: UI.white,
                        border: `1px solid ${UI.border}`,
                        borderRadius: UI.radiusSm,
                        color: UI.dark,
                      }}
                    >
                      {code}
                    </code>
                    <SecondaryBtn onClick={copyCode}>複製</SecondaryBtn>
                  </div>
                </div>
              ) : null}
              {pay.expire_date ? (
                <p
                  className="text-sm font-medium"
                  style={{ color: SHOPIFY_BADGE.critical.dot }}
                >
                  繳費期限：{pay.expire_date}
                </p>
              ) : null}
              {pay.trade_no ? (
                <p className="text-xs" style={{ color: UI.soft }}>
                  交易序號：{pay.trade_no}
                </p>
              ) : null}
            </div>
            <p className="text-xs leading-relaxed" style={{ color: UI.soft }}>
              請至指定超商多媒體機台輸入代碼完成繳費。付款成功後 eSIM QR Code
              將自動發送至您的 Email，並於此頁更新為「已發貨」。
            </p>
          </>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: UI.soft }}>
            尚未取得繳費代碼，請聯絡客服或重新下單。
          </p>
        )}
      </div>
    </ModalShell>
  );
}

function QrModal({ order, onClose }) {
  const qrs = getEsimQRCodes(order);
  return (
    <ModalShell
      title={`訂單 #${orderShortId(order.id)} · QR Code`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {qrs.length ? (
          qrs.map((qr) => (
            <div
              key={qr.src}
              className="text-center p-4"
              style={{
                border: `1px solid ${UI.border}`,
                borderRadius: UI.radius,
              }}
            >
              <p
                className="text-sm font-bold mb-3"
                style={{ color: UI.dark }}
              >
                {qr.name}
              </p>
              <img
                src={qr.src}
                alt="eSIM QR Code"
                className="w-52 h-52 mx-auto object-contain select-none"
                style={{
                  border: `1px solid ${UI.border}`,
                  borderRadius: UI.radiusSm,
                }}
                draggable={false}
              />
              <p
                className="text-[10px] mt-2 font-mono"
                style={{ color: UI.soft }}
              >
                {qr.topupId}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-center py-6" style={{ color: UI.soft }}>
            QR Code 處理中，稍後請重新整理
          </p>
        )}
        <div
          className="p-3 text-xs leading-relaxed space-y-1.5"
          style={{
            backgroundColor: "#e0f0ff",
            borderRadius: UI.radiusSm,
            color: UI.mid,
          }}
        >
          <p className="font-bold" style={{ color: UI.dark }}>
            安裝方式
          </p>
          <p>
            iPhone / iPad：長按上方 QR Code 圖片 → 選擇「加入 eSIM」或「加入行動方案」即可安裝。
          </p>
          <p>或使用相機 App 對準此 QR Code 掃描。</p>
          <p>
            Android：截圖後至「設定 → SIM 卡 → 下載 SIM 卡」掃描截圖中的 QR
            Code。
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

/** 單筆訂單明細 — 比照 Shopify 訂單詳情雙欄 */
function OrderDetailView({
  order,
  onBack,
  onRefresh,
  getAuthHeaders,
  onTabChange,
}) {
  const meta = statusMeta(order.status);
  const qrs = getEsimQRCodes(order);
  const eligibility = getRefundEligibility(order);
  const refundUi = getRefundUiState(order);
  const payInfo = parsePaymentInfo(order);
  const isPending = String(order.status).toLowerCase() === "pending";
  const buyAgain = useBuyAgain(order);

  const [refundOrder, setRefundOrder] = useState(null);
  const [refundPrecheck, setRefundPrecheck] = useState(null);
  const [refundBlocked, setRefundBlocked] = useState(null);
  const [refundChecking, setRefundChecking] = useState(false);
  const [refundDetailOrder, setRefundDetailOrder] = useState(null);

  const beginRefund = async (target) => {
    if (!target || refundChecking) return;
    setRefundChecking(true);
    try {
      const data = await runRefundPrecheck(target, getAuthHeaders);
      if (!data.ok) {
        setRefundBlocked(refundBlockedFromApi(data));
        return;
      }
      setRefundPrecheck(data);
      setRefundOrder(enrichOrderFromPrecheck(target, data));
    } catch (e) {
      setRefundBlocked({
        title: "無法檢查退款資格",
        message: e.message || "請稍後再試",
      });
    } finally {
      setRefundChecking(false);
    }
  };

  const items = parseOrderLineItems(order);

  const iccidList = getEsimIccids(order);

  const moreItems = [
    {
      id: "traffic",
      label: "查詢流量",
      icon: "speed",
      onClick: () => onTabChange?.("traffic"),
    },
    {
      id: "support",
      label: "安裝與支援",
      icon: "help_center",
      onClick: () => onTabChange?.("support"),
    },
    { divider: true },
    {
      id: "buy",
      label: "再次購買",
      icon: "add_shopping_cart",
      onClick: buyAgain,
    },
  ];

  return (
    <AccountPageWrap>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-bold mb-4 hover:underline"
        style={{ color: UI.dark }}
      >
        <AccountIcon name="arrow_back" size={18} />
        訂單
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-[24px] font-bold tracking-tight"
              style={{ color: UI.dark }}
            >
              #{orderShortId(order.id)}
            </h1>
            <AccountBadge tone={meta.tone}>{meta.label}</AccountBadge>
            {refundUi.badge ? (
              <AccountBadge tone="warning">{refundUi.badge.label}</AccountBadge>
            ) : null}
          </div>
          <p className="text-xs mt-1.5" style={{ color: UI.soft }}>
            {formatDateFull(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {eligibility.canApply || eligibility.code === "NATIVE_ESIM" ? (
            <SecondaryBtn
              onClick={() => beginRefund(order)}
              disabled={refundChecking}
            >
              <AccountIcon name="undo" size={16} />
              {refundChecking ? "檢查中…" : "申請退款"}
            </SecondaryBtn>
          ) : null}
          {qrs.length > 0 ? (
            <SecondaryBtn
              onClick={() => {
                /* scroll handled by section */
              }}
              href="#esim-qr"
            >
              <AccountIcon name="qr_code_2" size={16} />
              QR Code
            </SecondaryBtn>
          ) : null}
          <ShopifyDropdown variant="account" label="更多操作" items={moreItems} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-4">
        <div className="space-y-4 min-w-0">
          {/* 方案內容 — Fulfillment 風格 */}
          <Card>
            <div
              className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-2"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <div className="flex items-center gap-2">
                <AccountIcon
                  name="sim_card"
                  size={18}
                  style={{ color: UI.mid }}
                />
                <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                  方案內容
                </h3>
              </div>
              <AccountBadge tone={meta.tone}>{meta.label}</AccountBadge>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-3"
                    style={{
                      backgroundColor: UI.light,
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: UI.white,
                        borderRadius: UI.radiusSm,
                        border: `1px solid ${UI.border}`,
                      }}
                    >
                      <AccountIcon
                        name="sim_card"
                        size={22}
                        style={{ color: UI.dark }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-sm"
                        style={{ color: UI.dark }}
                      >
                        {item.name || item.productName || "eSIM 方案"}
                      </p>
                      {item.quantity && item.quantity > 1 ? (
                        <p className="text-xs" style={{ color: UI.soft }}>
                          x{item.quantity}
                        </p>
                      ) : null}
                    </div>
                    <p
                      className="font-bold text-sm"
                      style={{ color: UI.dark }}
                    >
                      NT${" "}
                      {formatNTD(
                        item.unit_price || item.price || order.total_amount,
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <div
                  className="flex items-center gap-3 p-3"
                  style={{
                    backgroundColor: UI.light,
                    borderRadius: UI.radiusSm,
                  }}
                >
                  <AccountIcon
                    name="sim_card"
                    size={22}
                    style={{ color: UI.dark }}
                  />
                  <p className="font-bold text-sm" style={{ color: UI.dark }}>
                    {orderItemSummary(order)}
                  </p>
                </div>
              )}

              <div
                className="flex flex-wrap items-center justify-end gap-2 pt-3"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                {qrs.length > 0 ? (
                  <SecondaryBtn onClick={() => onTabChange?.("traffic")}>
                    <AccountIcon name="speed" size={16} />
                    查詢流量
                  </SecondaryBtn>
                ) : null}
                <PrimaryBtn onClick={buyAgain}>再次購買</PrimaryBtn>
              </div>
            </div>
          </Card>

          {/* 付款摘要 */}
          <Card>
            <div
              className="px-4 sm:px-5 py-3.5"
              style={{ borderBottom: `1px solid ${UI.border}` }}
            >
              <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                付款
              </h3>
            </div>
            <div className="p-4 sm:p-5 text-sm">
              <dl className="space-y-0">
                {[
                  {
                    label: "小計",
                    value: `NT$ ${formatNTD(order.total_amount)}`,
                  },
                  payInfo
                    ? {
                        label: "付款方式",
                        value: paymentLabel(payInfo),
                      }
                    : null,
                ]
                  .filter(Boolean)
                  .map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 items-baseline py-2"
                      style={{ borderBottom: `1px solid ${UI.border}` }}
                    >
                      <dt style={{ color: UI.soft }}>{row.label}</dt>
                      <dd
                        className="text-right tabular-nums font-medium"
                        style={{ color: UI.dark }}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 items-baseline py-2.5">
                  <dt className="font-bold" style={{ color: UI.dark }}>
                    總計
                  </dt>
                  <dd
                    className="text-right tabular-nums font-bold text-lg"
                    style={{ color: UI.dark }}
                  >
                    NT$ {formatNTD(order.total_amount)}
                  </dd>
                </div>
                <div
                  className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 items-baseline py-2"
                  style={{ borderTop: `1px solid ${UI.border}` }}
                >
                  <dt style={{ color: UI.soft }}>
                    {isPending ? "待付款" : "已付款"}
                  </dt>
                  <dd
                    className="text-right tabular-nums font-bold"
                    style={{ color: UI.dark }}
                  >
                    {isPending
                      ? "NT$ 0"
                      : `NT$ ${formatNTD(order.total_amount)}`}
                  </dd>
                </div>
              </dl>
            </div>

            {isPending && payInfo ? (
              <div
                className="px-4 sm:px-5 py-4"
                style={{
                  borderTop: `1px solid ${UI.border}`,
                  backgroundColor: "#fffbeb",
                }}
              >
                <p
                  className="text-xs font-bold uppercase mb-2"
                  style={{ color: SHOPIFY_BADGE.warning.text }}
                >
                  繳費資訊
                </p>
                {(payInfo.code_no || payInfo.payment_no) && (
                  <div className="flex items-center gap-3">
                    <code
                      className="flex-1 text-base font-bold tracking-wider px-3 py-2"
                      style={{
                        backgroundColor: UI.white,
                        border: `1px solid ${UI.border}`,
                        borderRadius: UI.radiusSm,
                        color: UI.dark,
                      }}
                    >
                      {payInfo.code_no || payInfo.payment_no}
                    </code>
                    <SecondaryBtn
                      onClick={() =>
                        navigator.clipboard?.writeText(
                          payInfo.code_no || payInfo.payment_no,
                        )
                      }
                    >
                      複製
                    </SecondaryBtn>
                  </div>
                )}
                {payInfo.expire_date ? (
                  <p
                    className="text-sm font-medium mt-2"
                    style={{ color: SHOPIFY_BADGE.critical.dot }}
                  >
                    繳費期限：{payInfo.expire_date}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>

          {/* QR Code */}
          {qrs.length > 0 ? (
            <Card>
              <div
                id="esim-qr"
                className="px-4 sm:px-5 py-3.5"
                style={{ borderBottom: `1px solid ${UI.border}` }}
              >
                <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                  eSIM QR Code
                </h3>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {qrs.map((qr) => (
                    <div
                      key={qr.src}
                      className="text-center p-4"
                      style={{
                        border: `1px solid ${UI.border}`,
                        borderRadius: UI.radius,
                        backgroundColor: UI.wash,
                      }}
                    >
                      <p
                        className="text-sm font-bold mb-3"
                        style={{ color: UI.dark }}
                      >
                        {qr.name}
                      </p>
                      <img
                        src={qr.src}
                        alt="eSIM QR Code"
                        className="w-52 h-52 mx-auto object-contain select-none"
                        style={{
                          border: `1px solid ${UI.border}`,
                          borderRadius: UI.radiusSm,
                          backgroundColor: UI.white,
                        }}
                        draggable={false}
                      />
                      <p
                        className="text-[10px] mt-2 font-mono"
                        style={{ color: UI.soft }}
                      >
                        {qr.topupId}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="mt-4 p-3 text-xs leading-relaxed space-y-1.5"
                  style={{
                    backgroundColor: "#e0f0ff",
                    borderRadius: UI.radiusSm,
                    color: UI.mid,
                  }}
                >
                  <p className="font-bold" style={{ color: UI.dark }}>
                    安裝方式
                  </p>
                  <p>
                    iPhone / iPad：長按上方 QR Code 圖片 → 選擇「加入 eSIM」即可安裝。
                  </p>
                  <p>
                    Android：截圖後至「設定 → SIM 卡 → 下載 SIM 卡」掃描截圖。
                  </p>
                </div>
              </div>
            </Card>
          ) : null}

          {/* ICCID / 流量 */}
          {(iccidList.length > 0 || qrs.length > 0) && (
            <Card>
              <div
                className="px-4 sm:px-5 py-3.5"
                style={{ borderBottom: `1px solid ${UI.border}` }}
              >
                <h3 className="text-sm font-bold" style={{ color: UI.dark }}>
                  eSIM 識別碼 & 流量通知
                </h3>
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className="flex flex-col items-center text-center p-4"
                  style={{
                    backgroundColor: UI.light,
                    borderRadius: UI.radius,
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: "#2c6ecb",
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    <AccountIcon
                      name="sim_card"
                      size={20}
                      className="text-white"
                    />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: UI.dark }}>
                    ICCID
                  </p>
                  <p className="text-xs mb-3" style={{ color: UI.soft }}>
                    eSIM 唯一識別碼
                  </p>
                  {iccidList.length > 0 ? (
                    <div className="w-full space-y-1.5">
                      {iccidList.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5"
                          style={{
                            backgroundColor: UI.white,
                            border: `1px solid ${UI.border}`,
                            borderRadius: UI.radiusSm,
                          }}
                        >
                          <p
                            className="text-[10px] truncate"
                            style={{ color: UI.soft }}
                          >
                            {item.name}
                          </p>
                          <p
                            className="text-xs font-mono font-bold break-all"
                            style={{ color: UI.dark }}
                          >
                            {item.iccid || `Topup: ${item.topupId}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic" style={{ color: UI.soft }}>
                      系統將在綁定後顯示
                    </p>
                  )}
                </div>

                <div
                  className="flex flex-col items-center text-center p-4"
                  style={{
                    backgroundColor: UI.light,
                    borderRadius: UI.radius,
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: "#008060",
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    <AccountIcon
                      name="notifications_active"
                      size={20}
                      className="text-white"
                    />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: UI.dark }}>
                    流量提醒
                  </p>
                  <p className="text-xs mb-3" style={{ color: UI.soft }}>
                    流量偏低時自動推播
                  </p>
                  <PrimaryBtn
                    onClick={() => onTabChange?.("traffic")}
                    className="mt-auto"
                  >
                    開啟流量通知
                  </PrimaryBtn>
                </div>

                <div
                  className="flex flex-col items-center text-center p-4"
                  style={{
                    backgroundColor: UI.light,
                    borderRadius: UI.radius,
                  }}
                >
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: "#eec200",
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    <AccountIcon
                      name="speed"
                      size={20}
                      className="text-white"
                    />
                  </div>
                  <p className="text-sm font-bold mb-1" style={{ color: UI.dark }}>
                    查詢流量
                  </p>
                  <p className="text-xs mb-3" style={{ color: UI.soft }}>
                    查看剩餘流量
                  </p>
                  <SecondaryBtn
                    onClick={() => onTabChange?.("traffic")}
                    className="mt-auto"
                  >
                    前往查詢
                  </SecondaryBtn>
                </div>
              </div>
            </Card>
          )}

          {refundUi.badge ? (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center gap-3 flex-wrap">
                <AccountBadge tone="warning">{refundUi.badge.label}</AccountBadge>
                <button
                  type="button"
                  onClick={() => setRefundDetailOrder(order)}
                  className="text-xs font-bold hover:underline"
                  style={{ color: UI.dark }}
                >
                  查看退款詳情
                </button>
              </div>
            </Card>
          ) : null}
        </div>

        {/* 右側 — Customer / Notes */}
        <aside className="space-y-4 min-w-0">
          <NavyPanel title="顧客" icon="person">
            <dl className="space-y-0 text-sm">
              <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-2 items-start">
                <dt
                  className="text-[11px] font-bold uppercase tracking-wider pt-0.5"
                  style={{ color: UI.soft }}
                >
                  Email
                </dt>
                <dd
                  className="break-all font-medium text-right sm:text-left"
                  style={{ color: UI.dark }}
                >
                  {order.customer_email || "—"}
                </dd>
              </div>
              <div
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-2 items-center"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                <dt
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: UI.soft }}
                >
                  狀態
                </dt>
                <dd className="flex justify-end sm:justify-start">
                  <AccountBadge tone={meta.tone}>{meta.label}</AccountBadge>
                </dd>
              </div>
              <div
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2 py-2 items-baseline"
                style={{ borderTop: `1px solid ${UI.border}` }}
              >
                <dt
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: UI.soft }}
                >
                  金額
                </dt>
                <dd
                  className="font-bold tabular-nums text-right sm:text-left"
                  style={{ color: UI.dark }}
                >
                  NT$ {formatNTD(order.total_amount)}
                </dd>
              </div>
            </dl>
          </NavyPanel>

          <NavyPanel title="快捷操作" icon="bolt">
            <div className="space-y-2">
              {qrs.length > 0 ? (
                <SecondaryBtn
                  onClick={() => onTabChange?.("traffic")}
                  className="w-full"
                >
                  <AccountIcon name="speed" size={16} />
                  查詢流量
                </SecondaryBtn>
              ) : null}
              {eligibility.canApply || eligibility.code === "NATIVE_ESIM" ? (
                <SecondaryBtn
                  onClick={() => beginRefund(order)}
                  className="w-full"
                  disabled={refundChecking}
                >
                  <AccountIcon name="undo" size={16} />
                  {refundChecking ? "檢查中…" : "申請退款"}
                </SecondaryBtn>
              ) : null}
              <PrimaryBtn onClick={buyAgain} className="w-full">
                <AccountIcon name="add" size={16} />
                再次購買
              </PrimaryBtn>
            </div>
          </NavyPanel>

          <NavyPanel title="需要協助？" icon="support_agent">
            <div className="space-y-1 text-sm">
              <Link
                href="/faq"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-[#f6f6f7] font-medium"
                style={{ color: UI.dark }}
              >
                <AccountIcon name="menu_book" size={18} style={{ color: UI.mid }} />
                eSIM 安裝指南
              </Link>
              <Link
                href="/refund-policy"
                className="flex items-center gap-2 p-2 rounded-md hover:bg-[#f6f6f7] font-medium"
                style={{ color: UI.dark }}
              >
                <AccountIcon name="policy" size={18} style={{ color: UI.mid }} />
                退換貨政策
              </Link>
            </div>
          </NavyPanel>
        </aside>
      </div>

      {refundDetailOrder && (
        <OrderRefundDetailModal
          order={refundDetailOrder}
          onClose={() => setRefundDetailOrder(null)}
          onReapply={(o) => {
            setRefundDetailOrder(null);
            beginRefund(o);
          }}
        />
      )}
      {refundBlocked && (
        <RefundBlockedModal
          title={refundBlocked.title}
          message={refundBlocked.message}
          footnote={refundBlocked.footnote}
          showLineCta={refundBlocked.showLineCta}
          lineUrl={refundBlocked.lineUrl}
          onClose={() => setRefundBlocked(null)}
        />
      )}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          precheck={refundPrecheck}
          onClose={() => {
            setRefundOrder(null);
            setRefundPrecheck(null);
          }}
          onSuccess={() => {
            setRefundOrder(null);
            setRefundPrecheck(null);
            onRefresh?.();
          }}
          onBlocked={(payload) => {
            setRefundOrder(null);
            setRefundPrecheck(null);
            setRefundBlocked(payload);
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </AccountPageWrap>
  );
}

export default function AccountOrdersView({
  orders,
  loading,
  onRefresh,
  getAuthHeaders,
  onTabChange,
  initialDetailOrder,
}) {
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(() => new Set());
  const [page, setPage] = useState(1);
  const [qrOrder, setQrOrder] = useState(null);
  const [refundOrder, setRefundOrder] = useState(null);
  const [refundPrecheck, setRefundPrecheck] = useState(null);
  const [refundBlocked, setRefundBlocked] = useState(null);
  const [refundChecking, setRefundChecking] = useState(false);
  const [refundDetailOrder, setRefundDetailOrder] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [detailOrder, setDetailOrder] = useState(initialDetailOrder || null);

  const beginRefund = async (target) => {
    if (!target || refundChecking) return;
    setRefundChecking(true);
    try {
      const data = await runRefundPrecheck(target, getAuthHeaders);
      if (!data.ok) {
        setRefundBlocked(refundBlockedFromApi(data));
        return;
      }
      setRefundPrecheck(data);
      setRefundOrder(enrichOrderFromPrecheck(target, data));
    } catch (e) {
      setRefundBlocked({
        title: "無法檢查退款資格",
        message: e.message || "請稍後再試",
      });
    } finally {
      setRefundChecking(false);
    }
  };

  useEffect(() => {
    if (initialDetailOrder) setDetailOrder(initialDetailOrder);
  }, [initialDetailOrder]);

  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );

  const counts = useMemo(() => {
    const list = orders || [];
    return {
      all: list.length,
      completed: list.filter((o) => o.status === "completed").length,
      pending: list.filter((o) => o.status === "pending").length,
      refund: list.filter((o) =>
        ["refund_pending", "refunded"].includes(String(o.status).toLowerCase()),
      ).length,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = [...(orders || [])];
    const q = search.trim().toLowerCase();

    if (tab === "completed") list = list.filter((o) => o.status === "completed");
    else if (tab === "pending")
      list = list.filter((o) => o.status === "pending");
    else if (tab === "refund") {
      list = list.filter((o) =>
        ["refund_pending", "refunded"].includes(String(o.status).toLowerCase()),
      );
    }

    if (statusFilter) list = list.filter((o) => o.status === statusFilter);

    if (monthFilter === "this") {
      list = list.filter((o) => monthKey(o.created_at) === thisMonth);
    } else if (monthFilter === "last") {
      list = list.filter((o) => monthKey(o.created_at) === lastMonth);
    }

    if (q) {
      list = list.filter(
        (o) =>
          String(o.id).includes(q) ||
          orderItemSummary(o).toLowerCase().includes(q) ||
          (o.customer_email || "").toLowerCase().includes(q),
      );
    }

    if (sort === "newest") {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === "amount") {
      list.sort(
        (a, b) => (Number(b.total_amount) || 0) - (Number(a.total_amount) || 0),
      );
    }
    return list;
  }, [
    orders,
    tab,
    search,
    statusFilter,
    monthFilter,
    sort,
    thisMonth,
    lastMonth,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const allChecked =
    paged.length > 0 && paged.every((o) => selected.has(o.id));
  const someChecked =
    paged.some((o) => selected.has(o.id)) && !allChecked;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) paged.forEach((o) => next.delete(o.id));
      else paged.forEach((o) => next.add(o.id));
      return next;
    });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setMonthFilter("all");
    setTab("all");
    setPage(1);
  };

  const exportCsv = () => {
    const rows = [
      ["訂單編號", "方案", "Email", "金額", "狀態", "購買日"],
      ...filtered.map((o) => [
        o.id,
        orderItemSummary(o),
        o.customer_email || "",
        o.total_amount,
        o.status,
        o.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "esim-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (detailOrder) {
    return (
      <OrderDetailView
        order={detailOrder}
        onBack={() => setDetailOrder(null)}
        onRefresh={onRefresh}
        getAuthHeaders={getAuthHeaders}
        onTabChange={onTabChange}
      />
    );
  }

  const filterTabs = [
    { id: "all", label: "全部", count: counts.all },
    { id: "completed", label: "已發貨", count: counts.completed },
    { id: "pending", label: "待付款", count: counts.pending },
    { id: "refund", label: "退款相關", count: counts.refund },
  ];

  const moreMenu = [
    {
      id: "refresh",
      label: "重新整理",
      icon: "refresh",
      onClick: () => onRefresh?.(),
    },
    {
      id: "traffic",
      label: "查詢流量",
      icon: "speed",
      onClick: () => onTabChange?.("traffic"),
    },
    { divider: true },
    {
      id: "buy",
      label: "選購 eSIM",
      icon: "add_shopping_cart",
      onClick: () => {
        window.location.href = "/";
      },
    },
  ];

  const inputStyle = {
    border: `1px solid ${UI.border}`,
    borderRadius: UI.radiusSm,
    color: UI.dark,
    backgroundColor: UI.white,
  };

  return (
    <AccountPageWrap>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <h1
            className="text-xl font-bold tracking-tight"
            style={{ color: UI.dark }}
          >
            我的 eSIM 訂單
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: UI.mid }}>
            查看發貨狀態、QR Code、繳費代碼與退款申請
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SecondaryBtn onClick={exportCsv} disabled={!filtered.length}>
            <AccountIcon name="download" size={16} />
            匯出 CSV
          </SecondaryBtn>
          <ShopifyDropdown variant="account" label="更多操作" items={moreMenu} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-3 sm:px-4 pt-1 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <ShopifyTabs
              tabs={filterTabs}
              value={tab}
              onChange={(id) => {
                setTab(id);
                setPage(1);
                setSelected(new Set());
              }}
            />
          </div>
          {selected.size > 0 ? (
            <span
              className="hidden sm:inline-flex text-xs font-bold shrink-0 px-2.5 py-1"
              style={{
                backgroundColor: UI.light,
                color: UI.dark,
                borderRadius: UI.radiusSm,
              }}
            >
              已選取 {selected.size}
            </span>
          ) : null}
        </div>

        <div
          className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row gap-2"
          style={{ borderTop: `1px solid ${UI.border}` }}
        >
          <div className="flex-1 relative">
            <AccountIcon
              name="search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: UI.soft }}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="搜尋訂單編號、方案、Email"
              className="w-full h-9 pl-10 pr-3 text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <SecondaryBtn onClick={() => setShowAdvanced((v) => !v)}>
            <AccountIcon
              name={showAdvanced ? "filter_list_off" : "filter_list"}
              size={16}
            />
            篩選
          </SecondaryBtn>
          <SecondaryBtn onClick={onRefresh}>
            <AccountIcon name="refresh" size={16} />
            重新整理
          </SecondaryBtn>
        </div>

        {showAdvanced ? (
          <div
            className="px-3 sm:px-4 py-4 space-y-4"
            style={{
              backgroundColor: UI.wash,
              borderTop: `1px solid ${UI.border}`,
            }}
          >
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label
                  className="block text-[11px] font-bold mb-1"
                  style={{ color: UI.soft }}
                >
                  狀態
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="text-sm h-9 px-3 min-w-[140px] outline-none"
                  style={inputStyle}
                >
                  <option value="">全部狀態</option>
                  <option value="completed">已發貨</option>
                  <option value="pending">待付款</option>
                  <option value="refund_pending">退款審核中</option>
                  <option value="refunded">已退款</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-[11px] font-bold mb-1"
                  style={{ color: UI.soft }}
                >
                  排序
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="text-sm h-9 px-3 outline-none"
                  style={inputStyle}
                >
                  <option value="newest">購買日（新→舊）</option>
                  <option value="amount">金額（高→低）</option>
                </select>
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold ml-auto hover:underline"
                style={{ color: UI.mid }}
              >
                清除搜尋條件
              </button>
            </div>

            <div>
              <p
                className="text-[11px] font-bold mb-2"
                style={{ color: UI.soft }}
              >
                購買月份
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "all", label: "全部" },
                  { id: "last", label: "上個月" },
                  { id: "this", label: "本月" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMonthFilter(m.id);
                      setPage(1);
                    }}
                    className="px-3 py-1.5 text-xs font-bold transition"
                    style={{
                      backgroundColor:
                        monthFilter === m.id ? UI.dark : UI.white,
                      color: monthFilter === m.id ? "#fff" : UI.mid,
                      border: `1px solid ${monthFilter === m.id ? UI.dark : UI.border}`,
                      borderRadius: UI.radiusSm,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {selected.size > 0 ? (
          <div
            className="px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2"
            style={{
              backgroundColor: UI.light,
              borderTop: `1px solid ${UI.border}`,
            }}
          >
            <p className="text-sm" style={{ color: UI.mid }}>
              已選 <strong style={{ color: UI.dark }}>{selected.size}</strong>{" "}
              筆
            </p>
            <SecondaryBtn onClick={() => onTabChange?.("traffic")}>
              <AccountIcon name="speed" size={16} />
              查詢所選流量
            </SecondaryBtn>
          </div>
        ) : null}

        {/* 手機卡片 */}
        <div
          className="md:hidden"
          style={{ borderTop: `1px solid ${UI.border}` }}
        >
          {loading ? (
            <div
              className="py-12 text-center text-sm"
              style={{ color: UI.soft }}
            >
              載入訂單中…
            </div>
          ) : paged.length === 0 ? (
            <div
              className="py-12 text-center text-sm"
              style={{ color: UI.soft }}
            >
              尚無符合條件的訂單
              <Link
                href="/"
                className="block mt-2 font-bold hover:underline"
                style={{ color: UI.dark }}
              >
                前往選購 →
              </Link>
            </div>
          ) : (
            paged.map((order) => {
              const meta = statusMeta(order.status);
              const hasQr = getEsimQRCodes(order).length > 0;
              const isPending =
                String(order.status).toLowerCase() === "pending";
              const payInfo = parsePaymentInfo(order);
              return (
                <div
                  key={order.id}
                  className="p-4 space-y-3"
                  style={{ borderTop: `1px solid ${UI.border}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className="font-mono text-xs font-bold"
                        style={{ color: UI.dark }}
                      >
                        #{orderShortId(order.id)}
                      </p>
                      <p
                        className="text-sm font-bold mt-0.5 truncate"
                        style={{ color: UI.dark }}
                      >
                        {orderItemSummary(order)}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: UI.soft }}>
                        {formatDateFull(order.created_at)}
                      </p>
                    </div>
                    <AccountBadge tone={meta.tone}>{meta.label}</AccountBadge>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold" style={{ color: UI.dark }}>
                      NT$ {formatNTD(order.total_amount)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {isPending && payInfo ? (
                        <SecondaryBtn onClick={() => setPendingOrder(order)}>
                          繳費
                        </SecondaryBtn>
                      ) : null}
                      {hasQr ? (
                        <SecondaryBtn onClick={() => setQrOrder(order)}>
                          <MaterialIcon name="qr_code_2" size={16} />
                        </SecondaryBtn>
                      ) : null}
                      <PrimaryBtn onClick={() => setDetailOrder(order)}>
                        明細
                      </PrimaryBtn>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 桌面表格 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr
                className="text-[10px] uppercase tracking-wider"
                style={{ backgroundColor: UI.light, color: UI.soft }}
              >
                <th className="pl-5 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-black cursor-pointer"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={toggleAll}
                    aria-label="全選本頁"
                  />
                </th>
                <th className="px-3 py-3 text-left font-bold">訂單 / 方案</th>
                <th className="px-4 py-3 text-left font-bold">金額</th>
                <th className="px-4 py-3 text-left font-bold">QR / 退款</th>
                <th className="px-4 py-3 text-left font-bold">備註</th>
                <th className="px-4 py-3 text-left font-bold">購買日</th>
                <th className="px-4 py-3 text-center font-bold w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-14 text-sm"
                    style={{ color: UI.soft }}
                  >
                    載入訂單中…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-14 text-sm"
                    style={{ color: UI.soft }}
                  >
                    尚無符合條件的訂單
                    <Link
                      href="/"
                      className="block mt-2 font-bold hover:underline"
                      style={{ color: UI.dark }}
                    >
                      前往選購 →
                    </Link>
                  </td>
                </tr>
              ) : (
                paged.map((order) => {
                  const meta = statusMeta(order.status);
                  const hasQr = getEsimQRCodes(order).length > 0;
                  const eligibility = getRefundEligibility(order);
                  const refundUi = getRefundUiState(order);
                  const payInfo = parsePaymentInfo(order);
                  const isPending =
                    String(order.status).toLowerCase() === "pending";
                  const checked = selected.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      style={{
                        borderTop: `1px solid ${UI.border}`,
                        backgroundColor: checked ? UI.light : undefined,
                      }}
                    >
                      <td className="pl-5 pr-2 py-4">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-black cursor-pointer"
                          checked={checked}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`選取訂單 ${order.id}`}
                        />
                      </td>
                      <td className="px-3 py-4 min-w-[180px]">
                        <p
                          className="font-mono text-xs font-bold"
                          style={{ color: UI.dark }}
                        >
                          #{orderShortId(order.id)}
                        </p>
                        <button
                          type="button"
                          onClick={() => setDetailOrder(order)}
                          className="font-bold text-left mt-0.5 hover:underline"
                          style={{ color: UI.dark }}
                        >
                          {orderItemSummary(order)}
                        </button>
                        <p
                          className="text-[10px] mt-1 truncate max-w-[200px]"
                          style={{ color: UI.soft }}
                        >
                          {order.customer_email || "—"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <AccountBadge tone={meta.tone}>
                            {meta.label}
                          </AccountBadge>
                          {refundUi.badge ? (
                            <AccountBadge tone="warning">
                              {refundUi.badge.label}
                            </AccountBadge>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className="px-4 py-4 font-bold"
                        style={{ color: UI.dark }}
                      >
                        NT$ {formatNTD(order.total_amount)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={!hasQr}
                            onClick={() => hasQr && setQrOrder(order)}
                            className="w-14 text-center py-1.5 text-[10px] font-bold transition disabled:opacity-40"
                            style={{
                              border: `1px solid ${UI.border}`,
                              borderRadius: UI.radiusSm,
                              backgroundColor: UI.wash,
                              color: UI.dark,
                            }}
                          >
                            {hasQr ? (
                              <MaterialIcon
                                name="qr_code_2"
                                size={18}
                                className="mx-auto"
                              />
                            ) : (
                              "—"
                            )}
                            <span className="block mt-0.5">QR</span>
                          </button>
                          <div
                            className="w-14 text-center py-1.5 text-[10px] font-bold"
                            style={{
                              border: `1px solid ${UI.border}`,
                              borderRadius: UI.radiusSm,
                              backgroundColor: UI.wash,
                              color: UI.dark,
                            }}
                          >
                            <span className="block truncate px-0.5">
                              {refundColumnLabel(order)}
                            </span>
                            <span
                              className="block mt-0.5"
                              style={{ color: UI.soft }}
                            >
                              退款
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {isPending && payInfo ? (
                          <button
                            type="button"
                            onClick={() => setPendingOrder(order)}
                            className="text-[11px] font-bold px-2 py-1"
                            style={{
                              color: SHOPIFY_BADGE.warning.text,
                              backgroundColor: SHOPIFY_BADGE.warning.bg,
                              borderRadius: UI.radiusSm,
                            }}
                          >
                            {paymentLabel(payInfo)}
                          </button>
                        ) : refundUi.badge ? (
                          <button
                            type="button"
                            onClick={() => setRefundDetailOrder(order)}
                            className="text-[11px] font-bold px-2 py-1"
                            style={{
                              color: SHOPIFY_BADGE.warning.text,
                              backgroundColor: SHOPIFY_BADGE.warning.bg,
                              borderRadius: UI.radiusSm,
                            }}
                          >
                            {refundUi.badge.label}
                          </button>
                        ) : (
                          <span style={{ color: UI.soft }}>—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-4 text-xs whitespace-nowrap"
                        style={{ color: UI.soft }}
                      >
                        {formatDateFull(order.created_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {hasQr ? (
                            <button
                              type="button"
                              onClick={() => setQrOrder(order)}
                              title="QR Code"
                              className="w-8 h-8 inline-flex items-center justify-center transition"
                              style={{
                                borderRadius: UI.radiusSm,
                                border: `1px solid ${UI.border}`,
                                backgroundColor: UI.light,
                                color: UI.dark,
                              }}
                            >
                              <MaterialIcon name="qr_code_2" size={16} />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setDetailOrder(order)}
                            title="查看明細"
                            className="w-8 h-8 inline-flex items-center justify-center transition"
                            style={{
                              borderRadius: UI.radiusSm,
                              border: `1px solid ${UI.border}`,
                              backgroundColor: UI.light,
                              color: UI.dark,
                            }}
                          >
                            <MaterialIcon name="edit" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 ? (
          <ShopifyPagination
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onChange={setPage}
          />
        ) : null}
      </Card>

      <p className="text-xs mt-3 px-1" style={{ color: UI.soft }}>
        未開通方案可於 7 日內申請全額退款。{" "}
        <Link
          href="/refund-policy"
          className="font-bold underline underline-offset-2"
          style={{ color: UI.dark }}
        >
          退換貨政策
        </Link>
      </p>

      {qrOrder && <QrModal order={qrOrder} onClose={() => setQrOrder(null)} />}
      {pendingOrder && (
        <PendingPaymentModal
          order={pendingOrder}
          onClose={() => setPendingOrder(null)}
        />
      )}
      {refundDetailOrder && (
        <OrderRefundDetailModal
          order={refundDetailOrder}
          onClose={() => setRefundDetailOrder(null)}
          onReapply={(o) => {
            setRefundDetailOrder(null);
            beginRefund(o);
          }}
        />
      )}
      {refundBlocked && (
        <RefundBlockedModal
          title={refundBlocked.title}
          message={refundBlocked.message}
          footnote={refundBlocked.footnote}
          showLineCta={refundBlocked.showLineCta}
          lineUrl={refundBlocked.lineUrl}
          onClose={() => setRefundBlocked(null)}
        />
      )}
      {refundOrder && (
        <RefundRequestModal
          order={refundOrder}
          precheck={refundPrecheck}
          onClose={() => {
            setRefundOrder(null);
            setRefundPrecheck(null);
          }}
          onSuccess={() => {
            setRefundOrder(null);
            setRefundPrecheck(null);
            onRefresh?.();
          }}
          onBlocked={(payload) => {
            setRefundOrder(null);
            setRefundPrecheck(null);
            setRefundBlocked(payload);
          }}
          getAuthHeaders={getAuthHeaders}
        />
      )}
    </AccountPageWrap>
  );
}
