import Link from "next/link";
import { LegalSection } from "@/components/legal/LegalPageLayout";
import { SUPPORT_EMAIL, CONTACT_INFO } from "@/lib/contactUi";

const LINE_OA = CONTACT_INFO.lineUrl;

/**
 * 新會員 50 優惠規則（視覺對齊條款頁 LegalSection）
 * 單一禮遇、兩種情境文案，不疊加。
 */
export default function PromoWelcomeRules() {
  return (
    <section className="mt-2 md:mt-4 pb-8" aria-labelledby="promo-rules-heading">
      <div className="text-center mb-8 max-w-2xl mx-auto">
        <p className="text-[11px] font-bold tracking-widest text-[#1a56db] uppercase mb-2">
          Terms
        </p>
        <h2
          id="promo-rules-heading"
          className="text-2xl font-black text-slate-900 mb-2"
        >
          新會員 50 元折價券｜活動規則
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          以下為「新會員折抵 NT$50」之適用說明。兩種加入路徑為同一禮遇，終身限領／限用一次，不會疊加為
          100 元。
        </p>
        <p className="inline-block mt-4 text-[11px] text-slate-400 bg-white border border-slate-200 rounded-full px-3 py-1">
          最後更新：2026 年 8 月 10 日
        </p>
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <LegalSection title="一、活動摘要">
          <p>
            本活動提供<strong>一張價值 NT$50 之新會員折價券</strong>
            （以下稱「本折價券」），於符合條件之訂單結帳時折抵新台幣五十元。
          </p>
          <ul>
            <li>
              <strong>情境 A：</strong>
              先註冊成為本站會員 → 系統發放本折價券 →{" "}
              <strong>須加入官方 LINE 後方可於結帳使用</strong>。
            </li>
            <li>
              <strong>情境 B：</strong>
              已加入官方 LINE、尚未註冊會員者（例如於 LINE
              官方帳號看到行銷圖文）→ 完成會員註冊後同樣領取{" "}
              <strong>同一張本折價券</strong>；若當下已是官方帳號好友，即可於結帳使用。
            </li>
            <li>
              情境 A 與情境 B <strong>不會疊加</strong>
              ：同一自然人／同一會員身分／同一 LINE
              帳號，終身僅能領取並核銷本折價券一次，合計折抵上限為 NT$50，不會變成
              NT$100。
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="二、參加資格">
          <ul>
            <li>
              須完成本站會員註冊或使用本站支援之第三方登入（如
              Google、Facebook、LINE 登入等）並成功建立會員帳戶。
            </li>
            <li>
              僅限<strong>尚未使用過本活動折價券</strong>
              （含尚未核銷過新會員 50／同等歡迎禮）之會員。
            </li>
            <li>
              使用本折價券前，須以可驗證之方式<strong>加入 Jeko eSIM 官方 LINE</strong>
              ，並維持好友狀態（封鎖、刪除好友或無法驗證為好友時，恕無法套用）。
            </li>
            <li>
              本活動與「僅加好友、未註冊」無關：未完成會員註冊者，不會單獨因加好友而另發第二張可折抵券。
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="三、領取與使用方式">
          <ul>
            <li>
              <strong>領取：</strong>
              會員登入後，系統得於會員中心、購物車或優惠相關頁面自動發放本折價券至會員帳戶；亦可於結帳流程依畫面提示領取。
            </li>
            <li>
              <strong>使用：</strong>
              於本站（或指定賣場）結帳時套用個人折價券代碼或系統自動帶入之優惠；實際折抵以結帳頁顯示為準。
            </li>
            <li>
              <strong>LINE 門檻：</strong>
              未加入官方 LINE、或以未綁定／未通過驗證之 LINE
              身分結帳者，無法完成套用。請先{" "}
              <a href={LINE_OA} target="_blank" rel="noopener noreferrer">
                加入官方 LINE
              </a>
              。
            </li>
            <li>
              本折價券原則上適用於符合條件之 eSIM
              相關訂單；若當期另有排除商品、最低消費或其他結帳限制，以結帳頁或活動公告為準。
            </li>
            <li>
              折價券不得折現、轉售、轉讓予他人帳戶，或兌換為現金／其他非本站指定權益。
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="四、不疊加與併用說明">
          <ul>
            <li>
              <strong>本活動內部不疊加：</strong>
              「新加入會員送 50」與「已加 LINE 後再註冊送
              50」為同一禮遇之兩種說明路徑，僅能擇一成就，核銷一次。
            </li>
            <li>
              公開碼（如 NEW50／FIRST50 等新會員相關代碼）若與本折價券同屬「新會員
              50」性質，原則上<strong>擇一使用</strong>，不得重複折抵。
            </li>
            <li>
              與其他行銷活動（例如推薦好友、拉霸抽獎等）之併用條件，以各該活動規則及結帳系統可同時套用之結果為準；若系統判定衝突，以系統實際可套用者為準。
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="五、防弊與異常使用">
          <ul>
            <li>
              同一 Email、同一 LINE 用戶識別，或經本平台合理認定為同一使用者之情形，終身限領／限核銷本折價券一次。
            </li>
            <li>
              禁止以大量註冊、虛假資料、共用裝置／帳號、退追後再加好友、規避驗證或其他不正當方式重複領取或套用。
            </li>
            <li>
              若發現異常或疑似濫用，本平台得暫停發放、取消尚未使用之折價券、撤銷不當折抵、拒絕出貨或採取其他必要措施，並得依{" "}
              <Link href="/terms">服務條款</Link> 處理。
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="六、其他約定">
          <ul>
            <li>
              本平台保留隨時調整、暫停或終止本活動之權利；變更將以本頁或其他網站公告為準，已合法核銷完成之訂單原則不受影響。
            </li>
            <li>
              本規則未盡事宜，適用本站{" "}
              <Link href="/terms">服務條款</Link>、
              <Link href="/privacy">隱私權政策</Link> 及相關公告。
            </li>
            <li>
              如有疑問，請聯繫客服：{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              ，或透過{" "}
              <a href={LINE_OA} target="_blank" rel="noopener noreferrer">
                官方 LINE
              </a>{" "}
              洽詢。
            </li>
          </ul>
        </LegalSection>
      </div>
    </section>
  );
}
