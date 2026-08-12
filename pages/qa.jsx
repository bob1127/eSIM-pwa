import Link from "next/link";
import LegalPageLayout, {
  LegalSection,
} from "@/components/legal/LegalPageLayout";
import { SITE_FAQS, buildSiteFaqSchema } from "@/lib/siteFaqs";
import { CONTACT_INFO } from "@/lib/contactUi";

export default function QaPage() {
  return (
    <LegalPageLayout
      title="常見問題 FAQ"
      subtitle="eSIM 購買、安裝、電子發票、優惠與流量查詢等常見問題，一次看懂。"
      lastUpdated="2026 年 8 月 11 日"
      seo={{
        title: "常見問題 FAQ｜eSIM 購買・安裝・電子發票｜Jeko eSIM",
        description:
          "Jeko eSIM 常見問題：是否支援電子發票、如何購買與開通 eSIM、支援機型、流量查詢、新會員折扣與退款說明。",
        keywords:
          "eSIM常見問題,電子發票,FAQ,Jeko eSIM開立發票,出國上網疑問",
        jsonLdTypes: ["FAQPage", "BreadcrumbList"],
        jsonLd: [buildSiteFaqSchema()],
      }}
      siblingLink={{ href: "/support", label: "查詢手機是否支援 eSIM" }}
    >
      <LegalSection title="常見問答">
        <div className="space-y-5">
          {SITE_FAQS.map((item) => (
            <div key={item.question}>
              <h3 className="text-[14px] font-black text-slate-900 mb-1.5">
                {item.question}
              </h3>
              <p className="text-[13px] text-slate-600 leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="相關說明">
        <ul>
          <li>
            電子發票與付款規範：請見{" "}
            <Link href="/terms">服務條款</Link>「付款、發票與退款」。
          </li>
          <li>
            退款時發票折讓／作廢：請見{" "}
            <Link href="/refund-policy">退換貨政策</Link>。
          </li>
          <li>
            新會員 50 元活動規則：請見 <Link href="/promo">最新優惠</Link>。
          </li>
          <li>
            其他問題可透過{" "}
            <a
              href={CONTACT_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              官方 LINE
            </a>{" "}
            或客服信箱洽詢。
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
