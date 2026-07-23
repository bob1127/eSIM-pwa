"use client";

import Link from "next/link";
import {
  FacebookIconSvg,
  InstagramIconSvg,
  LineIconSvg,
} from "@/components/social/SocialBrandIcons";

const PAYMENT_ICONS = [
  { src: "/images/payment/visa.svg", alt: "Visa", w: 36, h: 24 },
  { src: "/images/payment/mastercard.svg", alt: "Mastercard", w: 36, h: 24 },
  { src: "/images/payment/jcb.svg", alt: "JCB", w: 36, h: 24 },
  { src: "/images/payment/applepay.svg", alt: "Apple Pay", w: 42, h: 24 },
  { src: "/images/payment/line.svg", alt: "LINE Pay", w: 28, h: 24 },
  { src: "/images/payment/atm.svg", alt: "ATM 轉帳", w: 42, h: 28 },
  { src: "/images/payment/cvs.svg", alt: "超商代碼繳費", w: 42, h: 28 },
];

function PartnerSocialIcons({ store, size = "sm" }) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconClass = "w-[17px] h-[17px]";
  const items = [
    {
      key: "instagram",
      label: "Instagram",
      href: store?.social_instagram?.trim(),
      className:
        "bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white",
      icon: <InstagramIconSvg className={iconClass} />,
    },
    {
      key: "facebook",
      label: "Facebook",
      href: store?.social_facebook?.trim(),
      className: "bg-[#1877F2] text-white",
      icon: <FacebookIconSvg className={iconClass} />,
    },
    {
      key: "line",
      label: "LINE",
      href: store?.social_line?.trim(),
      className: "bg-[#00C300] text-white",
      icon: <LineIconSvg className={iconClass} />,
    },
  ].filter((item) => item.href);

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5">
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label}
          title={item.label}
          className="rounded-full transition-opacity hover:opacity-85 active:scale-95"
        >
          <span
            className={`${dim} rounded-full inline-flex items-center justify-center shrink-0 ${item.className}`}
          >
            {item.icon}
          </span>
        </a>
      ))}
    </div>
  );
}

/**
 * 夥伴賣場 Footer：無主站導覽列／三欄連結；資訊來自 stores 後台欄位。
 */
export default function PartnerFooter({ store } = {}) {
  const homeHref = store?.domain ? `/p/${store.domain}/` : "/";
  const companyName =
    store?.footer_company_name?.trim() || store?.store_name || "Jeko eSIM";
  const address = store?.footer_address?.trim() || "";
  const addressNote = store?.footer_address_note?.trim() || "";
  const taxId = store?.footer_tax_id?.trim() || "";
  const email = store?.footer_email?.trim() || "";
  const phone = store?.footer_phone?.trim() || "";
  const copyright =
    store?.footer_copyright?.trim() ||
    `© ${new Date().getFullYear()} ${companyName}. All Rights Reserved.`;
  const logoSrc = store?.logo_url?.trim() || "/images/Logo/logo-no-bg.png";

  const mapsHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
  const taxHref = taxId
    ? `https://www.google.com/search?q=${encodeURIComponent(`統一編號 ${taxId}`)}`
    : null;
  const mailtoHref = email ? `mailto:${email}` : null;
  const telHref = phone
    ? `tel:${phone.replace(/[^\d+]/g, "")}`
    : null;

  const linkClass =
    "text-gray-500 hover:text-[#0A6CD0] hover:underline underline-offset-2 transition-colors";

  return (
    <footer className="block bg-white text-gray-800 border-t relative z-[99] border-gray-200">
      <div className="lg:max-w-[1300px] w-full md:w-[90%] 2xl:max-w-[1500px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="flex items-start gap-3 md:max-w-[360px]">
            <Link
              href={homeHref}
              className="inline-block select-none shrink-0 mt-0.5"
              aria-label={`${companyName} 首頁`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={companyName}
                width={48}
                height={48}
                className="object-contain h-10 w-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            </Link>
            <div className="text-[11px] text-gray-500 leading-relaxed font-medium">
              <p className="text-gray-900 font-bold mb-1 text-[12px]">
                {companyName}
              </p>
              {address ? (
                <p>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    title="在 Google 地圖開啟"
                  >
                    {address}
                  </a>
                </p>
              ) : null}
              {addressNote ? <p>{addressNote}</p> : null}
              {taxId ? (
                <b className="block">
                  <a
                    href={taxHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} font-bold text-gray-700`}
                    title="營業稅稅籍查詢"
                  >
                    {taxId}
                  </a>
                </b>
              ) : null}
              {email ? (
                <p>
                  客服信箱：
                  <a href={mailtoHref} className={linkClass}>
                    {email}
                  </a>
                </p>
              ) : null}
              {phone ? (
                <p>
                  客服電話：
                  <a href={telHref} className={linkClass}>
                    {phone}
                  </a>
                </p>
              ) : null}
              {!address && !email && !phone && !taxId ? (
                <p className="text-gray-400">
                  請至夥伴後台「商店設定」填寫 Footer 資訊
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mx-auto md:mx-0">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PAYMENT_ICONS.map((icon) => (
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

          <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
                />
              </svg>
            </button>
            <a
              href="https://www.jeek-webdesign.com.tw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gray-400 hover:text-stone-800 duration-300"
            >
              Design by 極客網頁設計
            </a>
            <PartnerSocialIcons store={store} />
            <p className="text-[11px] text-gray-400">{copyright}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
