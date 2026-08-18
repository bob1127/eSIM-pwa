import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BrandSocialIconLinks } from "@/components/social/SocialBrandIcons";
import { SUPPORT_EMAIL, COMPANY_EMAIL, COMPANY_NAME } from "@/lib/contactUi";
import { SITE_NAV_LINKS } from "@/lib/seo.config";

/**
 * @param {{ forceShow?: boolean, hideLinkColumns?: boolean }} [props]
 * forceShow: shop 等頁面在手機也顯示完整 footer（不隱藏）
 * hideLinkColumns: 隱藏 PRODUCTS / SUPPORT / TAG 三欄（夥伴賣場用）
 */
export default function Footer({
  forceShow: _forceShow = false,
  hideLinkColumns = false,
} = {}) {
  const [shopeeComingSoon, setShopeeComingSoon] = useState(false);

  return (
    <footer
      className={`block bg-white text-gray-800 border-t relative border-gray-200 pb-24 md:pb-0 ${
        shopeeComingSoon ? "z-[10050]" : "z-[99]"
      }`}
    >
      <div className=" lg:max-w-[1300px] w-full md:w-[90%] 2xl:max-w-[1500px] mx-auto px-6 py-12">
        {/* ================= 上半部：Logo、橫向選單、社群圖示 ================= */}
        <div
          className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pb-10 ${
            hideLinkColumns ? "" : "border-b border-gray-200"
          }`}
        >
          <div className="flex flex-col gap-6">
            {/* Logo */}
            <Link href="/" className="inline-block select-none" aria-label="Jeko eSIM 首頁">
              <span className="text-[42px] md:text-[48px] font-black tracking-tight text-[#0A6CD0] leading-none">
                JEKO
              </span>
            </Link>

            {/* 頂部橫向選單 */}
            <nav
              className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-medium text-gray-600"
              aria-label="網站導覽"
            >
              {SITE_NAV_LINKS.map((item) =>
                item.path === "/shopee-qrcode" ? (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setShopeeComingSoon(true)}
                    className="hover:text-gray-900 transition-colors text-left"
                  >
                    {item.name}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {item.name}
                  </Link>
                ),
              )}
            </nav>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[12px] font-medium text-gray-600">
              <Link
                href="/about"
                className="hover:text-gray-900 transition-colors"
              >
                關於我們
              </Link>
              <Link
                href="/contact"
                className="hover:text-gray-900 transition-colors"
              >
                聯絡客服
              </Link>
              <Link
                href="/terms"
                className="hover:text-gray-900 transition-colors"
              >
                服務條款
              </Link>
              <Link
                href="/privacy"
                className="hover:text-gray-900 transition-colors"
              >
                隱私權政策
              </Link>
              <Link
                href="/refund-policy"
                className="hover:text-gray-900 transition-colors"
              >
                退換貨政策
              </Link>
              <Link
                href="/partner/login"
                className="hover:text-[#0A6CD0] transition-colors font-bold text-gray-700"
              >
                合作夥伴後台
              </Link>
            </nav>
          </div>

          {/* 社群圖示 */}
          <BrandSocialIconLinks size="sm" />
        </div>

        {/* ================= 下半部：三欄式資訊區塊 ================= */}
        {!hideLinkColumns && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12 pb-10">
            {/* 第一欄：產品/方案 */}
            <div>
              <h3 className="text-xl font-bold tracking-widest text-gray-900 uppercase">
                PRODUCTS
              </h3>
              <span className="text-[11px] font-bold text-gray-900 block mt-1 mb-5">
                探索方案
              </span>
              <ul className="flex flex-col gap-3">
                <li>
                  <Link
                    href="/product"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    所有 eSIM 方案
                  </Link>
                </li>
                <li>
                  <Link
                    href="/shop"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Jeko 商城
                  </Link>
                </li>
                <li>
                  <Link
                    href="/product/japan"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    日本原生 eSIM
                  </Link>
                </li>
                <li>
                  <Link
                    href="/product/korea"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    韓國高速 eSIM
                  </Link>
                </li>
                <li>
                  <Link
                    href="/product/china"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    中國 eSIM
                  </Link>
                </li>
                <li>
                  <Link
                    href="/product/thailand"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    亞洲多國共用
                  </Link>
                </li>
              </ul>
            </div>

            {/* 第二欄：支援/教學 (雙欄排列) */}
            <div>
              <h3 className="text-xl font-bold tracking-widest text-gray-900 uppercase">
                SUPPORT
              </h3>
              <span className="text-[11px] font-bold text-gray-900 block mt-1 mb-5">
                客戶服務
              </span>
              <ul className="grid grid-cols-2 gap-y-3 gap-x-4">
                <li>
                  <Link
                    href="/operation-ios"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    安裝教學
                  </Link>
                </li>
                <li>
                  <Link
                    href="/qa"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    常見問題
                  </Link>
                </li>
                <li>
                  <Link
                    href="/data-query"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    查詢數據用量
                  </Link>
                </li>
                <li>
                  <Link
                    href="/support"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    支援裝置列表
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShopeeComingSoon(true)}
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    蝦皮快速兌換
                  </button>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    聯絡我們
                  </Link>
                </li>
                <li>
                  <Link
                    href="/missions"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    任務牆
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register-distributor?mode=referral"
                    className="text-[13px] text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    成為合作夥伴
                  </Link>
                </li>
                <li>
                  <Link
                    href="/partner/login"
                    className="text-[13px] font-bold text-[#0A6CD0] hover:text-[#0859ad] transition-colors"
                  >
                    合作夥伴後台
                  </Link>
                </li>
              </ul>
            </div>

            {/* 第三欄：熱門標籤 */}
            <div>
              <h3 className="text-xl font-bold tracking-widest text-gray-900 uppercase">
                TAG
              </h3>
              <span className="text-[11px] font-bold text-gray-900 block mt-1 mb-5">
                熱門關鍵字
              </span>
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <Link
                  href="/product/japan"
                  className="text-[13px] text-gray-600 hover:text-gray-900"
                >
                  <span className="text-sky-500 mr-0.5">#</span>日本eSIM
                </Link>
                <Link
                  href="/product?tags=不降速吃到飽"
                  className="text-[13px] text-gray-600 hover:text-gray-900"
                >
                  <span className="text-sky-500 mr-0.5">#</span>不降速吃到飽
                </Link>
                <Link
                  href="/product/korea"
                  className="text-[13px] text-gray-600 hover:text-gray-900"
                >
                  <span className="text-sky-500 mr-0.5">#</span>韓國原生eSIM
                </Link>
                <Link
                  href="/product"
                  className="text-[13px] text-gray-600 hover:text-gray-900"
                >
                  <span className="text-sky-500 mr-0.5">#</span>免換卡
                </Link>
                <Link
                  href="/product/japan"
                  className="text-[13px] text-gray-600 hover:text-gray-900"
                >
                  <span className="text-sky-500 mr-0.5">#</span>原生線路
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ================= 底部：公司資訊、付款方式、版權 ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end pt-8 border-t border-gray-200 gap-8">
          {/* 左側：Logo + 公司資訊 */}
          <div className="flex items-start gap-3 md:max-w-[340px]">
            <Link
              href="/"
              className="inline-block select-none shrink-0 mt-0.5"
              aria-label="Jeko eSIM 首頁"
            >
              <Image
                src="/images/Logo/logo-no-bg.png"
                alt=""
                width={48}
                height={48}
                className="object-contain h-10 w-10"
              />
            </Link>
            <div className="text-[11px] text-gray-600 leading-relaxed font-medium">
              <p className="text-gray-900 font-bold mb-1 text-[12px]">
                {COMPANY_NAME}
              </p>
              <p>臺中市北屯區平安里文心路四段750 號地下室之一</p>
              <p>(僅提供收取信件及包裹服務)</p>
              <b>60982396</b>
              <p>
                Jeko 客服：
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-[#0A6CD0] underline-offset-2 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                公司信箱：
                <a
                  href={`mailto:${COMPANY_EMAIL}`}
                  className="hover:text-[#0A6CD0] underline-offset-2 hover:underline"
                >
                  {COMPANY_EMAIL}
                </a>
              </p>
              <p>客服電話：0939-767-977</p>
            </div>
          </div>

          {/* 中間：藍新付款方式圖標 */}
          <div className="flex flex-col items-center gap-2 mx-auto md:mx-0">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { src: "/images/payment/visa.svg", alt: "Visa", w: 36, h: 24 },
                {
                  src: "/images/payment/mastercard.svg",
                  alt: "Mastercard",
                  w: 36,
                  h: 24,
                },
                { src: "/images/payment/jcb.svg", alt: "JCB", w: 36, h: 24 },
                {
                  src: "/images/payment/applepay.svg",
                  alt: "Apple Pay",
                  w: 42,
                  h: 24,
                },
                {
                  src: "/images/payment/line.svg",
                  alt: "LINE Pay",
                  w: 28,
                  h: 24,
                },
                {
                  src: "/images/payment/atm.svg",
                  alt: "ATM 轉帳",
                  w: 42,
                  h: 28,
                },
                {
                  src: "/images/payment/cvs.svg",
                  alt: "超商代碼繳費",
                  w: 42,
                  h: 28,
                },
              ].map((icon) => (
                <span
                  key={icon.alt}
                  className="inline-flex items-center justify-center h-7 px-1.5 rounded border border-gray-200 bg-white"
                  title={icon.alt}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icon.src}
                    alt={icon.alt}
                    width={icon.w}
                    height={icon.h}
                    className="object-contain max-h-5 w-auto"
                  />
                </span>
              ))}
            </div>
          </div>

          {/* 右側：版權與回到頂部 */}
          <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="回到頁面頂端"
              className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5 hover:text-sky-500 transition-colors"
            >
              PAGE TOP
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 15l7-7 7 7"
                ></path>
              </svg>
            </button>
            <a
              href="https://www.jeek-webdesign.com.tw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px]  mb-0 text-gray-600 hover:text-stone-800 duration-300"
            >
              Design by 極客網頁設計
            </a>
            <p className="text-[11px] text-gray-600">
              © 2025 Jeko Inc. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>

      {shopeeComingSoon ? (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-5"
          onClick={() => setShopeeComingSoon(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black text-slate-900 mb-2">
              蝦皮快速兌換
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              即將上線，敬請期待！
            </p>
            <button
              type="button"
              onClick={() => setShopeeComingSoon(false)}
              className="w-full h-11 rounded-full bg-[#0A6CD0] text-white text-sm font-bold hover:bg-[#0859ad] transition"
            >
              知道了
            </button>
          </div>
        </div>
      ) : null}
    </footer>
  );
}
