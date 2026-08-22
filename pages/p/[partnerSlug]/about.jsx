import Link from "next/link";
import PartnerShopLayout from "@/components/Shop/PartnerShopLayout";
import PartnerStaticPageShell from "@/components/Shop/PartnerStaticPageShell";
import { loadPartnerStorePageProps, partnerPagePaths } from "@/lib/partnerStorePages";

export default function PartnerAboutPage({ store, navCountries }) {
  const paths = partnerPagePaths(store?.domain);
  const brand = store?.store_name || "夥伴商店";
  const description =
    store?.description ||
    `${brand} 是 JEKO eSIM 授權合作夥伴，提供精選出國 eSIM 方案與旅遊實用內容。`;

  return (
    <PartnerShopLayout
      store={store}
      title={`關於我們｜${brand}`}
      description={description}
      navCountries={navCountries}
      seo={{ path: "about" }}
    >
      <PartnerStaticPageShell
        store={store}
        title="關於我們"
        description={description}
        breadcrumbs={[{ label: "關於我們" }]}
      >
        <div className="space-y-6 text-[15px] text-slate-700 leading-[1.9]">
          {store?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.logo_url}
              alt={brand}
              className="w-20 h-20 rounded-full object-cover border border-slate-200"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <p>
            歡迎來到 <strong>{brand}</strong>。我們與 JEKO eSIM
            平台合作，為旅人整理各國 eSIM 方案，讓您出發前即可線上購買、掃描 QR
            Code 啟用，落地就能上網。
          </p>
          <p>
            本站商品由平台統一金流與出貨流程保障；您在此看到的售價、方案說明與旅遊文章，皆由
            {brand} 維護更新。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={paths.plans}
              className="inline-flex items-center justify-center bg-[#1E4AD1] text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-[#1639a8] transition"
            >
              查看 eSIM 方案
            </Link>
            <Link
              href={paths.blog}
              className="inline-flex items-center justify-center border border-slate-200 text-slate-800 text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-slate-50 transition"
            >
              閱讀旅遊文章
            </Link>
          </div>
        </div>
      </PartnerStaticPageShell>
    </PartnerShopLayout>
  );
}

export async function getServerSideProps(context) {
  return loadPartnerStorePageProps(context.params?.partnerSlug);
}
