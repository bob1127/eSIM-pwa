import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="服務條款"
      subtitle="使用 Jeko eSIM 購買 eSIM、會員服務及合作夥伴方案前，請詳閱以下條款。"
      lastUpdated="2026 年 6 月 20 日"
      seo={{
        title: "服務條款｜Jeko eSIM",
        description:
          "Jeko eSIM 服務條款：說明 eSIM 購買、使用、退款、合作夥伴分潤及相關權利義務。",
      }}
      siblingLink={{ href: "/privacy", label: "查看隱私權政策" }}
    >
      <LegalSection title="一、服務說明與適用範圍">
        <p>
          歡迎使用 <strong>Jeko eSIM</strong>（以下簡稱「本平台」）所提供之
          eSIM 數位商品販售、會員帳戶、合作夥伴分潤賣場及相關旅遊加值服務。
          當您完成註冊、下單、申請成為合作夥伴或使用本平台任何功能，即表示您已閱讀、理解並同意受本條款約束。
        </p>
        <p>
          若您不同意本條款，請勿使用本平台服務。本平台保留隨時修訂本條款之權利，修訂後將於網站公告；您於修訂後繼續使用服務，視為同意修訂內容。
        </p>
      </LegalSection>

      <LegalSection title="二、帳號與會員義務">
        <ul>
          <li>
            您應提供正確、完整且最新的註冊資料（含 Email），並妥善保管帳號密碼。
          </li>
          <li>
            因您個人疏失導致帳號遭他人使用所產生之損失，由您自行承擔；若發現異常登入，請立即聯繫客服。
          </li>
          <li>
            本平台支援 Email 或第三方社群（Google、Facebook、LINE
            等）登入；使用第三方登入時，您授權本平台取得該平台所公開之基本資料以建立會員帳戶。
          </li>
          <li>禁止以本平台從事詐欺、洗錢、侵權或其他違反法令之行為。</li>
        </ul>
      </LegalSection>

      <LegalSection title="三、eSIM 商品購買與使用">
        <ul>
          <li>
            eSIM 為<strong>數位商品</strong>，付款成功後將以 Email
            或會員中心提供 QR Code / 啟用資訊，恕無實體 SIM 卡寄送。
          </li>
          <li>
            請於購買前確認您的手機支援 eSIM
            功能且已解除電信鎖；因裝置不相容導致無法使用，依各方案退款政策辦理。
          </li>
          <li>
            各國 eSIM 方案之有效天數、流量、覆蓋範圍及啟用方式，以商品頁面說明為準。
          </li>
          <li>
            流量計算、漫遊設定及 APN
            等技術細節，請依商品說明或客服指引操作；因使用者自行設定錯誤所致問題，本平台得協助排查但不保證即時恢復。
          </li>
          <li>
            禁止轉售、破解、複製或非法散布 eSIM
            啟用資訊；違反者本平台得終止服務並保留法律追訴權。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="四、付款、發票與退款">
        <ul>
          <li>
            本平台接受信用卡、LINE Pay
            等線上付款方式；交易由第三方支付服務商處理，本平台不儲存完整卡號。
          </li>
          <li>
            電子發票將依您填寫之 Email
            或會員資料開立；如需統編發票，請於結帳時正確填寫。
          </li>
          <li>
            eSIM 一經發送 QR Code
            或完成啟用程序，原則上不予退款；尚未啟用且符合退款條件者，依{" "}
            <a href="/refund-policy">退換貨政策</a> 及客服審核結果辦理。
          </li>
          <li>
            因電信商、天災、政策變更等不可抗力致服務中斷，本平台將盡力協調但不負完全賠償責任。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="五、合作夥伴方案（分潤賣場）">
        <p>若您申請成為 Jeko eSIM 合作夥伴，另須遵守以下約定：</p>
        <ul>
          <li>
            <strong>專屬賣場網址</strong>：審核通過後，您將獲得專屬網址（格式：
            <code className="text-[#1a56db] bg-white/80 px-1 rounded">
              www.jeko-esim.com.tw/p/您的代碼
            </code>
            ）。此代碼於申請時設定，原則上不可更改，請謹慎填寫。
          </li>
          <li>
            您可自平台商品目錄選品、設定加價比例，透過專屬賣場向旅客銷售
            eSIM，並依核准之分潤比例獲得收益。
          </li>
          <li>
            合作夥伴應以合法、真實方式推廣，不得虛偽宣傳、誤導消費者，或冒用
            Jeko eSIM 官方名義。
          </li>
          <li>
            分潤結算方式、最低提領門檻及匯款作業，依平台公告或個別通知為準。
          </li>
          <li>
            若發現違規推廣、惡意刷單或損害品牌形象，本平台得暫停或終止合作資格，並保留追回不當分潤之權利。
          </li>
          <li>合作申請須經本平台審核，審核結果將以 Email 通知，本平台保留准駁最終決定權。</li>
        </ul>
      </LegalSection>

      <LegalSection title="六、智慧財產權">
        <p>
          本平台之商標、Logo、網站設計、文案及商品資料，均受智慧財產權法保護。未經書面授權，不得複製、改作或作商業利用。
          合作夥伴於推廣時可使用平台提供之行銷素材，但不得修改 Jeko eSIM 品牌標識或造成消費者混淆。
        </p>
      </LegalSection>

      <LegalSection title="七、免責聲明與責任限制">
        <ul>
          <li>
            本平台盡力維持服務穩定，但不保證網站或 eSIM
            連線在任何時間、任何地區均完全無中斷。
          </li>
          <li>
            因第三方電信商、漫遊合作方或使用者裝置問題所致之連線品質，本平台之責任以該筆訂單已付金額為上限。
          </li>
          <li>
            本平台對於您因使用或無法使用服務所產生之間接、附帶或衍生損害，不負賠償責任，法律另有強制規定者除外。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="八、準據法與管轄">
        <p>
          本條款之解釋與適用，以<strong>中華民國法律</strong>為準據法。
        </p>
        <p>
          因本條款所生爭議，消費者得依消費者保護法向住所地法院起訴；
          其餘爭議，依民事訴訟法規定定其管轄法院。
        </p>
      </LegalSection>

      <LegalSection title="九、聯絡方式">
        <p>若對本條款有任何疑問，請聯繫：</p>
        <ul>
          <li>
            Jeko 客服：
            <a href="mailto:support@jeko-esim.com.tw">support@jeko-esim.com.tw</a>
          </li>
          <li>
            藍鏈數位企業社：
            <a href="mailto:info@bluelink.com.tw">info@bluelink.com.tw</a>
          </li>
          <li>
            LINE 官方帳號：
            <a href="https://lin.ee/y6tdx5q" target="_blank" rel="noopener noreferrer">
              加入好友
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
