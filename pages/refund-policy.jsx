import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";
import Link from "next/link";

export default function RefundPolicyPage() {
  return (
    <LegalPageLayout
      title="退換貨政策"
      subtitle="Jeko eSIM 數位商品之退款、取消及售後處理說明。購買前請確認手機支援 eSIM，並留意「原生 eSIM」與「非原生／漫遊 eSIM」退換貨條件不同。"
      lastUpdated="2026 年 8 月 6 日"
      seo={{
        title: "退換貨政策｜Jeko eSIM",
        description:
          "Jeko eSIM 退換貨政策：非原生／漫遊 eSIM 依安裝與激活狀態退款；原生 eSIM 售出後概不退款或換貨。",
      }}
      siblingLink={{ href: "/terms", label: "查看服務條款" }}
    >
      <LegalSection title="一、商品性質與重要提醒">
        <p>
          Jeko eSIM 所販售之商品為<strong>數位 eSIM 方案</strong>
          （含原生線路與漫遊／非原生線路），非實體 SIM 卡。付款完成後，系統將以
          Email 或會員中心提供 QR Code 或安裝資訊，供您自行掃描安裝。
        </p>
        <ul>
          <li>
            請於購買前確認手機支援 eSIM、已解除電信鎖，且目的地與方案相符。
          </li>
          <li>
            商品頁若標示為<strong>原生 eSIM／原生卡／當地 IP 原生</strong>
            ，適用「原生 eSIM」退換貨規定；其餘漫遊或非原生線路適用下列「非原生／漫遊
            eSIM」規定。
          </li>
          <li>
            因手機不相容、未解鎖、設定錯誤或自行刪除 eSIM
            導致無法使用，原則上不在退款範圍內（連線問題請依客服協助流程處理）。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="二、非原生／漫遊 eSIM">
        <p>除原生 eSIM 以外之方案，退換貨原則如下：</p>
        <ol className="list-[lower-alpha] pl-5 space-y-3">
          <li>
            <strong>如 eSIM 未安裝，我們將全額退款。</strong>
          </li>
          <li>
            <strong>如 eSIM 已安裝但未激活，我們將全額退款。</strong>
          </li>
          <li>
            <strong>如 eSIM 已激活，則不予退款。</strong>
          </li>
          <li>
            <strong>
              如果您遇到任何連線問題，請聯絡我們的客戶支援。我們將協助您進行故障排除，並根據具體情況提供更換
              eSIM 或部分退款。
            </strong>
          </li>
        </ol>
        <p className="font-bold text-slate-800 mt-4">申請方式：</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>會員：</strong>登入{" "}
            <Link href="/account" className="text-sky-600 font-bold hover:underline">
              會員中心 → 我的 eSIM（訂單）
            </Link>
            ，點選訂單「申請退款」或售後表單。
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
          <li>
            客服得向 API／電信供應商查詢 eSIM 狀態（是否安裝、是否激活、流量與連線紀錄）。
          </li>
          <li>
            符合未安裝／已安裝未激活者，辦理全額退款；已激活者原則不予退款；連線問題則先排查，再視情況更換
            eSIM 或部分退款。
          </li>
          <li>退款透過原付款方式辦理；訂單狀態更新後，亦自合作夥伴分潤統計中排除。</li>
        </ol>
        <p>
          <strong>退款時程：</strong>審核通過後約 7～14 個工作天入帳（依发卡銀行而異）。
          金流手續費（約 2.8%）依法規及金流合約可能無法全額退回，剩餘款項將退還予您。
        </p>
      </LegalSection>

      <LegalSection title="三、原生 eSIM">
        <p>
          <strong>原生 eSIM 售出後概不退款或換貨。</strong>
        </p>
        <p>
          一經完成購買並交付安裝資訊（含 QR Code／安裝碼），即不接受取消、退款或換貨申請。請於購買前再次確認手機相容性、目的地與方案內容。
        </p>
        <p>
          若遇連線或安裝相關問題，仍歡迎聯絡客服協助排查；惟不因此構成退款或換貨承諾。
        </p>
      </LegalSection>

      <LegalSection title="四、取消訂單與待付款">
        <ul>
          <li>訂單狀態為「待付款」者，可直接取消，不產生費用。</li>
          <li>
            已完成付款但 QR Code 尚未發送前（極短時間內），請立即聯繫客服；若尚未向
            API 下單，得取消並全額退款（原生與非原生皆同）。
          </li>
          <li>
            QR Code 已發送後：非原生／漫遊方案依「第二條」；原生方案依「第三條」。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="五、合作夥伴／分潤賣場訂單">
        <p>若您透過合作夥伴專屬賣場或折扣碼購買：</p>
        <ul>
          <li>退款審核標準與官網相同，不因購買管道不同而改變。</li>
          <li>
            <strong>已退款訂單不計入合作夥伴分潤</strong>；若分潤已結算，得自次期分潤中扣回（Clawback）。
          </li>
          <li>
            合作夥伴不得自行承諾與本平台政策衝突之退款條件（例如「原生 eSIM
            保證可退」或「已激活保證全退」）。
          </li>
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
            標題建議：
            <code className="text-xs bg-slate-100 px-1">
              【eSIM 退款申請】訂單編號 XXXXX
            </code>
          </li>
          <li>客服時間：週一至週五 10:00–18:00（國定假日除外，急件請註明出國日期）</li>
        </ul>
        <p>
          本政策為 <Link href="/terms">服務條款</Link>{" "}
          之一部分；如有歧異，以最新公告之條款及本政策為準。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
