// /pages/pending.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

type QrcodeInfo = { name: string; src: string };

type ApiResp = {
  orderInfo: {
    status: string; // SUCCESS / PENDING / ...
    isPaid: boolean;
    MerchantOrderNo: string;
    PaymentType: string; // VACC / CVS / WEBATM / BARCODE / CREDIT
    PayTime?: string;
    TradeNo?: string;
    wooStatus: string;
  };
  offsiteInfo?: {
    PaymentType: string;
    BankCode?: string;
    CodeNo?: string;
    PaymentNo?: string;
    StoreType?: string;
    ExpireDate?: string;
    TradeNo?: string;
    Amt?: number | string;
  } | null;
  offsitePending: boolean;
  qrcodes: QrcodeInfo[];
  message?: string;
};

function Label({ children }: { children: any }) {
  return (
    <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
      {children}
    </div>
  );
}
function Value({ children }: { children: any }) {
  return (
    <div
      style={{
        fontSize: 18,
        fontWeight: 600,
        wordBreak: "break-all",
        padding: "6px 10px",
        borderRadius: 10,
        background: "#f7f7f8",
        border: "1px solid #eee",
      }}
    >
      {children}
    </div>
  );
}

export default function PendingPage() {
  const router = useRouter();
  const [orderNo, setOrderNo] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>("");
  const [data, setData] = useState<ApiResp | null>(null);
  const timerRef = useRef<any>(null);

  // 讀取 query（支援 /pending?orderNo=... 與 /pending/?orderNo=...）
  useEffect(() => {
    const q = router.query?.orderNo;
    if (typeof q === "string" && q.trim()) {
      setOrderNo(q.trim());
    } else {
      // 有些時候 Next 的 query 要等 hydration 才有，這裡等一下
      const url = new URL(window.location.href);
      const o = url.searchParams.get("orderNo");
      if (o) setOrderNo(o);
    }
  }, [router.query]);

  const fetchOnce = async (no: string) => {
    try {
      setLoading(true);
      setErrorText("");
      const resp = await fetch(
        `/api/fetch-order?orderNo=${encodeURIComponent(no)}`
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || `查詢失敗 (${resp.status})`);
      }
      const json: ApiResp = await resp.json();
      setData(json);

      // 若已付款就導向 thank-you
      if (json?.orderInfo?.isPaid) {
        router.replace(`/thank-you?orderNo=${encodeURIComponent(no)}`);
      }
    } catch (e: any) {
      setErrorText(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // 初次載入＋輪詢
  useEffect(() => {
    if (!orderNo) return;
    fetchOnce(orderNo);
    // 每 7 秒輪詢一次直到付款完成或離開頁面
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      fetchOnce(orderNo);
    }, 7000);
    return () => clearInterval(timerRef.current);
  }, [orderNo]);

  const off = data?.offsiteInfo || undefined;
  const codeText = useMemo(() => {
    if (!off) return "";
    // ATM：帳號可能在 CodeNo 或 PaymentNo
    return off.CodeNo || off.PaymentNo || "";
  }, [off]);

  const amountText = useMemo(() => {
    const v = off?.Amt ?? "";
    const n = Number(v);
    if (!isNaN(n) && isFinite(n))
      return `NT$ ${Math.round(n).toLocaleString("zh-TW")}`;
    return String(v || "");
  }, [off]);

  const paid = Boolean(data?.orderInfo?.isPaid);
  const pending = Boolean(data?.offsitePending);

  return (
    <>
      <Head>
        <title>訂單處理中 | eSIM</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div
        style={{
          maxWidth: 820,
          margin: "32px auto",
          padding: "0 16px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        <h1 style={{ fontSize: 28, marginBottom: 12 }}>訂單處理中</h1>
        {orderNo ? (
          <div style={{ color: "#666", marginBottom: 20 }}>
            訂單編號：{orderNo}
          </div>
        ) : (
          <div style={{ color: "#a00", marginBottom: 20 }}>
            網址缺少 orderNo 參數
          </div>
        )}

        {loading && <div style={{ margin: "18px 0" }}>載入中…</div>}
        {errorText && (
          <div
            style={{
              border: "1px solid #f5c2c7",
              background: "#f8d7da",
              color: "#842029",
              padding: "12px 14px",
              borderRadius: 10,
              marginBottom: 16,
            }}
          >
            {errorText}
          </div>
        )}

        {data && !paid && (
          <div
            style={{
              padding: 18,
              border: "1px solid #eee",
              borderRadius: 16,
              marginBottom: 20,
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>
              付款狀態：
              {data.orderInfo.status || (pending ? "PENDING" : "等待中")}
            </div>
            <div style={{ color: "#666", marginBottom: 12 }}>
              付款方式：{data.orderInfo.PaymentType || "—"}
            </div>

            {pending && off && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                }}
              >
                {off.BankCode && (
                  <div>
                    <Label>銀行代碼</Label>
                    <Value>{off.BankCode}</Value>
                  </div>
                )}
                {(off.CodeNo || off.PaymentNo) && (
                  <div>
                    <Label>轉帳帳號 / 繳費代碼</Label>
                    <Value>
                      <span>{codeText}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(codeText)}
                        style={{
                          marginLeft: 8,
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          padding: "4px 8px",
                          cursor: "pointer",
                          background: "#fafafa",
                        }}
                      >
                        複製
                      </button>
                    </Value>
                  </div>
                )}
                {off.StoreType && (
                  <div>
                    <Label>超商別</Label>
                    <Value>{off.StoreType}</Value>
                  </div>
                )}
                {off.ExpireDate && (
                  <div>
                    <Label>繳費期限</Label>
                    <Value>{off.ExpireDate}</Value>
                  </div>
                )}
                {(off.Amt ?? "") !== "" && (
                  <div>
                    <Label>應繳金額</Label>
                    <Value>{amountText}</Value>
                  </div>
                )}
                {off.TradeNo && (
                  <div>
                    <Label>金流交易序號</Label>
                    <Value>{off.TradeNo}</Value>
                  </div>
                )}
              </div>
            )}

            {!pending && (
              <div style={{ color: "#666" }}>
                尚未取得取號資訊（或非 ATM/超商/WebATM
                流程）。請稍候片刻再刷新本頁。
              </div>
            )}

            <div style={{ marginTop: 16, color: "#666", fontSize: 14 }}>
              這個頁面會每 7
              秒自動更新一次狀態；完成繳費入帳後會自動跳轉至完成頁。
            </div>
          </div>
        )}

        {data?.qrcodes?.length ? (
          <div
            style={{
              padding: 18,
              border: "1px solid #eee",
              borderRadius: 16,
              marginBottom: 20,
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 18 }}>
              eSIM QRCode
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
                gap: 16,
              }}
            >
              {data.qrcodes.map((q) => (
                <div
                  key={q.name + q.src.slice(0, 16)}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>
                    {q.name}
                  </div>
                  <img
                    src={q.src}
                    alt={q.name}
                    style={{ width: "100%", height: "auto", borderRadius: 8 }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {paid && (
          <div
            style={{
              border: "1px solid #d1e7dd",
              background: "#dff6e3",
              color: "#0f5132",
              padding: "14px 16px",
              borderRadius: 12,
              marginTop: 12,
            }}
          >
            已確認入帳，正為您導向完成頁…
          </div>
        )}

        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => orderNo && fetchOnce(orderNo)}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              padding: "10px 14px",
              borderRadius: 10,
              cursor: "pointer",
            }}
          >
            重新整理
          </button>
        </div>
      </div>
    </>
  );
}
