import Link from "next/link";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerStaticPageShell from "@/components/Shop/PartnerStaticPageShell";
import PartnerSocialIcons from "@/components/Shop/PartnerSocialIcons";
import { CONTACT_INFO } from "@/lib/contactUi";
import { loadPartnerStorePageProps, partnerPagePaths } from "@/lib/partnerStorePages";

export default function PartnerContactPage({ store, navCountries }) {
  const paths = partnerPagePaths(store?.domain);
  const brand = store?.store_name || "夥伴商店";
  const email = store?.footer_email?.trim() || "";
  const phone = store?.footer_phone?.trim() || "";
  const address = store?.footer_address?.trim() || "";
  const company =
    store?.footer_company_name?.trim() || store?.store_name || brand;

  return (
    <PartnerShopLayout
      store={store}
      title={`聯絡我們｜${brand}`}
      description={`聯絡 ${brand} 或 JEKO eSIM 客服，eSIM 購買與售後諮詢。`}
      navCountries={navCountries}
      seo={{ path: "contact" }}
    >
      <PartnerStaticPageShell
        store={store}
        title="聯絡我們"
        description="eSIM 購買、方案諮詢或售後問題，歡迎透過以下方式與我們聯繫。"
        breadcrumbs={[{ label: "聯絡我們" }]}
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">{company}</h2>
            {address ? (
              <p className="text-[14px] text-slate-600 leading-relaxed">
                地址：{address}
              </p>
            ) : null}
            {email ? (
              <p className="text-[14px] text-slate-600">
                客服信箱：
                <a
                  href={`mailto:${email}`}
                  className="ml-1 font-semibold text-[#0A6CD0] hover:underline"
                >
                  {email}
                </a>
              </p>
            ) : null}
            {phone ? (
              <p className="text-[14px] text-slate-600">
                客服電話：
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="ml-1 font-semibold text-[#0A6CD0] hover:underline"
                >
                  {phone}
                </a>
              </p>
            ) : null}
            {!email && !phone && !address ? (
              <p className="text-[14px] text-slate-500">
                本賣場尚未填寫聯絡資訊，請使用下方 JEKO 官方客服。
              </p>
            ) : null}
            <PartnerSocialIcons store={store} size="md" showLabels />
          </div>

          <div className="rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">JEKO 平台客服</h2>
            <p className="text-[14px] text-slate-600 leading-relaxed">
              訂單、退款、eSIM 啟用等問題，亦可聯絡 JEKO 官方客服（1～3
              個工作天內回覆）。
            </p>
            <div className="flex flex-wrap gap-3 text-sm font-bold">
              <a
                href={`mailto:${CONTACT_INFO.email}`}
                className="text-[#0A6CD0] hover:underline"
              >
                {CONTACT_INFO.email}
              </a>
              <Link href="/contact/" className="text-[#0A6CD0] hover:underline">
                前往 JEKO 聯絡表單 →
              </Link>
            </div>
          </div>

          <Link
            href={paths.plans}
            className="inline-flex text-sm font-bold text-slate-800 border-b-2 border-slate-800 pb-1 hover:text-[#0A6CD0] hover:border-[#0A6CD0] transition-colors"
          >
            ← 返回選購方案
          </Link>
        </div>
      </PartnerStaticPageShell>
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  return loadPartnerStorePageProps(context.params?.partnerSlug);
}
