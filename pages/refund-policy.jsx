import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";
import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="退換貨政策"
      subtitle="Jeko eSIM 數位商品之退款、取消及售後處理說明。購買前請務必確認手機支援 eSIM 且了解開通即無法退貨之特性。"
      lastUpdated="2026 年 6 月 21 日"
      seo={{
        title: "退換貨政策｜Jeko eSIM",
        description:
          "Jeko eSIM 退換貨政策：說明數位 eSIM 未開通退款、已開通例外、申請流程、退款時程及合作夥伴分潤調整。",
      }}
      siblingLink={{ href: "/terms", label: "查看服務條款" }}
    >
      <LegalSection title="一、商品性質與重要提醒">
        <p>
          Jeko eSIM 所販售之商品為<strong>數位 eSIM 漫遊方案</strong>
          ，非實體 SIM 卡。付款完成後，系統將以 Email 或會員中心提供 QR Code
          或安裝資訊，供您自行掃描安裝。
        </p>
        <ul>
          <li>
            <strong>掃描 QR Code 或於手機完成 eSIM 安裝／啟用，即視為商品已交付並開始使用。</strong>
          </li>
          <li>請於購買前確認手機支援 eSIM、已解除電信鎖，且目的地與方案相符。</li>
          <li>因手機不相容、未解鎖、設定錯誤或自行刪除 eSIM 導致無法使用，不在退款範圍內。</li>
        </ul>
      </LegalSection>

      <LegalSection title="二、未開通 — 可退款（全額）">
        <p>符合以下<strong>全部</strong>條件者，得申請<strong>全額退款</strong>：</p>
        <ul>
          <li>購買後 <strong>7 日內</strong>提出申請（以 Email 或 LINE 客服收件時間為準）</li>
          <li>QR Code <strong>尚未被掃描</strong>，且 eSIM 於 API／電信端狀態為<strong>未啟用</strong></li>
          <li>該方案<strong>尚未產生任何流量使用紀錄</strong></li>
          <li>非因重複惡意下單或濫用優惠碼之情形</li>
        </ul>
        <p className="font-bold text-slate-800">未開通退款流程：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>會員：</strong>登入{" "}
            <Link href="/account" className="text-sky-600 font-bold hover:underline">
              會員中心 → 我的 eSIM（訂單）
            </Link>
            ，點選訂單「申請退款」線上填寫。
            <br />
            <strong>非會員：</strong>請先{" "}
            <a
              href="https://line.me/R/ti/p/@391huuts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 font-bold hover:underline"
            >
              加入官方 LINE
            </a>
            後提交審核申請；亦可來信{" "}
            <a href="mailto:support@jeko-esim.com.tw">support@jeko-esim.com.tw</a>
            {" "}或{" "}
            <a href="mailto:info@bluelink.com.tw">info@bluelink.com.tw</a>
            {" "}或透過{" "}
            <Link href="/contact">聯絡我們</Link>，提供<strong>訂單編號</strong>與
            <strong>購買 Email</strong>。
          </li>
          <li>客服向 API 供應商查詢 eSIM 狀態（未開通／未使用）。</li>
          <li>確認符合條件後，取消該 eSIM 訂單（若 API 支援）。</li>
          <li>透過原付款方式（藍新金流等）辦理退款。</li>
          <li>訂單狀態更新為「已退款」，並自合作夥伴分潤統計中排除。</li>
        </ol>
        <p>
          <strong>退款時程：</strong>審核通過後約 7～14 個工作天入帳（依发卡銀行而異）。
          金流手續費（約 2.8%）依法規及金流合約可能無法全額退回，剩餘款項將退還予您。
        </p>
      </LegalSection>

      <LegalSection title="三、已開通 — 原則不退款">
        <p>
          eSIM 一經掃描安裝或啟用，即屬已使用之數位商品，<strong>原則上不提供退款</strong>
          ，亦無「試用期」或「猶豫期」之適用（依數位商品交付特性及平台政策）。
        </p>
        <p className="font-bold text-slate-800">以下例外情形，得個案審核（非保證退款）：</p>
        <ul>
          <li>
            <strong>系統或我方錯誤：</strong>重複扣款、出貨方案與訂單不符、QR Code 完全無效且無法補發。
          </li>
          <li>
            <strong>服務端故障：</strong>經 API／電信商確認方案失效、全區無訊號且無法補發或延長，且您已提供完整設定截圖與錯誤說明。
          </li>
          <li>
            <strong>不可抗力：</strong>重大電信中斷或政策變更，且供應商同意取消或折讓（依個案協商）。
          </li>
        </ul>
        <p className="font-bold text-slate-800">已開通爭議處理流程：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>會員：</strong>購買後 30 日內於{" "}
            <Link href="/account" className="text-sky-600 font-bold hover:underline">
              會員中心
            </Link>
            提交「售後／爭議處理」表單（含手機型號、問題說明與 1～3 張截圖）。
            <br />
            <strong>非會員：</strong>請先{" "}
            <a
              href="https://line.me/R/ti/p/@391huuts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 font-bold hover:underline"
            >
              加入官方 LINE
            </a>
            後提交審核申請，或來信客服提供相同資料。
          </li>
          <li>客服協助基本排查（APN、數據漫遊、重新下載 Profile 等）。</li>
          <li>若仍無法使用，提交 API 供應商查驗啟用紀錄、流量與基站連線狀態。</li>
          <li>
            依查驗結果處置：
            <ul className="mt-1 space-y-1">
              <li>可補發或延長方案 → 優先以<strong>補發 eSIM／延長效期</strong>處理</li>
              <li>確認為我方或供應商責任 → 得協商<strong>部分或全額退款</strong></li>
              <li>屬手機不相容、使用者誤刪 Profile、已耗用流量 → <strong>不予退款</strong></li>
            </ul>
          </li>
          <li>結案後以 Email 通知處理結果；若退款，時程同未開通退款（約 7～14 工作天）。</li>
        </ol>
      </LegalSection>

      <LegalSection title="四、取消訂單與待付款">
        <ul>
          <li>訂單狀態為「待付款」者，可直接取消，不產生費用。</li>
          <li>已完成付款但 QR Code 尚未發送前（極短時間內），請立即聯繫客服；若尚未向 API 下單，得取消並全額退款。</li>
          <li>QR Code 已發送但未掃描者，依「未開通退款」辦理。</li>
        </ul>
      </LegalSection>

      <LegalSection title="五、合作夥伴／分潤賣場訂單">
        <p>若您透過合作夥伴專屬賣場或折扣碼購買：</p>
        <ul>
          <li>退款審核標準與官網相同，不因購買管道不同而改變。</li>
          <li>
            <strong>已退款訂單不計入合作夥伴分潤</strong>；若分潤已結算，得自次期分潤中扣回（Clawback）。
          </li>
          <li>合作夥伴不得自行承諾與本平台政策衝突之退款條件（例如「已開通保證全退」）。</li>
        </ul>
      </LegalSection>

      <LegalSection title="六、發票與退款">
        <ul>
          <li>全額退款時，已開立之電子發票將依稅法規定辦理折讓或作廢。</li>
          <li>部分退款者，就退款金額開立折讓單。</li>
        </ul>
      </LegalSection>

      <LegalSection title="七、聯絡方式">
        <p>退換貨申請請備妥訂單編號，透過以下方式聯繫：</p>
        <ul>
          <li>
            <strong>非會員：</strong>請先{" "}
            <a
              href="https://line.me/R/ti/p/@391huuts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 font-bold hover:underline"
            >
              加入官方 LINE
            </a>
            後提交退款或售後審核申請。
          </li>
          <li>
            Jeko 客服：
            <a href="mailto:support@jeko-esim.com.tw">support@jeko-esim.com.tw</a>
          </li>
          <li>
            藍鏈數位企業社：
            <a href="mailto:info@bluelink.com.tw">info@bluelink.com.tw</a>
          </li>
          <li>
            標題建議：<code className="text-xs bg-slate-100 px-1">【eSIM 退款申請】訂單編號 XXXXX</code>
          </li>
          <li>客服時間：週一至週五 10:00–18:00（國定假日除外，急件請註明出國日期）</li>
        </ul>
        <p>
          本政策為 <Link href="/terms">服務條款</Link> 之一部分；如有歧異，以最新公告之條款及本政策為準。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
