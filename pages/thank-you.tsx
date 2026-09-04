// ✅ ThankYouPage.tsx — 與發貨信件同一套資訊架構
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Head from "next/head";
import axios from "axios";
import { useCart } from "@/components/context/CartContext";
import {
  formatNetworksZh,
  formatSetupNotesZh,
} from "@/lib/esimDisplayZh";
import { hydrateEsimProfileFields } from "@/lib/esimInstallLinks";
import JekoPillButton from "@/components/ui/JekoPillButton";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import CheckoutTicketReceipt, {
  guessDestCode,
  guessDestLabel,
  shortOrderNo,
} from "@/components/checkout/CheckoutTicketReceipt";
import { clientError } from "@/lib/clientLogger";

interface ApnInfo {
  apn?: string;
  username?: string;
  password?: string;
  auth?: string;
}

interface QrcodeInfo {
  name: string;
  src: string;
  iccid?: string;
  smdp?: string;
  activationCode?: string;
  androidCode?: string;
  lpa?: string;
  apn?: ApnInfo | null;
  setupNotes?: string;
  specialDesc?: string;
  iosInstallUrl?: string;
  androidInstallUrl?: string;
  serviceDays?: string;
  networks?: string;
}

interface OrderInfo {
  status: string | null;
  message?: string | null;
  MerchantOrderNo?: string;
  PaymentType?: string;
  PayTime?: string;
  TradeNo?: string;
  isPaid?: boolean;
}

interface OffsiteInfo {
  PaymentType?: string;
  BankCode?: string;
  CodeNo?: string;
  PaymentNo?: string;
  StoreType?: string;
  ExpireDate?: string;
  TradeNo?: string;
  Amt?: number | string;
}

function CopyField({
  label,
  value,
  onCopy,
  hrefAfterCopy,
  buttonLabel = "複製",
}: {
  label: string;
  value?: string;
  onCopy: (v: string) => void;
  /** 複製後導向（例如 ICCID → 流量查詢） */
  hrefAfterCopy?: string;
  buttonLabel?: string;
}) {
  const raw = String(value ?? "").trim();
  const shown = raw || "—";
  return (
    <div className="flex items-start gap-2 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-slate-500 tracking-wide mb-1">
          {label}
        </div>
        <code
          className={`block text-[13px] font-mono break-all leading-relaxed ${
            raw ? "text-slate-900" : "text-slate-400"
          }`}
        >
          {shown}
        </code>
      </div>
      {raw ? (
        <button
          type="button"
          onClick={() => {
            onCopy(raw);
            if (hrefAfterCopy && typeof window !== "undefined") {
              window.location.href = hrefAfterCopy;
            }
          }}
          className="shrink-0 mt-0.5 inline-flex items-center justify-center rounded-md border border-[#1a56db]/35 bg-[#eff6ff] text-[#1a56db] text-[11px] font-bold px-2.5 py-1.5 active:scale-95"
          aria-label={`${buttonLabel}${label}`}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

function EsimProfileCard({
  profile: rawProfile,
  index,
  total,
  onCopy,
  hideQr = false,
  compact = false,
}: {
  profile: QrcodeInfo;
  index: number;
  total: number;
  onCopy: (v: string) => void;
  /** 票根已有 QR 時隱藏大圖 */
  hideQr?: boolean;
  /** 票券下方緊湊樣式 */
  compact?: boolean;
}) {
  const profile = hydrateEsimProfileFields(rawProfile) as QrcodeInfo;
  const [settingsOpen, setSettingsOpen] = useState(true);
  const notes = formatSetupNotesZh(
    [profile.specialDesc, profile.setupNotes].filter(Boolean).join("｜"),
  );
  const nets = formatNetworksZh(profile.networks);

  return (
    <section
      className={
        compact
          ? "ticket-install rounded-2xl border border-[#1e4ad1]/20 bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6"
          : "bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-7"
      }
    >
      <h2
        className={
          compact
            ? "mb-1 text-base font-extrabold text-slate-900"
            : "mb-1 text-lg font-extrabold text-slate-900"
        }
      >
        {profile.name || `eSIM #${index + 1}`}
      </h2>
      {total > 1 && (
        <p className="mb-4 text-xs text-slate-400">
          方案 {index + 1}／{total}
        </p>
      )}
      {compact ? (
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          票根 QR 可直接掃描安裝；以下為一鍵安裝與手動複製資訊。
        </p>
      ) : null}

      {!hideQr && profile.src ? (
        <div className="flex justify-center py-4">
          <img
            src={profile.src}
            alt={`eSIM QRCode ${index + 1}`}
            className="h-56 w-56 rounded-lg"
          />
        </div>
      ) : null}

      <div className="mt-1 space-y-2.5">
        {profile.iosInstallUrl ? (
          <JekoPillButton
            href={profile.iosInstallUrl}
            external
            variant="primary"
            size="sm"
          >
            一鍵安裝（iOS 17.4+）
          </JekoPillButton>
        ) : null}
        {profile.androidInstallUrl ? (
          <JekoPillButton
            href={profile.androidInstallUrl}
            external
            variant="secondary"
            size="sm"
          >
            一鍵安裝（Android 10.0+）
          </JekoPillButton>
        ) : null}
        {!profile.iosInstallUrl && !profile.androidInstallUrl && (
          <p className="text-xs text-slate-400">
            請掃描票根 QR Code，或手動複製下方 SM-DP+／激活碼安裝。
          </p>
        )}
      </div>

      <div className="mt-5">
        <CopyField
          label="ICCID"
          value={profile.iccid}
          onCopy={onCopy}
          buttonLabel="複製＋查詢"
          hrefAfterCopy={
            profile.iccid
              ? `/data-query?iccid=${encodeURIComponent(profile.iccid)}`
              : undefined
          }
        />
        <CopyField label="SM-DP+ 位址" value={profile.smdp} onCopy={onCopy} />
        <CopyField label="激活碼" value={profile.activationCode} onCopy={onCopy} />
        <CopyField
          label="Android 激活碼"
          value={
            profile.androidCode || profile.lpa || profile.activationCode
          }
          onCopy={onCopy}
        />
        <CopyField label="完整 LPA" value={profile.lpa} onCopy={onCopy} />
      </div>

      <div className="mt-7 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={settingsOpen}
        >
          <h3 className="text-sm font-extrabold text-slate-900">
            此 eSIM 相關設定
          </h3>
          <span className="shrink-0 text-xs font-bold text-[#1a56db]">
            {settingsOpen ? "收合" : "展開"}
          </span>
        </button>

        {settingsOpen ? (
          <div className="mt-3">
            <p className="mb-2 text-sm leading-relaxed text-slate-700">
              <strong>重要：</strong>一旦刪除，此 eSIM 無法重新安裝。
            </p>
            <p className="mb-4 text-sm leading-relaxed text-slate-700">
              服務天數以啟動日開始計算
              {profile.serviceDays
                ? `（約 ${profile.serviceDays} 天，實際以方案為準）`
                : "（實際天數以方案說明為準）"}
              。
            </p>

            <h4 className="mb-2 text-sm font-bold text-slate-900">APN 設定</h4>
            {profile.apn?.apn ? (
              <div className="rounded-xl bg-slate-50 p-4 font-mono text-[13px] leading-7 text-slate-900">
                <div>
                  APN：<strong>{profile.apn.apn}</strong>
                </div>
                {profile.apn.username ? (
                  <div>用戶名：{profile.apn.username}</div>
                ) : null}
                {profile.apn.password ? (
                  <div>密碼：{profile.apn.password}</div>
                ) : null}
                {profile.apn.auth ? (
                  <div>身份驗證：{profile.apn.auth}</div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-slate-600">
                大多數情況下 APN 會自動設定。若無法上網，請至教學頁查看該方案的手動
                APN。
              </p>
            )}
            {notes ? (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-bold text-slate-900">
                  其他設置／注意事項
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {notes}
                </p>
              </div>
            ) : null}
            {nets ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                可用網路：{nets}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default function ThankYouPage() {
  const [orderInfo, setOrderInfo] = useState<OrderInfo | null>(null);
  const [offsiteInfo, setOffsiteInfo] = useState<OffsiteInfo | null>(null);
  const [qrcodes, setQrcodes] = useState<QrcodeInfo[]>([]);
  const [fulfillmentFailed, setFulfillmentFailed] = useState(false);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [copiedHint, setCopiedHint] = useState("");
  const [printDone, setPrintDone] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const { clearCart } = useCart();

  const handlePrintComplete = useCallback(() => {
    setPrintDone(true);
  }, []);

  const orderNo = useMemo<string>(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search);
    const fromUrl = p.get("orderNo") || "";
    const hasStatusOnly = !!p.get("status") && !fromUrl;

    if (fromUrl) {
      try {
        localStorage.setItem("lastOrderNo", fromUrl);
        localStorage.setItem(
          "lastOrderNoPayload",
          JSON.stringify({ orderNo: fromUrl, ts: Date.now() }),
        );
      } catch {}
      return fromUrl;
    }

    if (hasStatusOnly) {
      try {
        const raw = localStorage.getItem("lastOrderNoPayload");
        if (raw) {
          const { orderNo: recentNo, ts } = JSON.parse(raw || "{}");
          if (
            recentNo &&
            typeof ts === "number" &&
            Date.now() - ts <= 15 * 60 * 1000
          ) {
            return String(recentNo);
          }
        }
      } catch {}
      return "";
    }

    try {
      return localStorage.getItem("lastOrderNo") || "";
    } catch {
      return "";
    }
  }, []);

  useEffect(() => {
    setPrintDone(false);
  }, [orderNo]);

  const pendingHref = useMemo(
    () =>
      orderNo ? `/pending?orderNo=${encodeURIComponent(orderNo)}` : "/account",
    [orderNo],
  );

  const clearedOnceRef = useRef(false);

  const isPaid = (info?: OrderInfo | null) => {
    if (!info) return false;
    if (info.isPaid) return true;
    const s = String(info.status || "").toLowerCase();
    return (
      s === "success" ||
      s === "paid" ||
      s === "successpaid" ||
      s === "success_paid"
    );
  };

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHint("已複製到剪貼簿");
      setTimeout(() => setCopiedHint(""), 1800);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopiedHint("已複製到剪貼簿");
        setTimeout(() => setCopiedHint(""), 1800);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  const fetchOrderOnce = useCallback(async () => {
    if (!orderNo) return { ok: false };
    try {
      const res = await axios.get("/api/fetch-order", { params: { orderNo } });
      const { qrcodes, orderInfo, offsiteInfo, fulfillmentFailed, fulfillmentStatus } =
        res.data ?? {};
      setOrderInfo(orderInfo || null);
      setOffsiteInfo(offsiteInfo || null);
      setQrcodes(Array.isArray(qrcodes) ? qrcodes : []);
      setFulfillmentFailed(Boolean(fulfillmentFailed));
      setFulfillmentStatus(
        fulfillmentStatus ? String(fulfillmentStatus) : null,
      );

      // 正常結帳才清空購物車：已付款，或 ATM／超商已成功取號（訂單已成立）
      // 未付款直接返回上一頁不會進這裡，本機商品會保留
      const paid = isPaid(orderInfo);
      const statusLower = String(orderInfo?.status || "").toLowerCase();
      const payFailed =
        /fail|error|cancel|unpaid|reject/.test(statusLower) && !paid;
      const offsiteOk = Boolean(offsiteInfo) && Boolean(orderInfo) && !payFailed;
      if (!clearedOnceRef.current && (paid || offsiteOk)) {
        clearedOnceRef.current = true;
        clearCart();
        try {
          sessionStorage.removeItem("checkout_pending_payment");
          sessionStorage.removeItem("newebpay_checkout_payload");
        } catch {
          /* ignore */
        }
      }
      return {
        ok: true,
        paid: isPaid(orderInfo),
        hasQR: Array.isArray(qrcodes) && qrcodes.length > 0,
        fulfillmentFailed: Boolean(fulfillmentFailed),
      };
    } catch (err) {
      clientError("❌ 抓取訂單資料失敗", err);
      return { ok: false };
    }
  }, [orderNo, clearCart]);

  const triesRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // 發貨可能含 MicroeSIM 重試＋背景備案重試（約數分鐘），多輪詢一陣子
  const maxTries = 72;

  const startPolling = useCallback(() => {
    if (timerRef.current || !orderNo) return;
    timerRef.current = setInterval(async () => {
      triesRef.current += 1;
      const r = await fetchOrderOnce();
      if (
        (r.paid && r.hasQR) ||
        r.fulfillmentFailed ||
        triesRef.current >= maxTries
      ) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 5000);
  }, [orderNo, fetchOrderOnce]);

  useEffect(() => {
    (async () => {
      if (!orderNo) {
        setLoading(false);
        return;
      }
      await fetchOrderOnce();
      setLoading(false);
      startPolling();
    })();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [orderNo, fetchOrderOnce, startPolling]);

  const showOffsiteCard =
    !!offsiteInfo && !!orderInfo && !isPaid(orderInfo);

  const payTypeUpper = String(
    orderInfo?.PaymentType || offsiteInfo?.PaymentType || "",
  ).toUpperCase();
  const isOffsitePay = ["VACC", "WEBATM", "CVS"].includes(payTypeUpper);
  const statusLower = String(orderInfo?.status || "").toLowerCase();
  const isFailedPay =
    /fail|error|cancel|unpaid|reject/.test(statusLower) &&
    !isPaid(orderInfo);
  /** 匯款／超商待付、付款失敗：票券金流細節一律顯示 — */
  const sparseTicketFields =
    ((isOffsitePay || showOffsiteCard) && !isPaid(orderInfo)) || isFailedPay;

  const primaryQr = qrcodes[0] || null;
  const planNameForRoute = String(primaryQr?.name || "").trim();
  const destCode = guessDestCode(planNameForRoute);
  const destLabel = guessDestLabel(destCode);
  const ticketTitle = !orderNo
    ? "找不到訂單編號"
    : loading
      ? "稍等一下，您的 eSIM 登機證準備中…"
      : isPaid(orderInfo) && !primaryQr
        ? "付款完成，eSIM 登機證製作中…"
        : primaryQr
          ? "感謝訂購！您的 eSIM 登機證"
          : "感謝您的訂購";

  const purchaseDateTime = (() => {
    const raw = orderInfo?.PayTime;
    if (!raw) return "—";
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return String(raw);
  })();

  return (
    <div className="thankyou-page">
      <Head>
        <title>感謝您的訂購｜JEKO eSIM</title>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=jura:300,500,700"
        />
      </Head>

      {copiedHint && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-lg">
          {copiedHint}
        </div>
      )}

      <div className="thankyou-hero px-4 pb-10 pt-10 sm:pt-14">
        {!orderNo ? (
          <div className="mx-auto max-w-md rounded-2xl bg-white p-5 text-sm text-red-700 shadow">
            找不到訂單編號。請返回「我的帳戶 &gt; QR Code 訂單」查詢。
          </div>
        ) : (
          <>
            <CheckoutTicketReceipt
              eyebrow={
                isFailedPay
                  ? "付款未完成"
                  : sparseTicketFields
                    ? "訂單已建立 · 待付款"
                    : "結帳成功 · 感謝購買"
              }
              title={
                isFailedPay
                  ? "付款失敗，尚未開立 eSIM 登機證"
                  : sparseTicketFields
                    ? "請完成付款，eSIM 登機證將於入帳後開立"
                    : ticketTitle
              }
              fromCode={sparseTicketFields ? "—" : "TW"}
              fromLabel={sparseTicketFields ? "—" : "台灣"}
              toCode={sparseTicketFields ? "—" : destCode}
              toLabel={sparseTicketFields ? "—" : destLabel}
              passenger={sparseTicketFields ? "—" : "JEKO 旅客"}
              seat={
                sparseTicketFields
                  ? "—"
                  : primaryQr?.serviceDays
                    ? `${primaryQr.serviceDays} 天`
                    : "—"
              }
              status={
                sparseTicketFields
                  ? "—"
                  : orderInfo?.status || (loading ? "…" : "—")
              }
              paymentType={
                sparseTicketFields
                  ? "—"
                  : orderInfo?.PaymentType || "—"
              }
              orderId={
                sparseTicketFields
                  ? "—"
                  : orderInfo?.MerchantOrderNo || orderNo || "—"
              }
              payTime={sparseTicketFields ? "—" : purchaseDateTime}
              tradeNo={
                sparseTicketFields ? "—" : orderInfo?.TradeNo || "—"
              }
              plan={
                sparseTicketFields
                  ? "—"
                  : primaryQr?.name
                    ? String(primaryQr.name).slice(0, 28)
                    : "eSIM"
              }
              qrSrc={sparseTicketFields ? "" : primaryQr?.src || ""}
              barcodeText={
                sparseTicketFields
                  ? "—"
                  : `${shortOrderNo(orderInfo?.MerchantOrderNo || orderNo)} ${orderInfo?.TradeNo || ""}`.trim()
              }
              instructions={
                isFailedPay
                  ? "付款未成功，請重新結帳或改用其他付款方式。完成付款後才會產生 QR Code。"
                  : sparseTicketFields
                    ? "完成付款並入帳後，本頁／信件會提供安裝 QR Code。"
                    : primaryQr?.src
                      ? "請掃描票根 QR Code 安裝 eSIM；抵達目的地後再啟用行動數據。"
                      : isPaid(orderInfo)
                        ? "QR 產生中，請稍候本頁會自動更新。"
                        : "完成付款後將顯示安裝 QR Code。"
              }
              onPrintComplete={handlePrintComplete}
            />

            {printDone && !loading && qrcodes.length > 0 ? (
              <div className="ticket-install-stack mx-auto mt-8 w-full max-w-[400px] space-y-4">
                {qrcodes.map((q, i) => (
                  <EsimProfileCard
                    key={`${q.iccid || q.lpa || i}`}
                    profile={q}
                    index={i}
                    total={qrcodes.length}
                    onCopy={copyText}
                    hideQr
                    compact
                  />
                ))}
              </div>
            ) : null}
          </>
        )}

        {loading ? (
          <div className="mt-6">
            <LoadingIndicator
              layout="center"
              label="正在載入訂單…"
              labelClassName="text-sm text-slate-600"
            />
          </div>
        ) : null}
      </div>

      {/* 下方：待付款／教學（訂單摘要已併入票券） */}
      <div className="rounded-t-[28px] bg-[#eef1f6] px-4 pb-16 pt-8">
        <div className="mx-auto max-w-xl space-y-5">
          {showOffsiteCard && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 font-bold text-slate-900">
                匯款 / 代碼繳費資訊
              </h3>
              {(offsiteInfo?.PaymentType === "VACC" ||
                offsiteInfo?.PaymentType === "WEBATM") && (
                <div className="space-y-2 text-sm">
                  <p>
                    銀行代碼：
                    <span className="font-mono">
                      {offsiteInfo.BankCode || "—"}
                    </span>{" "}
                    <button
                      className="ml-2 text-sm text-blue-700 underline"
                      onClick={() => copyText(offsiteInfo.BankCode)}
                    >
                      複製
                    </button>
                  </p>
                  <p>
                    虛擬帳號：
                    <span className="font-mono break-all">
                      {offsiteInfo.CodeNo || "—"}
                    </span>{" "}
                    <button
                      className="ml-2 text-sm text-blue-700 underline"
                      onClick={() => copyText(offsiteInfo.CodeNo)}
                    >
                      複製
                    </button>
                  </p>
                  <p>繳費期限：{offsiteInfo.ExpireDate || "—"}</p>
                  {offsiteInfo.Amt && <p>應繳金額：${offsiteInfo.Amt}</p>}
                </div>
              )}
              {offsiteInfo?.PaymentType === "CVS" && (
                <div className="space-y-2 text-sm">
                  <p>超商別：{offsiteInfo.StoreType || "—"}</p>
                  <p>
                    繳費代碼：
                    <span className="font-mono break-all">
                      {offsiteInfo.PaymentNo || offsiteInfo.CodeNo || "—"}
                    </span>{" "}
                    <button
                      className="ml-2 text-sm text-blue-700 underline"
                      onClick={() =>
                        copyText(offsiteInfo.PaymentNo || offsiteInfo.CodeNo)
                      }
                    >
                      複製
                    </button>
                  </p>
                  <p>繳費期限：{offsiteInfo.ExpireDate || "—"}</p>
                  {offsiteInfo.Amt && <p>應繳金額：${offsiteInfo.Amt}</p>}
                </div>
              )}
            </div>
          )}

          {!loading && isPaid(orderInfo) && qrcodes.length === 0 && (
            <div
              className={
                fulfillmentFailed
                  ? "rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
                  : "rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800"
              }
            >
              {fulfillmentFailed ? (
                <>
                  <p className="font-bold">付款已成功，eSIM 正在由系統補發</p>
                  <p className="mt-2 leading-relaxed">
                    訂單已收款；若信箱稍後仍未收到 QR／安裝資訊，請帶訂單編號聯繫
                    LINE 客服，我們會立即協助補發。您也可稍後重新整理本頁。
                  </p>
                </>
              ) : fulfillmentStatus === "processing" ? (
                <>付款完成，系統正在開通 eSIM（含自動重試），請稍候…本頁會自動更新</>
              ) : (
                <>付款完成，正在產生 eSIM 與發票，請稍候…（系統會自動更新）</>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <JekoPillButton
                  href={
                    process.env.NEXT_PUBLIC_LINE_OA_URL ||
                    "https://line.me/R/ti/p/@593gvyzn"
                  }
                  external
                  variant="primary"
                  size="sm"
                >
                  LINE 客服
                </JekoPillButton>
                <JekoPillButton href={pendingHref} variant="secondary" size="sm">
                  前往訂單追蹤
                </JekoPillButton>
                <JekoPillButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => location.reload()}
                >
                  重新整理
                </JekoPillButton>
              </div>
            </div>
          )}

          {printDone && !loading && qrcodes.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <p className="mb-3 text-sm leading-relaxed text-slate-600">
                不確定怎麼安裝？點下方按鈕查看步驟與貼心提示。
              </p>
              <JekoPillButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setGuideOpen(true)}
              >
                如何安裝使用 eSIM
              </JekoPillButton>
              <p className="mt-4 text-xs text-slate-500">
                我們也已將相同資訊寄到您的信箱；若未收到，請檢查垃圾郵件匣。
              </p>
            </div>
          )}

          {!loading && qrcodes.length === 0 && !isPaid(orderInfo) && orderNo && (
            <div className="space-y-3 rounded-2xl border bg-white p-5 text-sm text-slate-600">
              <p>目前尚未取得 eSIM。若您剛完成付款，請稍候片刻後再查看。</p>
              <JekoPillButton href={pendingHref} variant="primary" size="sm">
                前往訂單追蹤
              </JekoPillButton>
            </div>
          )}
        </div>
      </div>

      {guideOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="esim-guide-title"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="esim-guide-title"
                className="text-base font-extrabold text-slate-900"
              >
                如何安裝使用 eSIM
              </h2>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="shrink-0 rounded-full px-2.5 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100"
                aria-label="關閉"
              >
                關閉
              </button>
            </div>

            <ol className="mb-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
              <li>設定 → 行動服務／行動網路 → 加入 eSIM。</li>
              <li>掃描票根 QR Code，或手動輸入 SM-DP+ 與激活碼。</li>
              <li>
                若尚未抵達目的地：安裝後請先
                <strong className="text-red-700">關閉</strong>
                該 eSIM；抵達後再啟用並設為行動數據。
              </li>
            </ol>

            <h3 className="mb-3 text-sm font-extrabold text-slate-900">
              貼心提示
            </h3>
            <ol className="mb-5 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-slate-600">
              <li>請在穩定 Wi‑Fi 環境下新增 eSIM。</li>
              <li>一張 eSIM 綁定一台裝置，無法轉移。</li>
              <li>刪除後無法重新安裝，請勿誤刪。</li>
              <li>用量可於官網「帳戶／流量查詢」查看。</li>
            </ol>

            <JekoPillButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGuideOpen(false)}
            >
              我知道了
            </JekoPillButton>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .thankyou-page {
          min-height: 100dvh;
          background-color: #f4f1ea;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 1px,
            rgb(54 65 83 / 0.12) 0 3px
          );
        }
        .thankyou-hero {
          max-width: 720px;
          margin: 0 auto;
        }
        .ticket-install-stack {
          animation: ticket-install-in 0.55s ease-out both;
        }
        @keyframes ticket-install-in {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
