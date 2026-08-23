"use client";

/**
 * 感謝頁 — ATM／轉帳（VACC）待付款預覽
 * http://localhost:3000/thank-you-vacc-preview/
 */
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import CheckoutTicketReceipt from "@/components/checkout/CheckoutTicketReceipt";
import JekoPillButton from "@/components/ui/JekoPillButton";

const MOCK = {
  orderNo: "01VACC0PKGA5BMXZR2YB2TQVACC",
  payTime: "—",
  paymentType: "VACC",
  status: "PENDING",
  planName: "日本 5 天 3GB",
  tradeNo: "2026082318301122334",
  bankCode: "808",
  codeNo: "12345678901234",
  expireDate: "2026-08-24 23:59:59",
  amt: 499,
};

export default function ThankYouVaccPreviewPage() {
  const [replayKey, setReplayKey] = useState(0);
  const [copiedHint, setCopiedHint] = useState("");

  const copyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(String(text));
      setCopiedHint("已複製到剪貼簿");
      setTimeout(() => setCopiedHint(""), 1800);
    } catch {
      setCopiedHint("複製失敗，請手動選取");
      setTimeout(() => setCopiedHint(""), 1800);
    }
  };

  return (
    <>
      <Head>
        <title>感謝頁·轉帳付款預覽｜JEKO eSIM</title>
        <link
          rel="stylesheet"
          href="https://fonts.bunny.net/css?family=jura:300,500,700"
        />
      </Head>

      <div className="preview-page">
        {copiedHint ? (
          <div className="copy-toast">{copiedHint}</div>
        ) : null}

        <div className="preview-bar">
          <p>範例預覽 · ATM／轉帳待付款 VACC（假資料）</p>
          <div className="preview-actions">
            <button type="button" onClick={() => setReplayKey((k) => k + 1)}>
              重播列印動畫
            </button>
            <Link href="/thank-you-fail-preview/">付款失敗預覽</Link>
            <Link href="/thank-you-ticket-preview/">成功預覽</Link>
            <Link href="/thank-you/">正式感謝頁</Link>
          </div>
        </div>

        <div className="preview-stage">
          <CheckoutTicketReceipt
            key={replayKey}
            replayKey={replayKey}
            eyebrow="訂單已建立 · 待轉帳"
            title="請完成 ATM／銀行轉帳，eSIM 登機證將於入帳後開立"
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
            instructions="完成轉帳並入帳後，本頁／信件會提供安裝 QR Code。請於繳費期限前完成匯款。"
            animate
          />
        </div>

        <div className="preview-bottom">
          <div className="vacc-card">
            <h3>匯款 / 代碼繳費資訊</h3>
            <div className="vacc-rows">
              <p>
                銀行代碼：
                <span className="mono">{MOCK.bankCode}</span>{" "}
                <button type="button" onClick={() => copyText(MOCK.bankCode)}>
                  複製
                </button>
              </p>
              <p>
                虛擬帳號：
                <span className="mono break">{MOCK.codeNo}</span>{" "}
                <button type="button" onClick={() => copyText(MOCK.codeNo)}>
                  複製
                </button>
              </p>
              <p>繳費期限：{MOCK.expireDate}</p>
              <p>應繳金額：${MOCK.amt}</p>
            </div>
            <p className="vacc-note">
              入帳後系統會自動發貨並寄信。可至訂單追蹤頁查看狀態。
            </p>
            <JekoPillButton
              href={`/pending/?orderNo=${encodeURIComponent(MOCK.orderNo)}`}
              variant="primary"
              size="sm"
            >
              前往訂單追蹤
            </JekoPillButton>
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
        .copy-toast {
          position: fixed;
          top: 16px;
          left: 50%;
          z-index: 50;
          transform: translateX(-50%);
          border-radius: 999px;
          background: #0f172a;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 16px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
        }
        .preview-bar {
          max-width: 720px;
          margin: 0 auto;
          padding: 16px 16px 0;
          color: #b45309;
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
          border: 1px solid #b45309;
          background: #fff;
          color: #b45309;
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
        .vacc-card {
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 20px;
          color: #0f172a;
        }
        .vacc-card h3 {
          margin: 0 0 12px;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }
        .vacc-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .vacc-rows p {
          margin: 0;
        }
        .mono {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            monospace;
          font-weight: 700;
        }
        .break {
          word-break: break-all;
        }
        .vacc-rows button {
          margin-left: 6px;
          border: 0;
          background: transparent;
          color: #1d4ed8;
          text-decoration: underline;
          font-size: 13px;
          cursor: pointer;
        }
        .vacc-note {
          margin: 0 0 14px;
          font-size: 12px;
          line-height: 1.5;
          color: #64748b;
        }
      `}</style>
    </>
  );
}
