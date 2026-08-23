"use client";

/**
 * 結帳感謝頁機票版 — scoop 票根 + QR（假資料預覽）
 * http://localhost:3000/thank-you-ticket-preview/
 */
import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import CheckoutTicketReceipt, {
  guessDestCode,
  guessDestLabel,
  shortOrderNo,
} from "@/components/checkout/CheckoutTicketReceipt";

const MOCK = {
  passenger: "Bob Chen",
  orderNo: "01M0J04PKGA5BMXZR2YB2TQQ5D",
  payTime: "2026-08-21T11:09:12.783Z",
  paymentType: "LINEPAY",
  status: "SUCCESS",
  planName: "日本 5 天 3GB",
  serviceDays: "5",
  qrSrc:
    "https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=LPA:1%24jeko-esim.example%24DEMO-ACTIVATION",
  tradeNo: "2026082119041599110",
};

export default function ThankYouTicketPreviewPage() {
  const [replayKey, setReplayKey] = useState(0);
  const toCode = useMemo(() => guessDestCode(MOCK.planName), []);
  const payTime = useMemo(() => {
    const d = new Date(MOCK.payTime);
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  return (
    <>
      <Head>
        <title>感謝頁機票範例｜JEKO eSIM</title>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=jura:300,500,700"
        />
      </Head>

      <div className="preview-page">
        <div className="preview-bar">
          <p>
            範例預覽 · scoop 票根 + QR · 含印表機列印動畫（無撕開）
          </p>
          <div className="preview-actions">
            <button type="button" onClick={() => setReplayKey((k) => k + 1)}>
              重播列印動畫
            </button>
            <Link href="/thank-you/">正式感謝頁</Link>
            <Link href="/">回首頁</Link>
          </div>
        </div>

        <div className="preview-stage">
          <CheckoutTicketReceipt
            replayKey={replayKey}
            eyebrow="結帳成功 · 感謝購買"
            title="稍等一下，您的 eSIM 登機證正在列印…"
            fromCode="TW"
            fromLabel="台灣"
            toCode={toCode}
            toLabel={guessDestLabel(toCode)}
            passenger={MOCK.passenger}
            seat={`${MOCK.serviceDays} 天`}
            status={MOCK.status}
            paymentType={MOCK.paymentType}
            orderId={MOCK.orderNo}
            payTime={payTime}
            tradeNo={MOCK.tradeNo}
            plan={MOCK.planName}
            qrSrc={MOCK.qrSrc}
            barcodeText={`${shortOrderNo(MOCK.orderNo)} ${MOCK.tradeNo}`}
            instructions="請掃描票根 QR Code 安裝 eSIM；抵達目的地後再啟用行動數據。"
            animate
          />
        </div>
      </div>

      <style jsx>{`
        .preview-page {
          min-height: 100dvh;
          background-color: #f4f1ea;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 1px,
            rgb(54 65 83 / 0.12) 0 3px
          );
          font-family: Jura, "Noto Sans TC", system-ui, sans-serif;
        }
        .preview-bar {
          max-width: 720px;
          margin: 0 auto;
          padding: 16px 16px 0;
          color: #1e4ad1;
          font-size: 13px;
          font-weight: 500;
        }
        .preview-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .preview-actions button,
        .preview-actions :global(a) {
          display: inline-flex;
          align-items: center;
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          border: 1px solid #1e4ad1;
          background: #fff;
          color: #1e4ad1;
          cursor: pointer;
        }
        .preview-stage {
          padding: 28px 16px 48px;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </>
  );
}
