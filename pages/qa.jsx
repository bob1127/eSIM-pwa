import Link from "next/link";
import LegalPageLayout, {
  LegalSection,
} from "@/components/legal/LegalPageLayout";
import { SITE_FAQ_CATEGORIES, buildSiteFaqSchema } from "@/lib/siteFaqs";
import { CONTACT_INFO } from "@/lib/contactUi";

export default function QaPage() {
  return (
    <LegalPageLayout
      title="常見問題 FAQ"
      subtitle="依本站實際功能整理：購買結帳、電子發票、安裝連線、流量提醒、退款售後、優惠與夥伴合作。"
      lastUpdated="2026 年 8 月 27 日"
      seo={{
        title: "常見問題 FAQ｜eSIM 購買・安裝・流量提醒・電子發票｜Jeko eSIM",
        description:
          "Jeko eSIM 常見問題：電子發票、購買與開通、原生／漫遊退款、流量查詢與推播／LINE 提醒、新會員折扣、夥伴商店與客服管道。",
        keywords:
          "eSIM常見問題,電子發票,流量提醒,退款,LINE Pay,藍新,FAQ,Jeko eSIM",
        jsonLdTypes: ["FAQPage", "BreadcrumbList"],
        jsonLd: [buildSiteFaqSchema()],
      }}
      siblingLink={{ href: "/support", label: "查詢手機是否支援 eSIM" }}
    >
      <LegalSection title="快速導覽">
        <ul className="!mb-0">
          {SITE_FAQ_CATEGORIES.map((cat) => (
            <li key={cat.id}>
              <a href={`#faq-${cat.id}`} className="font-bold text-sky-700">
                {cat.title}
              </a>
              <span className="text-slate-400 text-[12px] ml-1.5">
                （{cat.items.length} 則）
              </span>
            </li>
          ))}
        </ul>
      </LegalSection>

      {SITE_FAQ_CATEGORIES.map((cat) => (
        <LegalSection key={cat.id} title={cat.title}>
          <div id={`faq-${cat.id}`} className="space-y-5 scroll-mt-24">
            {cat.items.map((item) => (
              <div key={item.question}>
                <h3 className="text-[14px] font-bold text-slate-900 mb-1.5">
                  {item.question}
                </h3>
                <p className="text-[13px] text-slate-600 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </LegalSection>
      ))}

      <LegalSection title="相關說明與連結">
        <ul>
          <li>
            電子發票與付款規範：{" "}
            <Link href="/terms">服務條款</Link>
            「付款、發票與退款」。
          </li>
          <li>
            退款／原生與漫遊差異：{" "}
            <Link href="/refund-policy">退換貨政策</Link>；線上申請見{" "}
            <Link href="/account">帳戶中心 → 我的 eSIM 訂單</Link>。
          </li>
          <li>
            流量查詢與提醒：{" "}
            <Link href="/account">帳戶中心 → 查詢流量</Link> 或{" "}
            <Link href="/data-query">流量查詢</Link>。
          </li>
          <li>
            機型是否支援 eSIM：{" "}
            <Link href="/support">客服支援・相容列表</Link>。
          </li>
          <li>
            新會員 50 元活動：{" "}
            <Link href="/promo">最新優惠</Link>。
          </li>
          <li>
            合作夥伴申請：{" "}
            <Link href="/cooperation">合作說明</Link> 或{" "}
            <Link href="/contact">聯絡我們</Link>。
          </li>
          <li>
            其他問題可透過{" "}
            <a
              href={CONTACT_INFO.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              官方 LINE
            </a>
            、客服信箱{" "}
            <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>{" "}
            洽詢。
          </li>
        </ul>
      </LegalSection>
    </LegalPageLayout>
  );
}
