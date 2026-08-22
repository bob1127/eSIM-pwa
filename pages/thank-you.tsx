// ✅ ThankYouPage.tsx — 與發貨信件同一套資訊架構
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useCart } from "@/components/context/CartContext";
import {
  formatNetworksZh,
  formatSetupNotesZh,
} from "@/lib/esimDisplayZh";
import JekoPillButton from "@/components/ui/JekoPillButton";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

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
  profile,
  index,
  total,
  onCopy,
}: {
  profile: QrcodeInfo;
  index: number;
  total: number;
  onCopy: (v: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(true);
  const notes = formatSetupNotesZh(
    [profile.specialDesc, profile.setupNotes].filter(Boolean).join("｜"),
  );
  const nets = formatNetworksZh(profile.networks);

  return (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-7">
      <h2 className="text-lg font-extrabold text-slate-900 mb-1">
        {profile.name || `eSIM #${index + 1}`}
      </h2>
      {total > 1 && (
        <p className="text-xs text-slate-400 mb-4">
          方案 {index + 1}／{total}
        </p>
      )}

      {profile.src ? (
        <div className="flex justify-center py-4">
          <img
            src={profile.src}
            alt={`eSIM QRCode ${index + 1}`}
            className="w-56 h-56 rounded-lg"
          />
        </div>
      ) : null}

      <div className="mt-2">
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

      <div className="mt-5 space-y-2.5">
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
            請掃描上方 QR Code，或手動複製 SM-DP+／激活碼安裝。
          </p>
        )}
      </div>

      <div className="mt-7 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 text-left"
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
            <p className="text-sm text-slate-700 leading-relaxed mb-2">
              ⚠️ <strong>重要：</strong>一旦刪除，此 eSIM 無法重新安裝。
            </p>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              📅 服務天數以啟動日開始計算
              {profile.serviceDays
                ? `（約 ${profile.serviceDays} 天，實際以方案為準）`
                : "（實際天數以方案說明為準）"}
              。
            </p>

            <h4 className="text-sm font-bold text-slate-900 mb-2">APN 設定</h4>
            {profile.apn?.apn ? (
              <div className="bg-slate-50 rounded-xl p-4 font-mono text-[13px] text-slate-900 leading-7">
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
              <p className="text-sm text-slate-600 leading-relaxed">
                大多數情況下 APN 會自動設定。若無法上網，請至教學頁查看該方案的手動
                APN。
              </p>
            )}
            {notes ? (
              <div className="mt-4">
                <h4 className="text-sm font-bold text-slate-900 mb-2">
                  其他設置／注意事項
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {notes}
                </p>
              </div>
            ) : null}
            {nets ? (
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
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
  const [loading, setLoading] = useState(true);
  const [copiedHint, setCopiedHint] = useState("");

  const { clearCart } = useCart();

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
      const { qrcodes, orderInfo, offsiteInfo } = res.data ?? {};
      setOrderInfo(orderInfo || null);
      setOffsiteInfo(offsiteInfo || null);
      setQrcodes(Array.isArray(qrcodes) ? qrcodes : []);

      if (!clearedOnceRef.current && isPaid(orderInfo)) {
        clearedOnceRef.current = true;
        clearCart();
        try {
          sessionStorage.removeItem("checkout_pending_payment");
        } catch {
          /* ignore */
        }
      }
      return {
        ok: true,
        paid: isPaid(orderInfo),
        hasQR: Array.isArray(qrcodes) && qrcodes.length > 0,
      };
    } catch (err) {
      console.error("❌ 抓取訂單資料失敗", err);
      return { ok: false };
    }
  }, [orderNo, clearCart]);

  const triesRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // 發貨可能含 MicroeSIM 重試（最長約 3 分鐘），多輪詢一陣子
  const maxTries = 40;

  const startPolling = useCallback(() => {
    if (timerRef.current || !orderNo) return;
    timerRef.current = setInterval(async () => {
      triesRef.current += 1;
      const r = await fetchOrderOnce();
      if ((r.paid && r.hasQR) || triesRef.current >= maxTries) {
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

  return (
    <div className="min-h-screen bg-[#eef1f6]">
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
        <p className="text-center text-[11px] font-extrabold tracking-[0.14em] text-slate-500 mb-3">
          JEKO ESIM
        </p>
        <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8">
          感謝您的訂購
        </h1>

        {copiedHint && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
            {copiedHint}
          </div>
        )}

        {!orderNo && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 text-red-700 text-sm">
            找不到訂單編號。請返回「我的帳戶 &gt; QR Code 訂單」查詢。
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 mb-5 space-y-2 text-sm">
          {orderInfo ? (
            <>
              <p>
                付款狀態：
                <span className="font-bold text-slate-900">
                  {orderInfo.status}
                </span>
              </p>
              {orderInfo.MerchantOrderNo && (
                <>
                  <p>訂單編號：{orderInfo.MerchantOrderNo}</p>
                  <p>付款方式：{orderInfo.PaymentType || "—"}</p>
                  <p>付款時間：{orderInfo.PayTime || "—"}</p>
                  <p>交易序號：{orderInfo.TradeNo || "—"}</p>
                </>
              )}
            </>
          ) : (
            <p className="text-slate-500">正在解析交易資訊...</p>
          )}
        </div>

        {showOffsiteCard && (
          <div className="mb-5 p-5 rounded-2xl border border-amber-200 bg-amber-50">
            <h3 className="font-bold text-amber-900 mb-3">匯款 / 代碼繳費資訊</h3>
            {(offsiteInfo?.PaymentType === "VACC" ||
              offsiteInfo?.PaymentType === "WEBATM") && (
              <div className="space-y-2 text-sm">
                <p>
                  銀行代碼：
                  <span className="font-mono">{offsiteInfo.BankCode || "—"}</span>{" "}
                  <button
                    className="ml-2 text-sm underline text-blue-700"
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
                    className="ml-2 text-sm underline text-blue-700"
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
                    className="ml-2 text-sm underline text-blue-700"
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

        <div className="space-y-5">
          {loading && (
            <LoadingIndicator layout="center" label="正在載入 eSIM…" />
          )}

          {!loading && isPaid(orderInfo) && qrcodes.length === 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-blue-800 text-sm">
              付款完成，正在產生 eSIM 與發票，請稍候…（系統會自動更新）
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <JekoPillButton href={pendingHref} variant="primary" size="sm">
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

          {!loading &&
            qrcodes.map((q, i) => (
              <EsimProfileCard
                key={i}
                profile={q}
                index={i}
                total={qrcodes.length}
                onCopy={copyText}
              />
            ))}

          {!loading && qrcodes.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
              <h3 className="text-sm font-extrabold text-red-700 mb-3">
                如何安裝使用 eSIM
              </h3>
              <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-2 leading-relaxed mb-5">
                <li>設定 → 行動服務／行動網路 → 加入 eSIM。</li>
                <li>掃描 QR Code，或手動輸入 SM-DP+ 與激活碼。</li>
                <li>
                  若尚未抵達目的地：安裝後請先
                  <strong className="text-red-700">關閉</strong>
                  該 eSIM；抵達後再啟用並設為行動數據。
                </li>
              </ol>
              <h3 className="text-sm font-extrabold text-red-700 mb-3">
                貼心提示
              </h3>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1.5 leading-relaxed">
                <li>請在穩定 Wi‑Fi 環境下新增 eSIM。</li>
                <li>一張 eSIM 綁定一台裝置，無法轉移。</li>
                <li>刪除後無法重新安裝，請勿誤刪。</li>
                <li>用量可於官網「帳戶／流量查詢」查看。</li>
              </ol>
              <p className="mt-5 text-xs text-slate-500">
                我們也已將相同資訊寄到您的信箱；若未收到，請檢查垃圾郵件匣。
              </p>
            </div>
          )}

          {!loading && qrcodes.length === 0 && !isPaid(orderInfo) && (
            <div className="text-slate-600 text-sm bg-white rounded-2xl border p-5 space-y-3">
              <p>目前尚未取得 eSIM。若您剛完成付款，請稍候片刻後再查看。</p>
              <JekoPillButton href={pendingHref} variant="primary" size="sm">
                前往訂單追蹤
              </JekoPillButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
