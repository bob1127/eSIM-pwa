"use client";

/**
 * 感謝頁 — 付款失敗預覽
 * http://localhost:3000/thank-you-fail-preview/
 */
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import CheckoutTicketReceipt from "@/components/checkout/CheckoutTicketReceipt";
import JekoPillButton from "@/components/ui/JekoPillButton";

const MOCK = {
  orderNo: "01FAIL0PKGA5BMXZR2YB2TQFAIL",
  payTime: "2026-08-23 18:05",
  paymentType: "CREDIT",
  status: "FAILED",
  planName: "日本 5 天 3GB",
  tradeNo: "—",
};

export default function ThankYouFailPreviewPage() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <>
      <Head>
        <title>感謝頁·付款失敗預覽｜JEKO eSIM</title>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=jura:300,500,700"
        />
      </Head>

      <div className="preview-page">
        <div className="preview-bar">
          <p>範例預覽 · 付款失敗（假資料）</p>
          <div className="preview-actions">
            <button type="button" onClick={() => setReplayKey((k) => k + 1)}>
              重播列印動畫
            </button>
            <Link href="/thank-you-vacc-preview/">轉帳付款預覽</Link>
            <Link href="/thank-you-ticket-preview/">成功預覽</Link>
            <Link href="/thank-you/">正式感謝頁</Link>
          </div>
        </div>

        <div className="preview-stage">
          <CheckoutTicketReceipt
            key={replayKey}
            replayKey={replayKey}
            eyebrow="付款未完成"
            title="付款失敗，尚未開立 eSIM 登機證"
            fromCode="—"
            fromLabel="—"
            toCode="—"
            toLabel="—"
            passenger="—"
            seat="—"
            status="—"
            paymentType="—"
            orderId="—"
            payTime="—"
            tradeNo="—"
            plan="—"
            qrSrc=""
            barcodeText="—"
            instructions="付款未成功，請重新結帳或改用其他付款方式。完成付款後才會產生 QR Code。"
            animate
          />
        </div>

        <div className="preview-bottom">
          <div className="fail-card">
            <h3>付款失敗</h3>
            <p>
              藍新／金流回傳狀態為 <strong>FAILED</strong>
              。款項未入帳，eSIM 不會發貨。
            </p>
            <ul>
              <li>可回到購物車重新結帳</li>
              <li>若已扣款卻顯示失敗，請聯繫客服並提供訂單編號</li>
              <li>訂單編號：{MOCK.orderNo}</li>
            </ul>
            <div className="fail-actions">
              <JekoPillButton href="/Cart/" variant="primary" size="sm">
                重新結帳
              </JekoPillButton>
              <JekoPillButton href="/support/" variant="secondary" size="sm">
                聯繫客服
              </JekoPillButton>
            </div>
          </div>
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
          color: #b91c1c;
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
          border: 1px solid #b91c1c;
          background: #fff;
          color: #b91c1c;
          cursor: pointer;
        }
        .preview-stage {
          padding: 28px 16px 24px;
          display: flex;
          justify-content: center;
        }
        .preview-bottom {
          max-width: 420px;
          margin: 0 auto;
          padding: 0 16px 48px;
        }
        .fail-card {
          border-radius: 16px;
          border: 1px solid #fecaca;
          background: #fef2f2;
          padding: 20px;
          color: #7f1d1d;
        }
        .fail-card h3 {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 800;
        }
        .fail-card p {
          margin: 0 0 12px;
          font-size: 13px;
          line-height: 1.55;
        }
        .fail-card ul {
          margin: 0 0 16px;
          padding-left: 18px;
          font-size: 13px;
          line-height: 1.6;
        }
        .fail-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </>
  );
}
