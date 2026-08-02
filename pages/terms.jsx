import LegalPageLayout, {
  LegalSection,
} from "@/components/legal/LegalPageLayout";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="服務條款"
      subtitle="使用 Jeko eSIM 購買 eSIM、會員服務及合作夥伴方案前，請詳閱以下條款。"
      lastUpdated="2026 年 8 月 2 日（f）"
      seo={{
        title: "服務條款｜Jeko eSIM",
        description:
          "Jeko eSIM 服務條款：說明 eSIM 購買、使用、退款、合作夥伴（專屬連結／專屬商店）分潤及相關權利義務。",
      }}
      siblingLink={{ href: "/privacy", label: "查看隱私權政策" }}
    >
      <LegalSection title="一、服務說明與適用範圍">
        <p>
          歡迎使用 <strong>Jeko eSIM</strong>（以下簡稱「本平台」）所提供之 eSIM
          數位商品販售、會員帳戶、合作夥伴方案（專屬連結／專屬商店）及相關旅遊加值服務。
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
            下單前請自行確認裝置符合 eSIM 使用條件（含是否支援
            eSIM、是否已解除電信鎖）。您可至{" "}
            <a href="/support">客服支援・相容機型列表</a> 查詢型號是否支援
            eSIM。
          </li>
          <li>
            各國 eSIM
            方案之有效天數、流量、覆蓋範圍及啟用方式，以商品頁面說明為準。
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

      <LegalSection title="五、合作夥伴方案（專屬連結／專屬商店）">
        <p>
          若您申請成為 Jeko eSIM
          合作夥伴，請於申請時選擇合作模式，並遵守下列共通約定及所選模式之特別約定。
          合作模式原則上於申請時選定；如需變更，須經本平台書面同意並重新審核。
        </p>

        <p className="font-semibold text-gray-900 mt-4 mb-2">（一）共通約定</p>
        <ul>
          <li>
            合作申請須經本平台審核，審核結果將以 Email
            通知，本平台保留准駁最終決定權。
          </li>
          <li>
            合作夥伴應以合法、真實方式推廣，不得虛偽宣傳、誤導消費者，或冒用
            Jeko eSIM 官方名義。
          </li>
          <li>
            若發現違規推廣、惡意刷單或損害品牌形象，本平台得暫停或終止合作資格，並保留追回不當分潤之權利。
          </li>
        </ul>

        <p className="font-semibold text-gray-900 mt-6 mb-2">
          （二）分潤結算、對帳單與匯款
        </p>
        <ul>
          <li>
            <strong>結算時程：</strong>
            以訂單建立日所屬曆月（台北時間）為「成交月」。該成交月之訂單於
            <strong>次月 15 日</strong>辦理結算並產製對帳單。實際匯款以您於後台
            <strong>申請提領後 10 個工作天內</strong>
            為目標，由本平台人工匯入您提供並經確認之收款帳戶；遇金融機構非營業日得順延。
          </li>
          <li>
            <strong>應付分潤範圍：</strong>
            原則上僅計入狀態為「已完成」且未退款之訂單。取消、未完成、退款或其他非完成狀態之訂單，不計入該期應付分潤。若分潤已匯出後訂單始辦理退款或發生應追回事由，本平台得自後續應付分潤扣抵，或要求您返還溢領金額。
          </li>
          <li>
            <strong>對帳單：</strong>
            結算時本平台將提供電子對帳單（含應付金額、訂單明細與匯款備註建議）。對帳單為電子檔；您應於匯款前核對內容。雙方就金額有爭議時，應於收到對帳單後合理期間內提出，並以系統訂單紀錄為主要依據。
          </li>
          <li>
            <strong>匯款前確認：</strong>
            本平台於匯款前，將請您以 Email、LINE
            或其他可留存紀錄之方式，確認對帳單金額與收款帳戶資料（含銀行、分行、戶名、帳號）。未經確認，本平台得暫緩匯款；因帳戶資料錯誤或不完整所致之退匯、延誤，由您自負其責。
          </li>
          <li>
            <strong>匯款方式與備註：</strong>
            分潤以人工銀行轉帳或其他本平台指定方式給付。匯款時，
            <strong>由本平台於轉帳備註欄填寫</strong>
            識別碼，格式為
            <code className="text-[#1a56db] bg-white/80 px-1 rounded">
              JEKO-YYYYMM-夥伴代碼
            </code>
            （例如成交月為 2026 年 7 月、夥伴代碼為 JEEK 時，備註為
            JEKO-202607-JEEK）。該備註供雙方對帳，並非要求您於匯款時填寫。
          </li>
          <li>
            <strong>最低提領與申請提領：</strong>
            匯款須經後台申請提領。目前最低提領金額為 NT$3,000、單次上限 NT$20,000、訂單建立後需滿 10
            日曆天始計入可提領餘額。台北曆月
            <strong>第 1 次免手續費</strong>；
            <strong>第 2 次起每次自提領金額扣除 NT$15</strong>
            銀行轉帳手續費（實匯＝申請金額−手續費）。申請後由本平台核對，並以
            10 個工作天內匯款為目標。發票／扣繳或其他給付條件若另行公告，從其規定。
          </li>
          <li>
            儀表板或行銷文案所示分潤金額為預估或系統即時統計，
            <strong>實際應付以當期對帳單及匯款金額為準</strong>。
          </li>
        </ul>

        <p className="font-semibold text-gray-900 mt-6 mb-2">
          （三）專屬折扣碼連結模式
        </p>
        <ul>
          <li>
            審核通過後，您將獲得專屬連結（格式：
            <code className="text-[#1a56db] bg-white/80 px-1 rounded">
              www.jeko-esim.com.tw/r/您的代碼
            </code>
            ）。連結代碼同時可作為折扣碼，由系統發放或依平台規則配置，原則上不可自行更改。
          </li>
          <li>
            旅客點連結進官網時可自動帶入折扣碼；亦可於結帳手動輸入同一代碼折抵。折抵趴數依平台核准（例如全單
            10%）。於歸因有效期間內（目前為 Cookie 追蹤約 30
            天，實際以平台當時技術與公告為準）完成購買，該筆訂單始計入您的分潤。
          </li>
          <li>
            本模式不開通獨立賣場；除核准之折扣外，商品內容與結帳流程以官網為準，您不得向旅客收取額外費用。
          </li>
          <li>
            分潤依平台公告或個別核准為準，原則上以產品成本 × 核准分潤趴計算，且不超過該筆毛利（對外參考約為訂單實付
            15%，依方案與折扣略有差異）；專屬連結模式不適用達標加碼。未達歸因條件或非經專屬連結／折扣碼產生之訂單，不計入分潤。
          </li>
        </ul>

        <p className="font-semibold text-gray-900 mt-6 mb-2">
          （四）專屬商店模式
        </p>
        <ul>
          <li>
            審核通過後，您將獲得專屬商店網址（格式：
            <code className="text-[#1a56db] bg-white/80 px-1 rounded">
              www.jeko-esim.com.tw/p/您的代碼
            </code>
            ）。商店代碼於申請時設定，原則上不可更改，請謹慎填寫。
          </li>
          <li>
            您可自平台商品目錄選品、設定商店風格與加價比例，透過專屬商店向旅客銷售
            eSIM；原則上僅旅客於您的專屬商店完成結帳之訂單，始計入您的分潤。
          </li>
          <li>
            加價、選品及商店呈現不得誤導消費者（含價格、流量、覆蓋範圍或品牌歸屬）；本平台得要求修正或下架違規內容。
          </li>
          <li>
            利潤由您自訂加價決定（原則上為商店實付 − 平台底價 − 金流手續費）；商店暫停、下架或終止合作時，未結算權益依平台規則處理。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="六、智慧財產權">
        <p>
          本平台之商標、Logo、網站設計、文案及商品資料，均受智慧財產權法保護。未經書面授權，不得複製、改作或作商業利用。
          合作夥伴於推廣時可使用平台提供之行銷素材，但不得修改 Jeko eSIM
          品牌標識或造成消費者混淆。
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
            <a href="mailto:support@jeko-esim.com.tw">
              support@jeko-esim.com.tw
            </a>
          </li>
          <li>
            藍鏈數位企業社：
            <a href="mailto:info@bluelink.com.tw">info@bluelink.com.tw</a>
          </li>
          <li>
            LINE 官方帳號：
            <a
              href="https://lin.ee/y6tdx5q"
              target="_blank"
              rel="noopener noreferrer"
            >
              加入好友
            </a>
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
