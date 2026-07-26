import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="隱私權政策"
      subtitle="Jeko eSIM 重視您的個人資料保護。本政策說明我們如何蒐集、使用、保存及保障您的資訊。"
      lastUpdated="2026 年 6 月 20 日"
      seo={{
        title: "隱私權政策｜Jeko eSIM",
        description:
          "Jeko eSIM 隱私權政策：說明個人資料蒐集、使用、保護方式與您的權利，保障出國上網服務使用者的資料安全。",
      }}
      siblingLink={{ href: "/terms", label: "查看服務條款" }}
    >
      <LegalSection title="一、政策適用範圍">
        <p>
          本隱私權政策適用於您使用 <strong>Jeko eSIM</strong> 網站（含合作夥伴專屬賣場
          <code className="text-[#1a56db] bg-white/80 px-1 rounded">/p/代碼</code>
          ）、行動應用程式、LINE 官方帳號及相關客服管道時，我們對您個人資料的處理方式。
        </p>
        <p>
          「個人資料」指得以直接或間接識別您身分之資訊，包含姓名、Email、電話、訂單紀錄、裝置識別碼等。
        </p>
      </LegalSection>

      <LegalSection title="二、我們蒐集哪些資料">
        <p>依您使用的服務不同，我們可能蒐集以下資料：</p>
        <ul>
          <li>
            <strong>帳號資料</strong>：Email、暱稱、密碼（加密儲存）；若使用 Google、Facebook、LINE
            登入，則取得您授權之公開基本資料。
          </li>
          <li>
            <strong>訂單與交易</strong>：購買方案、金額、付款狀態、發票資訊、eSIM
            啟用紀錄。
          </li>
          <li>
            <strong>合作夥伴申請</strong>：公司／頻道名稱、聯絡人、電話、合作身份、推廣資源描述、專屬賣場代碼等。
          </li>
          <li>
            <strong>技術紀錄</strong>：IP 位址、瀏覽器類型、Cookie、使用時間，用於安全防護與服務優化。
          </li>
          <li>
            <strong>客服互動</strong>：您透過 Email、LINE 或網站表單提供的諮詢內容。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="三、資料使用目的">
        <ul>
          <li>完成 eSIM 訂單、發送 QR Code 及售後支援。</li>
          <li>建立與維護會員帳戶、訂單查詢及登入驗證。</li>
          <li>審核合作夥伴申請、開通分潤賣場及結算分潤。</li>
          <li>寄送交易通知、重要政策更新（您可拒收非必要行銷訊息）。</li>
          <li>防止詐欺、濫用及確保平台安全。</li>
          <li>依法律規定配合主管機關或司法單位之合法要求。</li>
          <li>統計分析以改善網站體驗（採去識別化或聚合方式處理）。</li>
        </ul>
      </LegalSection>

      <LegalSection title="四、資料分享與第三方服務">
        <p>
          <strong>我們不會出售或出租您的個人資料。</strong>
          為完成服務，我們可能與以下類型之合作方分享必要資料：
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>：帳號驗證、資料庫儲存（伺服器位於安全雲端環境）。
          </li>
          <li>
            <strong>金流服務商</strong>（如藍新金流、LINE Pay）：處理付款，我們不儲存完整信用卡號。
          </li>
          <li>
            <strong>eSIM 供應商</strong>（如 MicroEsim 等）：完成 eSIM 開通與流量服務。
          </li>
          <li>
            <strong>Email 發送服務</strong>：寄送訂單確認及 eSIM 啟用資訊。
          </li>
        </ul>
        <p>
          上述合作方僅能在提供服務所需範圍內使用您的資料，並須遵守相應之資料保護義務。
        </p>
      </LegalSection>

      <LegalSection title="五、Cookie 與類似技術">
        <p>
          我們使用 Cookie 及類似技術以維持登入狀態、記住購物車及分析流量。
          您可透過瀏覽器設定拒絕 Cookie，但部分功能（如保持登入）可能無法正常運作。
        </p>
      </LegalSection>

      <LegalSection title="六、資料保存期間">
        <ul>
          <li>會員帳號資料：於帳號存續期間及刪除後法定保存期限內。</li>
          <li>交易紀錄：依稅法及商業會計法，至少保存 5 年。</li>
          <li>合作夥伴資料：合作關係存續期間及終止後合理期間。</li>
          <li>客服紀錄：依處理需要，通常保存 1 至 3 年。</li>
        </ul>
      </LegalSection>

      <LegalSection title="七、您的權利">
        <p>依個人資料保護法，您享有以下權利：</p>
        <ul>
          <li>查詢、閱覽您的個人資料。</li>
          <li>請求補充或更正錯誤資料。</li>
          <li>請求停止蒐集、處理或利用（可能影響服務使用）。</li>
          <li>請求刪除帳號及相關資料（法定保存資料除外）。</li>
        </ul>
        <p>
          請透過 Email 或 LINE 官方帳號提出申請，我們將於合理期間內回覆。若您認為權益受損，得向主管機關申訴。
        </p>
      </LegalSection>

      <LegalSection title="八、資料安全">
        <p>
          我們採取 HTTPS 加密傳輸、存取權限控管、密碼雜湊等業界標準措施保護您的資料。
          然而，網際網路傳輸無法保證百分之百安全，請您亦妥善保管帳號密碼。
        </p>
      </LegalSection>

      <LegalSection title="九、未成年人">
        <p>
          本平台服務主要面向成年人。若您未滿 18
          歲，請在法定代理人同意下使用本平台；我們不會故意蒐集未成年人之個人資料。
        </p>
      </LegalSection>

      <LegalSection title="十、政策修訂與聯絡">
        <p>
          我們可能因法規或服務調整而更新本政策，更新後將於本頁公告並註明日期。
          重大變更時，我們將以 Email 或網站公告方式通知。
        </p>
        <p>隱私權相關問題，請聯繫：</p>
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
