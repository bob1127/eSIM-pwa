import Link from "next/link";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerStaticPageShell from "@/components/Shop/PartnerStaticPageShell";
import {
  LegalSection,
} from "@/components/legal/LegalPageLayout";
import { loadPartnerStorePageProps, partnerPagePaths } from "@/lib/partnerStorePages";

export default function PartnerTermsPage({ store, navCountries }) {
  const paths = partnerPagePaths(store?.domain);
  const brand = store?.store_name || "夥伴商店";

  return (
    <PartnerShopLayout
      store={store}
      title={`服務條款｜${brand}`}
      description={`${brand} 賣場服務條款與 JEKO eSIM 平台使用規範。`}
      navCountries={navCountries}
      seo={{ path: "terms" }}
    >
      <PartnerStaticPageShell
        store={store}
        title="服務條款"
        description="在本站購買 eSIM 或使用會員功能前，請詳閱以下條款。"
        breadcrumbs={[{ label: "服務條款" }]}
      >
        <div className="flex flex-col gap-6">
          <LegalSection title="一、適用範圍">
            <p>
              本頁說明 <strong>{brand}</strong>（以下簡稱「本賣場」）所提供之 eSIM
              方案展示、文章內容與導購服務。實際交易、付款、出貨與退款流程，由
              JEKO eSIM 平台（以下簡稱「平台」）依其服務條款辦理。
            </p>
            <p>
              完整平台條款請參閱{" "}
              <Link href="/terms/" className="text-[#1a56db] underline">
                JEKO 服務條款
              </Link>
              。
            </p>
          </LegalSection>

          <LegalSection title="二、商品與價格">
            <ul>
              <li>
                本賣場展示之 eSIM 方案、售價與庫存，以結帳頁面當下顯示為準。
              </li>
              <li>
                eSIM 為數位商品，付款成功後將提供 QR Code 或啟用資訊，恕無實體 SIM
                卡寄送。
              </li>
              <li>
                下單前請自行確認裝置支援 eSIM 且已解除電信鎖；詳見{" "}
                <Link href={paths.contact} className="text-[#1a56db] underline">
                  聯絡我們
                </Link>{" "}
                或平台客服。
              </li>
            </ul>
          </LegalSection>

          <LegalSection title="三、文章與內容">
            <p>
              本賣場旅遊文章僅供參考，可能包含第三方資訊或夥伴供稿；內容如有更新延遲，請以官方或商品頁最新說明為準。
            </p>
          </LegalSection>

          <LegalSection title="四、退款與售後">
            <p>
              退款、換貨與連線問題排查，依 JEKO 平台{" "}
              <Link href="/refund-policy/" className="text-[#1a56db] underline">
                退款政策
              </Link>{" "}
              及客服流程辦理。如有訂單問題，請備妥訂單編號聯繫客服。
            </p>
          </LegalSection>

          <LegalSection title="五、聯絡方式">
            <p>
              本賣場相關問題，請至{" "}
              <Link href={paths.contact} className="text-[#1a56db] underline">
                聯絡我們
              </Link>
              ；平台服務問題亦可使用 JEKO 官方客服管道。
            </p>
          </LegalSection>
        </div>
      </PartnerStaticPageShell>
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  return loadPartnerStorePageProps(context.params?.partnerSlug);
}
