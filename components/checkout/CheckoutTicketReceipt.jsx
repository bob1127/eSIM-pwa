"use client";

/**
 * eSIM 登機證（scoop 票根 + QR stub）
 * 含印表機列印滑出動畫；無撕開／hover 旋轉
 */
import { useEffect, useId, useMemo, useRef } from "react";

/** 列印動畫 delay 0.4s + duration 2.6s（與 CSS 同步） */
export const TICKET_PRINT_MS = 3000;

export function guessDestCode(name) {
  const n = String(name || "");
  if (/日本|japan|\bjp\b/i.test(n)) return "JP";
  if (/韓國|korea|\bkr\b/i.test(n)) return "KR";
  if (/歐洲|europe|\beu\b/i.test(n)) return "EU";
  if (/美國|usa|america|\bus\b/i.test(n)) return "US";
  if (/泰國|thailand/i.test(n)) return "TH";
  if (/越南|vietnam/i.test(n)) return "VN";
  if (/新加坡|singapore/i.test(n)) return "SG";
  if (/馬來|malaysia/i.test(n)) return "MY";
  if (/印尼|indonesia/i.test(n)) return "ID";
  if (/菲律賓|philippines/i.test(n)) return "PH";
  if (/澳|australia/i.test(n)) return "AU";
  if (/紐西|new.?zealand/i.test(n)) return "NZ";
  if (/加拿大|canada/i.test(n)) return "CA";
  if (/英國|uk|britain/i.test(n)) return "GB";
  if (/香港|hong.?kong/i.test(n)) return "HK";
  if (/澳門|macao|macau/i.test(n)) return "MO";
  if (/中國|china/i.test(n)) return "CN";
  if (/全球|worldwide|global/i.test(n)) return "WW";
  if (/亞洲|asia/i.test(n)) return "AS";
  if (/台灣|taiwan/i.test(n)) return "TW";
  return "XX";
}

export function guessDestLabel(codeOrName) {
  const raw = String(codeOrName || "");
  const code =
    raw.length <= 4 && /^[A-Za-z]+$/.test(raw)
      ? raw.toUpperCase()
      : guessDestCode(raw);
  const map = {
    JP: "日本",
    JPN: "日本",
    KR: "韓國",
    KOR: "韓國",
    EU: "歐洲",
    EUR: "歐洲",
    US: "美國",
    USA: "美國",
    TH: "泰國",
    THA: "泰國",
    VN: "越南",
    VNM: "越南",
    SG: "新加坡",
    SGP: "新加坡",
    MY: "馬來西亞",
    MYS: "馬來西亞",
    ID: "印尼",
    PH: "菲律賓",
    AU: "澳洲",
    AUS: "澳洲",
    NZ: "紐西蘭",
    CA: "加拿大",
    CAN: "加拿大",
    GB: "英國",
    GBR: "英國",
    HK: "香港",
    MO: "澳門",
    CN: "中國",
    CHN: "中國",
    WW: "全球",
    AS: "亞洲",
    TW: "台灣",
    TWN: "台灣",
    XX: "目的地",
    ESM: "目的地",
  };
  return map[code] || "目的地";
}

export function shortOrderNo(orderNo) {
  const s = String(orderNo || "").trim();
  if (!s) return "—";
  if (s.length <= 10) return s.toUpperCase();
  return s.slice(-8).toUpperCase();
}

function TicketBarcode() {
  const lines = [
    1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1,
    2, 1, 1, 2, 1, 1, 1, 1, 2, 1,
  ];
  let x = 0.5;
  return (
    <svg
      className="barcode"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 92 25"
      aria-hidden
    >
      {lines.map((w, i) => {
        const x1 = x;
        x += w + 1.2;
        return (
          <line
            key={i}
            fill="none"
            stroke="currentColor"
            strokeWidth={w}
            x1={x1}
            y1="0"
            x2={x1}
            y2="30"
          />
        );
      })}
    </svg>
  );
}

/**
 * @typedef {{ label: string, value: string }} SeatField
 */

export default function CheckoutTicketReceipt({
  eyebrow = "結帳成功 · 感謝購買",
  title = "稍等一下，您的 eSIM 登機證正在列印…",
  flight = "—",
  date = "—",
  fromCode = "TW",
  fromLabel = "台灣",
  toCode = "JP",
  toLabel = "日本",
  passenger = "JEKO 旅客",
  seat = "—",
  meta = [],
  /** 訂單／金流欄位（整合進票面；有值時優先顯示） */
  status = "",
  paymentType = "",
  orderId = "",
  payTime = "",
  tradeNo = "",
  plan = "",
  instructions = "請在抵達目的地後再啟用 eSIM；安裝請掃描票根 QR Code。",
  qrSrc = "",
  barcodeText = "",
  replayKey = 0,
  animate = true,
  onPrintComplete,
}) {
  const uid = useId();
  const receiptsRef = useRef(null);
  const doneRef = useRef(false);

  const showPayBlock = Boolean(
    status || paymentType || orderId || payTime || tradeNo || plan,
  );

  const metaRows = useMemo(() => {
    if (showPayBlock) return [];
    const defaults = [
      { label: "Plan", value: "—" },
      { label: "Payment", value: "—" },
      { label: "Status", value: "—" },
      { label: "Board", value: "QR" },
    ];
    if (!meta?.length) return defaults;
    const padded = [...meta];
    while (padded.length < 4) padded.push({ label: "—", value: "—" });
    return padded.slice(0, 4);
  }, [meta, showPayBlock]);

  const displayOrder = orderId || flight;
  const displayPayTime = payTime || date;
  const displayStatus = status || "—";
  const displayPayment = paymentType || "—";
  const displayTrade = tradeNo || "—";
  const displayPlan = plan || "—";

  useEffect(() => {
    doneRef.current = false;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onPrintComplete?.();
    };

    if (!animate) {
      finish();
      return undefined;
    }

    const el = receiptsRef.current;
    const onEnd = (e) => {
      if (e.target !== el) return;
      if (e.animationName && !String(e.animationName).includes("ticket-print")) {
        return;
      }
      finish();
    };
    el?.addEventListener("animationend", onEnd);
    const t = window.setTimeout(finish, TICKET_PRINT_MS + 80);
    return () => {
      el?.removeEventListener("animationend", onEnd);
      window.clearTimeout(t);
    };
  }, [animate, replayKey, onPrintComplete]);

  return (
    <div className="ticket-wrap" key={`${uid}-${replayKey}`}>
      {eyebrow ? <p className="ticket-eyebrow">{eyebrow}</p> : null}
      {title ? <h1 className="ticket-title">{title}</h1> : null}

      <div className="ticket-printer" aria-hidden />

      <div className="ticket-receipts-wrapper">
        <div
          ref={receiptsRef}
          className={`ticket-receipts${animate ? " ticket-receipts--print" : ""}`}
        >
          <article className="ticket">
            <section className="details">
              <span className="scoop scoop-bl" aria-hidden />
              <span className="scoop scoop-br" aria-hidden />

              {showPayBlock ? (
                <>
                  <dl className="flight-details">
                    <div>
                      <dt>付款狀態</dt>
                      <dd>{displayStatus}</dd>
                    </div>
                    <div className="align-end">
                      <dt>付款方式</dt>
                      <dd>{displayPayment}</dd>
                    </div>
                  </dl>

                  <dl className="order-id-block">
                    <div>
                      <dt>訂單編號</dt>
                      <dd className="mono-tight">{displayOrder}</dd>
                    </div>
                  </dl>

                  <dl className="pay-meta-details">
                    <div>
                      <dt>付款時間</dt>
                      <dd className="pay-time">{displayPayTime}</dd>
                    </div>
                    <div className="align-end">
                      <dt>交易序號</dt>
                      <dd className="mono-tight">{displayTrade}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <dl className="flight-details">
                  <div>
                    <dt>Order</dt>
                    <dd>{flight}</dd>
                  </div>
                  <div className="align-end">
                    <dt>Date</dt>
                    <dd>{date}</dd>
                  </div>
                </dl>
              )}

              <div className="flight-route">
                <div className="route-codes">
                  <span>{fromCode}</span>
                  <span className="plane" aria-hidden>
                    ✈
                  </span>
                  <span>{toCode}</span>
                </div>
                <div className="route-cities">
                  <span>{fromLabel}</span>
                  <span />
                  <span>{toLabel}</span>
                </div>
              </div>

              <dl className="passenger-details">
                <div>
                  <dt>Passenger</dt>
                  <dd>{passenger}</dd>
                </div>
                <div className="align-end">
                  <dt>Data</dt>
                  <dd>{seat}</dd>
                </div>
              </dl>

              {showPayBlock ? (
                <dl className="plan-block">
                  <div>
                    <dt>方案</dt>
                    <dd>{displayPlan}</dd>
                  </div>
                </dl>
              ) : (
                <dl className="seating-details">
                  {metaRows.map((m) => (
                    <div key={`${m.label}-${m.value}`}>
                      <dt>{m.label}</dt>
                      <dd>{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <p className="boarding-instructions">{instructions}</p>
            </section>

            <section className="stub">
              <span className="scoop scoop-tl" aria-hidden />
              <span className="scoop scoop-tr" aria-hidden />
              <div className="stub-dash" aria-hidden />

              <div className="stub-inner">
                {qrSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrSrc} alt="eSIM QR Code" className="stub-qr" />
                ) : (
                  <div className="stub-qr stub-qr--empty">QR</div>
                )}
                <TicketBarcode />
                <div className="barcode-num">
                  {barcodeText || `${displayOrder} · JEKO eSIM`}
                </div>
              </div>
            </section>
          </article>
        </div>
      </div>

      <style jsx>{`
        .ticket-wrap {
          --page-bg: #f4f1ea;
          --page-stripes: repeating-linear-gradient(
            transparent,
            transparent 1px,
            rgb(54 65 83 / 0.12) 0 3px
          );
          --ticket-blue: #1e8fff;
          --line: rgba(255, 255, 255, 0.4);
          --scoop: 1rem;
          width: min(100%, 400px);
          margin: 0 auto;
          font-family: Jura, "Noto Sans TC", system-ui, sans-serif;
        }
        .ticket-eyebrow {
          margin: 0 0 8px;
          text-align: left;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          color: #1e4ad1;
        }
        .ticket-title {
          margin: 0 0 28px;
          text-align: left;
          font-size: clamp(1.2rem, 4vw, 1.45rem);
          font-weight: 500;
          line-height: 1.35;
          color: #111;
        }

        .ticket-printer {
          width: calc(100% + 36px);
          height: 20px;
          margin: 0;
          position: relative;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid #1e4ad1;
          border-radius: 10px;
          box-shadow: 1px 3px 3px rgba(0, 0, 0, 0.16);
          background: linear-gradient(180deg, #fff 0%, #e8eefc 100%);
          z-index: 3;
          box-sizing: border-box;
        }

        .ticket-receipts-wrapper {
          overflow: hidden;
          margin-top: -10px;
          padding-bottom: 12px;
        }

        .ticket-receipts {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* 從印表機往下「吐紙」 */
        .ticket-receipts--print {
          transform: translateY(-105%);
          animation: ticket-print 2.6s 0.4s cubic-bezier(0.22, 0.61, 0.36, 1)
            forwards;
          will-change: transform;
        }

        @keyframes ticket-print {
          0% {
            transform: translateY(-105%);
          }
          30% {
            transform: translateY(-72%);
          }
          65% {
            transform: translateY(-22%);
          }
          100% {
            transform: translateY(0);
          }
        }

        .ticket {
          width: 100%;
          display: grid;
          grid-template-rows: auto auto;
          color: #fff;
          filter: drop-shadow(0 10px 24px rgba(15, 40, 80, 0.18));
        }

        .details,
        .stub {
          background: var(--ticket-blue);
          position: relative;
        }
        .details {
          padding: 1.2rem 1.4rem 1.05rem;
          border-radius: var(--scoop) var(--scoop) 0 0;
          display: grid;
          gap: 0.7rem;
        }
        .stub {
          padding: 1.1rem 1.25rem 1.2rem;
          border-radius: 0 0 var(--scoop) var(--scoop);
        }

        /* 圓缺與頁面橫條紋對齊（像真正挖洞） */
        .scoop {
          position: absolute;
          width: calc(var(--scoop) * 2);
          height: calc(var(--scoop) * 2);
          border-radius: 50%;
          background-color: var(--page-bg);
          background-image: var(--page-stripes);
          background-attachment: fixed;
          z-index: 2;
          pointer-events: none;
        }
        .scoop-bl {
          left: 0;
          bottom: 0;
          transform: translate(-50%, 50%);
        }
        .scoop-br {
          right: 0;
          bottom: 0;
          transform: translate(50%, 50%);
        }
        .scoop-tl {
          left: 0;
          top: 0;
          transform: translate(-50%, -50%);
        }
        .scoop-tr {
          right: 0;
          top: 0;
          transform: translate(50%, -50%);
        }
        .stub-dash {
          position: absolute;
          top: 0;
          left: var(--scoop);
          right: var(--scoop);
          border-top: 1px dashed rgba(255, 255, 255, 0.65);
        }

        dl {
          margin: 0;
        }
        dt {
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.62rem;
          letter-spacing: 0.06em;
          opacity: 0.85;
          margin-bottom: 0.15rem;
        }
        dd {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 700;
          line-height: 1.25;
          word-break: break-word;
        }
        .align-end {
          text-align: right;
        }

        .flight-details,
        .passenger-details,
        .pay-meta-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem 1rem;
        }
        .passenger-details {
          grid-template-columns: 3fr 1fr;
        }
        .order-id-block,
        .plan-block {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.25rem;
        }
        .mono-tight {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          line-height: 1.35;
          word-break: break-all;
        }
        .pay-time {
          font-size: 0.88rem;
          line-height: 1.35;
        }
        .pay-meta-details .mono-tight {
          font-size: 0.72rem;
        }

        .flight-route {
          padding-block: 0.85rem;
          border-block: 1px solid var(--line);
        }
        .route-codes,
        .route-cities {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .route-codes {
          font-size: 2rem;
          font-weight: 500;
          letter-spacing: 0.04em;
        }
        .route-codes .plane {
          transform: scale(1.35);
          line-height: 1;
        }
        .route-cities {
          margin-top: 0.2rem;
          font-size: 0.78rem;
          opacity: 0.92;
        }

        .seating-details {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.45rem 0.5rem;
        }
        .seating-details dd {
          font-size: 0.88rem;
        }

        .boarding-instructions {
          margin: 0.25rem 0 0;
          font-size: 0.7rem;
          line-height: 1.45;
          text-align: center;
          opacity: 0.92;
        }

        .stub-inner {
          display: grid;
          gap: 0.55rem;
          place-items: center;
          padding-top: 0.45rem;
        }
        .stub-qr {
          width: 112px;
          height: 112px;
          object-fit: contain;
          border-radius: 8px;
          background: #fff;
          padding: 6px;
        }
        .stub-qr--empty {
          display: grid;
          place-items: center;
          color: #1e4ad1;
          font-weight: 700;
          font-size: 14px;
        }
        .barcode {
          width: min(220px, 92%);
          height: 48px;
          color: #fff;
        }
        .barcode-num {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-align: center;
          word-break: break-all;
        }

        @media (max-width: 380px) {
          .seating-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .route-codes {
            font-size: 1.7rem;
          }
        }
      `}</style>
    </div>
  );
}
