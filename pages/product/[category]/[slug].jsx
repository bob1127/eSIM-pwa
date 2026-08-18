"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "../../../components/context/CartContext";
import Layout from "../../Layout";
import PartnerShopLayout from "../../../components/Shop/PartnerShopLayout";
import { buildProductSeo, resolveProductCategoryBreadcrumbLabel, absoluteUrl } from "../../../lib/seo.config";
import {
  resolveOverviewNotices,
  parseOverviewNoticesByCarrier,
} from "../../../lib/productOverviewNotices";
import { useProductAdmin } from "../../../hooks/useProductAdmin";
import ProductReviewsSection from "../../../components/product/ProductReviewsSection";
import ProductRatingBadge from "../../../components/product/ProductRatingBadge";
import ProductPromoOfferBanner from "../../../components/product/ProductPromoOfferBanner";
import NetworkCoverageSection from "../../../components/product/NetworkCoverageSection";
import { resolveCoverageCountry } from "../../../lib/networkCoverageCountries";
import CoveragePromptModal, {
  hasCoverageAck,
  markCoverageAck,
} from "../../../components/product/CoveragePromptModal";
import IijApnReminderModal, {
  isIijDocomoTelecom,
} from "../../../components/product/IijApnReminderModal";
import AuKddiApnReminderModal, {
  needsAuKddiManualApnReminder,
} from "../../../components/product/AuKddiApnReminderModal";
import SoftBankApnReminderModal, {
  isSoftBankManualApnTelecom,
} from "../../../components/product/SoftBankApnReminderModal";
import DataExhaustReminderModal, {
  isDataExhaustTerminateVariant,
} from "../../../components/product/DataExhaustReminderModal";
import MaterialIcon from "../../../components/MaterialIcon";
import MediaGalleryLightbox from "../../../components/MediaGalleryLightbox";
import {
  resolveDetailedContent,
  parseDetailedContentByCarrier,
} from "../../../lib/productDetailedContent";
import {
  resolveUsageContent,
  parseUsageContentByCarrier,
} from "../../../lib/productUsageContent";
import {
  resolveFaqContent,
  parseFaqContentByCarrier,
} from "../../../lib/productFaqContent";
import { parsePromoOfferByCarrier } from "../../../lib/productPromoOffer";
import { PENDING_COUPON_KEY } from "../../../lib/partnerReferralDiscount";
import {
  normalizeCarrierHtml,
  hasBlockLevelCarrierHtml,
} from "../../../lib/normalizeCarrierHtml";
import { CARRIER_HTML_SANITIZE } from "../../../lib/carrierHtmlSanitize";
import {
  resolveMedusaImageUrl,
  resolveMedusaImageUrls,
  buildProductMediaList,
  shouldBypassImageOptimization,
} from "../../../lib/resolveMedusaImageUrl";
import {
  US_ESIM_DEFAULT_IMAGE,
  isUsEsimProduct,
  withUsEsimDefaultImage,
} from "../../../lib/usEsimDefaultImage";
import EsimRefundDisclosure from "../../../components/legal/EsimRefundDisclosure";
import Image from "next/image";
import SafeImage from "../../../components/SafeImage";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { motion, AnimatePresence } from "framer-motion";
import "swiper/css";
import "swiper/css/navigation";
import dynamic from "next/dynamic";
import DOMPurify from "isomorphic-dompurify";
import "react-quill/dist/quill.snow.css";
import {
  buildProductRichTextHtml,
  sanitizeProductRichTextHtml,
  PRODUCT_RICH_LINK_CLASS,
} from "../../../lib/productRichText";
import {
  parseKeyFeaturesByCarrier,
  resolveIntroBullets,
  resolveActualExperience,
  stripEuPackCopy,
} from "../../../lib/productKeyFeatures";
import {
  parseSubtitleByCarrier,
  stripInternalMarginFromSubtitle,
} from "../../../lib/productSubtitleByCarrier";
import {
  SpeedScenarioProvider,
  SpeedInfoChip,
  SpeedAwareText,
  useSpeedScenario,
  wrapSpeedMentionsInHtml,
  handleSpeedHtmlClick,
} from "../../../components/product/SpeedScenarioPopup";
import { resolveSpeedScenarioId } from "../../../lib/speedScenarioInfo";
import {
  parseCarrierSpecsByCarrier,
  resolveCarrierSpecs,
  buildCarrierSpecDisplayItems,
} from "../../../lib/productCarrierSpecs";
import {
  parseHotSaleTelecoms,
  isHotSaleTelecom,
} from "../../../lib/productHotSale";
import {
  resolveProductOptionQuery,
  sanitizeProductQueryForUrl,
  buildProductOptionQuery,
} from "../../../lib/telecomQueryAlias";
import DataEstimatorModal, {
  getEstimatorDestinationLabel,
  compareDataAmountsAsc,
} from "@/components/DataEstimatorModal";
import {
  is5MbpsDataAmount,
  formatDataAmountMain,
  getVariationOptionAttrs,
} from "@/lib/dataAmountLabel";
import { buildLoginUrl } from "@/lib/authRedirect";
import { fetchMedusaRegions } from "@/lib/medusaStoreApi";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

function ProductMediaSlide({
  item,
  fill = false,
  className = "",
  priority = false,
}) {
  if (item.type === "video") {
    return (
      <video
        src={item.src}
        controls
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }

  if (fill) {
    return (
      <SafeImage
        src={item.src}
        alt={item.alt || "商品圖片"}
        fill
        sizes="(max-width: 1024px) 100vw, 55vw"
        className={className}
        priority={priority}
        unoptimized={shouldBypassImageOptimization(item.src)}
      />
    );
  }

  return (
    <SafeImage
      src={item.src}
      alt={item.alt || "商品圖片"}
      width={1200}
      height={1200}
      sizes="(max-width: 1024px) 100vw, 55vw"
      className={className}
      priority={priority}
      unoptimized={shouldBypassImageOptimization(item.src)}
    />
  );
}

/** 流量試算 CTA：參考圖深藍 + 金黃配色（手機版只顯示主標） */
function DataEstimatorCta({ onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-4 w-full text-left rounded-full border border-[#2556b8] bg-[#2d62cc] px-5 py-3 sm:px-6 sm:py-4 shadow-sm hover:bg-[#2556b8] transition-colors group ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-[15px] font-bold text-[#f1d13d] leading-snug flex items-center gap-1.5">
            <MaterialIcon
              name="calculate"
              size={18}
              className="text-[#f1d13d] shrink-0 hidden sm:inline-flex"
            />
            還不確定流量嗎？
          </p>
          <p className="hidden sm:block text-xs text-white/85 mt-1 leading-relaxed">
            依每日使用習慣估算建議方案，一鍵套用或比較同地區 eSIM。
          </p>
        </div>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#f1d13d] group-hover:brightness-110">
          開啟試算
          <MaterialIcon
            name="arrow_forward"
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </button>
  );
}

// ==========================================
// 1. 靜態資料設定
// ==========================================
const COMPATIBLE_DEVICES = [
  {
    category: "支援 eSIM 的蘋果 iPhone",
    items: [
      "iPhone 16 / 16 Plus / 16 Pro / 16 Pro Max",
      "iPhone 15 / 15 Plus / 15 Pro / 15 Pro Max",
      "iPhone 14 / 14 Plus / 14 Pro / 14 Pro Max",
      "iPhone 13 / 13 Mini / 13 Pro / 13 Pro Max",
      "iPhone 12 / 12 Mini / 12 Pro / 12 Pro Max",
      "iPhone 11 / 11 Pro / 11 Pro Max",
      "iPhone XS / XS Max / XR",
      "iPhone SE (2020 / 2022)",
    ],
  },
  {
    category: "相容 eSIM 的 iPad (Wi-Fi + 行動網路)",
    items: [
      "iPad Pro 13 吋 (M4)",
      "iPad Pro 11 吋 (第一代至第四代)",
      "iPad Pro 12.9 吋 (第三代至第六代)",
      "iPad Air (第三代至第六代)",
      "iPad Mini (第五代、第六代)",
      "iPad (第七代至第十代)",
    ],
  },
  {
    category: "Google Pixel 支援 eSIM 的手機",
    items: [
      "Pixel 9 / 9 Pro / 9 Pro XL / 9 Pro Fold",
      "Pixel 8 / 8 Pro / 8a",
      "Pixel 7 / 7 Pro / 7a",
      "Pixel 6 / 6 Pro / 6a",
      "Pixel 5 / 5a",
      "Pixel 4 / 4a / 4 XL",
    ],
  },
  {
    category: "具備 eSIM 功能的三星手機",
    items: [
      "Galaxy S24 / S24+ / S24 Ultra",
      "Galaxy S23 / S23+ / S23 Ultra",
      "Galaxy S22 / S22+ / S22 Ultra",
      "Galaxy S21 / S21+ / S21 Ultra",
      "Galaxy S20 / S20+ / S20 Ultra",
      "Galaxy Z Flip (全系列)",
      "Galaxy Z Fold (全系列)",
    ],
  },
  {
    category: "其他支援 eSIM 的手機裝置",
    items: [
      "Sony Xperia 1 IV / 5 IV / 10 IV",
      "Sony Xperia 1 V / 5 V / 10 V",
      "Sharp Aquos Sense 4 lite / Sense 6",
      "Oppo Find X3 Pro / X5 / X5 Pro",
      "Xiaomi 12T Pro / 13 / 13 Pro",
    ],
  },
];

const CARRIER_INFO_MAP = {
  SoftBank: {
    badges: [
      { text: "SoftBank", type: "5G" },
      { text: "日本", type: "IP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 128 kbps，隔日重置。",
      note: "注意：此為漫遊 eSIM，出網為日本 IP。大部分 Android 手機通常需另外手動設定 APN（plus.4g）；iPhone 多半會自動設定。",
    },
    summaryPrefix: "SoftBank",
  },
  "SoftBank（注意：Android 通常需手動 APN）": {
    badges: [
      { text: "SoftBank", type: "5G" },
      { text: "日本", type: "IP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 128 kbps，隔日重置。",
      note: "注意：此為漫遊 eSIM，出網為日本 IP。大部分 Android 手機通常需另外手動設定 APN（plus.4g）；iPhone 多半會自動設定。",
    },
    summaryPrefix: "SoftBank",
  },
  "SoftBank / KDDI": {
    badges: [
      { text: "KDDI", type: "5G" },
      { text: "SoftBank", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 128 kbps，隔日重置。雙網自動切換（KDDI／SoftBank）。",
      note: "注意：此線路為新加坡 IP 漫遊；建議抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "SoftBank / KDDI",
  },
  "KDDI / SoftBank / Docomo +": {
    badges: [
      { text: "KDDI", type: "5G" },
      { text: "SoftBank", type: "5G" },
      { text: "Docomo", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 128 kbps，隔日重置。三網自動切換（KDDI／SoftBank／Docomo）。",
      note: "注意：此線路為香港 IP 漫遊；APN mobile.three.com.hk 自動設定。建議抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "KDDI / SoftBank / Docomo +",
  },
  "SoftBank / KDDI 10Mbps": {
    badges: [
      { text: "KDDI", type: "5G" },
      { text: "SoftBank", type: "5G" },
      { text: "10Mbps", type: "FUP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日 1 GB 高速數據流量，用完後可享 10 Mbps 無限流量",
      note: "注意：我們建議您抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "SoftBank / KDDI 10Mbps",
  },
  "AU(KDDI)": {
    badges: [{ text: "AU (KDDI)", type: "5G" }],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "高速數據吃到飽，實際速度取決於位置及網路環境（真・不限速）。",
      note: "注意：此線路為日本原生 IP；部分方案需手動設定 APN。建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "AU(KDDI)",
  },
  "AU(KDDI) 高速數據": {
    badges: [
      { text: "AU (KDDI)", type: "5G" },
      { text: "高速", type: "FUP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "高速數據吃到飽，實際速度取決於位置及網路環境（真・不限速）。",
      note: "注意：此線路為日本原生 IP；部分方案需手動設定 APN。建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "AU(KDDI) 高速數據",
  },
  "AU(KDDI) 10Mbps": {
    badges: [
      { text: "AU (KDDI)", type: "5G" },
      { text: "10Mbps", type: "FUP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "限速約 10 Mbps 吃到飽，實際速度依位置與網路環境變動。",
      note: "注意：此線路為日本原生 IP（AU/KDDI）。建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "AU(KDDI) 10Mbps",
  },
  "AU KDDI 10Mbps": {
    badges: [
      { text: "AU (KDDI)", type: "5G" },
      { text: "10Mbps", type: "FUP" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "限速約 10 Mbps 吃到飽，實際速度依位置與網路環境變動。",
      note: "注意：此線路為日本原生 IP（AU/KDDI）。建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "AU KDDI 10Mbps",
  },
  "IIJ Docomo": {
    badges: [{ text: "Docomo", type: "4G/LTE" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 200／256 kbps（依方案），隔日重置。",
      note: "注意：需手動設定 APN（vmobile.jp）。抵達日本後連上網路時啟用。此線路為日本原生 IP（DOCOMO）。",
    },
    summaryPrefix: "IIJ Docomo",
  },
  "IIJ Docomo（注意：需手動設定 APN）": {
    badges: [{ text: "Docomo", type: "4G/LTE" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 200／256 kbps（依方案），隔日重置。",
      note: "注意：需手動設定 APN（vmobile.jp）。抵達日本後連上網路時啟用。此線路為日本原生 IP（DOCOMO）。",
    },
    summaryPrefix: "IIJ Docomo",
  },
  "IIJ(DOCOMO)": {
    badges: [{ text: "Docomo", type: "4G/LTE" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後降速至約 200 kbps，可持續使用。",
      note: "注意：此線路為日本 IP 原生。",
    },
    summaryPrefix: "IIJ(DOCOMO)",
  },
  /** @deprecated 總量型已改名 AU(KDDI)；保留相容舊資料 */
  KDDI: {
    badges: [{ text: "AU (KDDI)", type: "5G" }],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後降速至約 128 kbps，可持續使用。",
      note: "注意：此線路為日本 IP 原生。",
    },
    summaryPrefix: "AU(KDDI)",
  },
  "KDDI / SoftBank": {
    badges: [
      { text: "KDDI", type: "5G" },
      { text: "SoftBank", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後降速至約 128 kbps，可持續使用。",
      note: "注意：我們建議您抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "KDDI / SoftBank",
  },
  "CSL / China Telecom HK": {
    badges: [
      { text: "CSL", type: "5G" },
      { text: "China Telecom HK", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日約 1GB 高速後限速約 10 Mbps 吃到飽。",
      note: "注意：香港 IP 線路，建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "CSL / China Telecom HK",
  },
  "CSL / SmarTone（總量型）": {
    badges: [
      { text: "CSL", type: "5G" },
      { text: "SmarTone", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後降速至約 128 kbps，可持續使用。",
      note: "注意：新加坡 IP 漫遊，建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "CSL / SmarTone（總量型）",
  },
  "CSL / SmarTone（每日型）": {
    badges: [
      { text: "CSL", type: "5G" },
      { text: "SmarTone", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日高速用完後降速至約 128 kbps，可持續使用。",
      note: "注意：新加坡 IP 漫遊，建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "CSL / SmarTone（每日型）",
  },
  Vinaphone: {
    badges: [{ text: "Vinaphone", type: "5G" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "為什麼選擇 Vinaphone 本地 IP：",
      policyDesc:
        "越南本地 IP、4G/LTE/5G 高速連線；可使用 Facebook、Instagram、TikTok、LINE、WhatsApp、Zalo、Grab 等，無地區限制。",
      note: "注意：由越南本地電信商直接運營，建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "Vinaphone",
  },
  Viettel: {
    badges: [{ text: "Viettel", type: "5G" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "為何選擇 Viettel 旅遊 eSIM：",
      policyDesc:
        "越南最可靠、最廣泛的網路；4G/LTE／多數城市 5G；本地 IP 可順暢使用 Facebook、Instagram、TikTok、LINE、WhatsApp 等。",
      note: "注意：有效期於下載後立即開始，請準備好使用時再安裝 eSIM。",
    },
    summaryPrefix: "Viettel",
  },
  Wintel: {
    badges: [{ text: "Wintel", type: "4G" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後斷網。",
      note: "注意：越南原生當地 IP，建議抵達後再安裝 eSIM。",
    },
    summaryPrefix: "Wintel",
  },
  "UMobile 5G 當地": {
    badges: [{ text: "UMobile", type: "5G" }],
    marketingBox: {
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日 1GB 高速，用完後維持約 10Mbps 吃到飽。",
      note: "注意：此線路為馬來西亞 IP 原生。",
    },
    summaryPrefix: "UMobile 5G 當地",
  },
  /** @deprecated 已改名 UMobile 5G 當地 */
  "UMobile 5G": {
    badges: [{ text: "UMobile", type: "5G" }],
    marketingBox: {
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日 1GB 高速，用完後維持約 10Mbps 吃到飽。",
      note: "注意：此線路為馬來西亞 IP 原生。",
    },
    summaryPrefix: "UMobile 5G 當地",
  },
  "Maxis / Celcom / Digi": {
    badges: [
      { text: "Maxis", type: "5G" },
      { text: "Celcom", type: "5G" },
      { text: "Digi", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日 1GB 高速，用完後維持約 10Mbps 吃到飽。",
      note: "注意：我們建議您抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "Maxis / Celcom / Digi",
  },
  default: {
    badges: [],
    marketingBox: {
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
      policyTitle: "說明:",
      policyDesc: "不同電信商擁有不同的流量公平使用原則 (FUP)。",
      note: "",
    },
    summaryPrefix: "eSIM",
  },
  "Truemove H 當地號碼": {
    badges: [{ text: "TRUE", type: "5G" }],
    marketingBox: {
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "無限高速數據，實際速度取決於您的位置及網路環境。",
      note: "⚠️ 注意: eSIM新增後即開始計算使用有效期，我們建議您需要時再安裝。 查看啟用政策。\n我們建議您在抵達泰國後安裝此 eSIM。⚠️ 自泰國當地時間 2026 年 5 月 22 日起，撥出電話與發送 SMS 需完成護照實名登記。請前往 True 門店完成登記，以恢復通話功能。",
      specialNotice:
        "計費時間自安裝之日起算。免費接聽來電及接收簡訊的泰國 eSIM 卡，不得插入或安裝於非服務覆蓋區域，否則該方案將失效且無法使用。查詢數據用量請撥打：*900# 查詢電話號碼請撥打：*833# 查詢餘額請撥打：*123#",
    },
    summaryPrefix: "Truemove H 當地號碼",
  },
  "Mobifone 當地號碼": {
    badges: [
      { text: "Mobifone", type: "4G" },
      { text: "帶號碼", type: "info" },
    ],
    marketingBox: {
      bgColor: "bg-rose-50",
      borderColor: "border-rose-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速額度用完即斷網。實際速度取決於您的位置及網路環境。",
      note: "⚠️ 有效期於 eSIM 下載到裝置後立即開始計算，請準備好使用時再安裝。抵達後請撥打 900，接著按 1 啟用。",
      specialNotice:
        "查詢手機號碼：*0#；查詢流量：*090*5# 或發送簡訊 KT_ALL 至 999。通話僅限接聽、簡訊僅限接收（免費）。兌換後請於 30 天內完成啟用。",
    },
    summaryPrefix: "Mobifone 當地號碼",
  },
  "TRRE 電信": {
    badges: [{ text: "TRUE", type: "5G" }],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "10 Mbps的無限流量，實際速度可能有所變動。",
      note: "注意：我們建議您抵達泰國後再安裝 eSIM。",
    },
    summaryPrefix: "TRRE 電信",
  },
  // 舊顯示名相容（若快取／舊變體尚未重建）
  "True Dtac": {
    badges: [{ text: "TRUE", type: "5G" }],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "10 Mbps的無限流量，實際速度可能有所變動。",
      note: "注意：我們建議您抵達泰國後再安裝 eSIM。",
    },
    summaryPrefix: "TRRE 電信",
  },
  "DTAC / REAL FUTURE": {
    badges: [
      { text: "DTAC", type: "5G" },
      { text: "REAL FUTURE", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "方案總量高速用完後降速至約 128 kbps，可持續使用。實際速度取決於您的位置及網路環境。",
      note: "注意：我們建議您抵達泰國後再安裝 eSIM。",
    },
    summaryPrefix: "DTAC / REAL FUTURE",
  },
  AIS: {
    badges: [{ text: "AIS", type: "5G" }],
    marketingBox: {
      bgColor: "bg-green-50",
      borderColor: "border-green-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日／方案高速額度用完後降速至約 128 kbps，可持續使用。實際速度取決於您的位置及網路環境。",
      note: "注意：我們建議您抵達泰國後再安裝 eSIM。",
    },
    summaryPrefix: "AIS",
  },
  DTAC: {
    badges: [
      { text: "DTAC", type: "5G" },
      { text: "帶號碼", type: "info" },
    ],
    marketingBox: {
      bgColor: "bg-sky-50",
      borderColor: "border-sky-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日 5GB 高速額度用完即斷網，隔日恢復。實際速度取決於您的位置及網路環境。",
      note: "注意：建議抵達泰國後、於覆蓋範圍內再安裝／啟用 eSIM。",
    },
    summaryPrefix: "DTAC",
  },
  TRUE: {
    badges: [{ text: "TRUE", type: "5G" }],
    marketingBox: {
      bgColor: "bg-orange-50",
      borderColor: "border-orange-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "方案總量高速用完後依方案降速（約 1 Mbps 或約 384 kbps），可持續使用。",
      note: "注意：建議抵達泰國後、於覆蓋範圍內再安裝／啟用 eSIM。",
    },
    summaryPrefix: "TRUE",
  },
  "短天數｜中國電信／CSL／澳門電信": {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "澳門電信", type: "4G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "無限流量，實際速度依位置及網路環境而定。",
      note: "出網為香港 IP，一般可免 VPN 使用 LINE／IG／FB。建議抵達後再安裝。",
    },
    summaryPrefix: "短天數｜中國電信／CSL／澳門電信",
  },
  "短天數｜中國移動／香港移動／澳門電訊": {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "澳門電信", type: "4G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "無限流量，實際速度依位置及網路環境而定。",
      note: "出網為香港 IP，一般可免 VPN 使用 LINE／IG／FB。建議抵達後再安裝。",
    },
    summaryPrefix: "短天數｜中國電信／CSL／澳門電信",
  },
  "長天數｜中國電信／聯通／CSL／澳門電訊": {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信", type: "5G" },
      { text: "聯通", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "CTM", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "約 10 Mbps 的無限流量，實際速度可能有所變動。",
      note: "出網為新加坡 IP，一般可免 VPN 使用 LINE／IG／FB，並支援 TikTok。建議抵達後再安裝。",
    },
    summaryPrefix: "長天數｜中國電信／聯通／CSL／澳門電訊",
  },
  "中國電信／聯通／CSL／澳門電訊": {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信", type: "5G" },
      { text: "聯通", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "CTM", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "每日高速額度用完後降速至約 128 kbps；另有約 5Mbps 續航選項。",
      note: "出網為新加坡 IP，一般可免 VPN 使用 LINE／IG／FB，並支援 ChatGPT／TikTok／Gemini。建議抵達後再安裝。",
    },
    summaryPrefix: "中國電信／聯通／CSL／澳門電訊",
  },
  // cnhkmo-tc-esim：方案類型選項，底層同 T+C 電信
  每日型: {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信 China Telecom", type: "5G" },
      { text: "聯通 China Unicom", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "CTM 澳門電訊", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速額度用完後降速至約 128 kbps；選「5Mbps續航」則用完後約 5 Mbps。",
      note: "電信：中國電信／聯通／CSL／澳門電訊（China Telecom / China Unicom / CSL / CTM）。新加坡 IP，一般可免 VPN 用 LINE／IG／FB。",
    },
    summaryPrefix: "每日型｜中國電信／聯通／CSL／澳門電訊",
  },
  總量型: {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信 China Telecom", type: "5G" },
      { text: "聯通 China Unicom", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "CTM 澳門電訊", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "總量高速用完後降速至約 128 kbps，請預留流量緩衝。",
      note: "電信：中國電信／聯通／CSL／澳門電訊（China Telecom / China Unicom / CSL / CTM）。新加坡 IP，一般可免 VPN 用 LINE／IG／FB。",
    },
    summaryPrefix: "總量型｜中國電信／聯通／CSL／澳門電訊",
  },
  吃到飽: {
    badges: [
      { text: "免VPN", type: "info" },
      { text: "中國電信 China Telecom", type: "5G" },
      { text: "聯通 China Unicom", type: "5G" },
      { text: "CSL", type: "5G" },
      { text: "CTM 澳門電訊", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "11 天起約 10 Mbps 吃到飽；1–10 天為短天數線路（香港 IP・中國電信／CSL）。",
      note: "長天數電信：中國電信／聯通／CSL／澳門電訊（China Telecom / China Unicom / CSL / CTM）。",
    },
    summaryPrefix: "吃到飽｜中國電信／聯通／CSL／澳門電訊",
  },
};

const stripHtml = (html) =>
  html ? html.replace(/<[^>]*>?/gm, "").substring(0, 160) + "..." : "";

const FEATURE_LINK_CLASS = PRODUCT_RICH_LINK_CLASS;

/** 重點特色 / 概覽說明：粗體 **文字**、連結 [文字](網址) */
const formatFeatureBulletHtml = (text) => {
  if (!text) return "";
  const raw = buildProductRichTextHtml(text, FEATURE_LINK_CLASS);
  return sanitizeProductRichTextHtml(raw, DOMPurify.sanitize);
};

/** 雙電信／單電信 + 5G → SoftBank 風格「名稱 + 5G 小徽章」 */
function parseCarrierSpeedChips(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  const dual = s.match(
    /^(LG\s*U\+|SoftBank|KDDI|AU\s*\(?KDDI\)?)\s*\/\s*(SKT|KDDI|SoftBank)(?:\s*[45]G)?(?:\s*雙切換)?$/i,
  );
  if (dual) {
    const normalize = (raw) => {
      if (/LG/i.test(raw)) return "LG U+";
      if (/SKT/i.test(raw)) return "SKT";
      if (/SoftBank/i.test(raw)) return "SoftBank";
      if (/AU/i.test(raw)) return "AU (KDDI)";
      return "KDDI";
    };
    return [
      { name: normalize(dual[1]), speed: "5G" },
      { name: normalize(dual[2]), speed: "5G" },
    ];
  }

  const au = s.match(/^AU\s*\(?\s*KDDI\s*\)?(?:\s*[45]G)?$/i);
  if (au) {
    return [{ name: "AU (KDDI)", speed: "5G" }];
  }

  const single = s.match(
    /^(SKT|LG\s*U\+|KDDI|SoftBank|Docomo|IIJ)(?:\s*[45]G)?$/i,
  );
  if (single && /[45]G/i.test(s)) {
    let name = single[1];
    if (/LG/i.test(name)) name = "LG U+";
    else if (/SKT/i.test(name)) name = "SKT";
    else if (/SoftBank/i.test(name)) name = "SoftBank";
    else if (/KDDI/i.test(name)) name = "AU (KDDI)";
    return [{ name, speed: "5G" }];
  }

  return null;
}

function CarrierSpeedChips({ chips }) {
  return (
    <span className="inline-flex items-center flex-wrap gap-x-3 gap-y-1">
      {chips.map((chip) => (
        <span
          key={`${chip.name}-${chip.speed}`}
          className="inline-flex items-center gap-1.5"
        >
          <span className="font-semibold text-slate-700">{chip.name}</span>
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600">
            {chip.speed}
          </span>
        </span>
      ))}
    </span>
  );
}

function FeatureBulletText({ children, className = "" }) {
  const { openSpeed } = useSpeedScenario();
  const chips = useMemo(
    () => parseCarrierSpeedChips(children),
    [children],
  );
  const html = useMemo(() => {
    if (chips) return "";
    return wrapSpeedMentionsInHtml(formatFeatureBulletHtml(children));
  }, [children, chips]);

  if (chips) {
    return (
      <div className={`feature-bullet-text ${className}`}>
        <CarrierSpeedChips chips={chips} />
      </div>
    );
  }

  return (
    <div
      className={`feature-bullet-text ${className}`}
      onClick={(e) => handleSpeedHtmlClick(e, openSpeed)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ProductActualExperience({ text }) {
  if (!text?.trim()) return null;

  return (
    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#007aff]/10">
          <MaterialIcon name="speed" size={16} className="text-[#007aff]" />
        </div>
        <h4 className="text-sm font-bold text-slate-900">實際體驗</h4>
      </div>
      <FeatureBulletText className="text-sm text-slate-700 leading-relaxed">
        {text}
      </FeatureBulletText>
    </div>
  );
}

/** 概覽分頁：FUP 資訊 + 啟用注意（管理者可前台編輯） */
const ACTIVATION_TUTORIAL_HREF = "/operation-shopee";
const DEFAULT_ACTIVATION_NOTICE =
  "建議在台灣機場先安裝設定好／抵達當地啟用 eSIM";

function ProductOverviewNotices({
  notices,
  carrierFallback,
  product,
  carrier,
  onProductUpdate,
}) {
  const { isAdmin, adminChecked, authHeaders } = useProductAdmin();
  const [isEditing, setIsEditing] = useState(false);
  const [fupDraft, setFupDraft] = useState("");
  const [activationDraft, setActivationDraft] = useState("");
  const [specialDraft, setSpecialDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fupTextRaw =
    notices?.fup_notice ||
    (carrierFallback?.policyTitle && carrierFallback?.policyDesc
      ? `${carrierFallback.policyTitle} ${carrierFallback.policyDesc}`
      : carrierFallback?.policyDesc || "");
  /** 方案說明一律帶「公平使用政策 (FUP):」前綴 */
  const fupText = (() => {
    const raw = String(fupTextRaw || "").trim();
    if (!raw) return "";
    const body = raw
      .replace(/^公平使用政策\s*\(?\s*FUP\s*\)?\s*[:：]?\s*/i, "")
      .trim();
    return body ? `公平使用政策 (FUP): ${body}` : "公平使用政策 (FUP):";
  })();
  const activationExtra = String(
    notices?.activation_notice || carrierFallback?.note || "",
  ).trim();
  /** 啟用提醒固定文案；額外注意事項（如 APN）另列 */
  const activationText = DEFAULT_ACTIVATION_NOTICE;
  const showActivationExtra =
    activationExtra &&
    activationExtra !== DEFAULT_ACTIVATION_NOTICE &&
    !/^建議抵達|^建議您抵達|建議.*後再安裝/.test(activationExtra);
  const specialText = String(
    notices?.special_notice || carrierFallback?.specialNotice || "",
  )
    .trim()
    .replace(/^特別說明\s*[:：]?\s*/i, "");

  useEffect(() => {
    if (!isEditing) {
      setFupDraft(notices?.fup_notice || "");
      setActivationDraft(
        notices?.activation_notice || DEFAULT_ACTIVATION_NOTICE,
      );
      setSpecialDraft(
        notices?.special_notice || carrierFallback?.specialNotice || "",
      );
    }
  }, [notices, carrierFallback, isEditing]);

  const saveOverview = async () => {
    if (!carrier) {
      alert("請先選擇電信商後再儲存");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/product-overview-notices", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          productId: product.id,
          carrier,
          fup_notice: fupDraft.trim(),
          activation_notice: activationDraft.trim(),
          special_notice: specialDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "儲存失敗");
      onProductUpdate?.({
        overview_notices_by_carrier: data.overview_notices_by_carrier,
      });
      setIsEditing(false);
      alert(`已儲存「${carrier}」的概覽說明`);
    } catch (error) {
      alert(error.message || "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const showDisplay =
    !isEditing && (fupText || activationText || specialText);
  const showEmptyAdmin =
    !isEditing &&
    !fupText &&
    !activationText &&
    !specialText &&
    adminChecked &&
    isAdmin;

  if (!showDisplay && !isEditing && !showEmptyAdmin) return null;

  const noticeCount = [fupText, activationText, specialText].filter(
    Boolean,
  ).length;

  return (
    <div className="mt-4 space-y-3">
      {adminChecked && isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              if (!carrier) {
                alert("請先選擇電信商，再編輯概覽說明");
                return;
              }
              if (!isEditing) {
                setFupDraft(notices?.fup_notice || "");
                setActivationDraft(
                  notices?.activation_notice || DEFAULT_ACTIVATION_NOTICE,
                );
                setSpecialDraft(
                  notices?.special_notice ||
                    carrierFallback?.specialNotice ||
                    "",
                );
              }
              setIsEditing(!isEditing);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold text-white transition-colors ${isEditing ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}
          >
            <MaterialIcon name={isEditing ? "close" : "edit"} size={14} />
            {isEditing ? "取消編輯" : "編輯概覽"}
          </button>
        </div>
      )}

      {isEditing && isAdmin ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            正在編輯概覽說明 · 電信商：<strong>{carrier}</strong>
          </p>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              FUP / 公平使用說明
            </label>
            <textarea
              value={fupDraft}
              onChange={(e) => setFupDraft(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              placeholder="例：公平使用政策 (FUP): 不同電信商擁有不同的流量公平使用原則..."
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              啟用注意事項
            </label>
            <textarea
              value={activationDraft}
              onChange={(e) => setActivationDraft(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              placeholder={DEFAULT_ACTIVATION_NOTICE}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              特別說明
            </label>
            <textarea
              value={specialDraft}
              onChange={(e) => setSpecialDraft(e.target.value)}
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2"
              placeholder="例：計費時間自安裝之日起算…"
            />
          </div>
          <button
            type="button"
            onClick={saveOverview}
            disabled={isSaving}
            className="w-full py-2.5 bg-[#00befa] text-white font-bold rounded-lg text-sm disabled:opacity-50"
          >
            {isSaving ? "儲存中..." : "儲存概覽說明"}
          </button>
        </div>
      ) : (
        <>
          {(fupText || activationText || specialText) && (
            <div className="relative pl-7">
              {noticeCount > 1 ? (
                <div
                  className="pointer-events-none absolute left-[7px] top-5 bottom-5 w-px bg-slate-200"
                  aria-hidden
                />
              ) : null}

              {fupText ? (
                <div
                  className={`relative ${
                    activationText || specialText ? "mb-3" : ""
                  }`}
                >
                  <span
                    className="absolute -left-7 top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-[3px] border-[#0A6CD0] bg-[#0A6CD0]"
                    aria-hidden
                  />
                  <article className="rounded-2xl border border-slate-200 bg-[#0A6CD0] px-4 py-3.5 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-[15px] font-bold leading-snug">
                        方案說明
                      </h4>
                      <span className="shrink-0 text-[12px] font-medium text-white/70">
                        FUP
                      </span>
                    </div>
                    <FeatureBulletText className="mt-1.5 text-[13px] leading-relaxed text-white/90 [&_a]:text-white [&_a]:underline [&_button]:text-white [&_button]:underline">
                      {fupText}
                    </FeatureBulletText>
                    <div className="mt-3.5 flex items-center justify-between gap-3">
                      <div className="flex items-center -space-x-1.5" aria-hidden>
                        {["wifi", "signal_cellular_alt", "sim_card"].map(
                          (icon) => (
                            <span
                              key={icon}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0A6CD0] bg-white/95 text-[#0A6CD0]"
                            >
                              <MaterialIcon name={icon} size={14} />
                            </span>
                          ),
                        )}
                      </div>
                      <Link
                        href={ACTIVATION_TUTORIAL_HREF}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0A6CD0] transition hover:bg-white/90"
                        aria-label="查看啟用教學"
                        title="啟用教學"
                      >
                        <MaterialIcon name="arrow_forward" size={18} />
                      </Link>
                    </div>
                  </article>
                </div>
              ) : null}

              {activationText ? (
                <div className={`relative ${specialText ? "mb-3" : ""}`}>
                  <span
                    className="absolute -left-7 top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-slate-300 bg-white"
                    aria-hidden
                  />
                  <article className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                        啟用提醒
                      </h4>
                      <span className="shrink-0 text-[12px] font-medium text-slate-400">
                        注意
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                      建議在台灣機場先
                      <Link
                        href={ACTIVATION_TUTORIAL_HREF}
                        className="mx-0.5 font-semibold text-[#0A6CD0] underline underline-offset-2 hover:text-[#0856a8]"
                      >
                        安裝設定
                      </Link>
                      好／抵達當地啟用 eSIM
                    </p>
                    {showActivationExtra ? (
                      <FeatureBulletText className="mt-2 text-[13px] leading-relaxed text-slate-500">
                        {activationExtra}
                      </FeatureBulletText>
                    ) : null}
                    <div className="mt-3">
                      <Link
                        href={ACTIVATION_TUTORIAL_HREF}
                        className="inline-flex items-center gap-1 text-[12px] font-bold text-[#0A6CD0] hover:underline"
                      >
                        查看啟用教學
                        <MaterialIcon name="arrow_forward" size={14} />
                      </Link>
                    </div>
                  </article>
                </div>
              ) : null}

              {specialText ? (
                <div className="relative">
                  <span
                    className="absolute -left-7 top-5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50"
                    aria-hidden
                  />
                  <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-[15px] font-bold text-amber-950 leading-snug">
                        特別說明
                      </h4>
                      <span className="shrink-0 text-[12px] font-medium text-amber-700/70">
                        重要
                      </span>
                    </div>
                    <FeatureBulletText className="mt-1.5 text-[13px] leading-relaxed text-amber-950/80">
                      {specialText}
                    </FeatureBulletText>
                  </article>
                </div>
              ) : null}
            </div>
          )}
          {showEmptyAdmin && (
            <p className="text-xs text-slate-400">
              「{carrier}」尚無概覽說明，點「編輯概覽」新增。
            </p>
          )}
        </>
      )}
    </div>
  );
}

const ANKER_BLUE = "#00befa";

const PRODUCT_SUB_NAV = [
  { id: "purchase", label: "購買", href: "#purchase-section" },
  { id: "overview", label: "概覽", href: "#product-tabs" },
  { id: "specs", label: "使用介紹", href: "#product-usage" },
  { id: "comparison", label: "比較", href: "#product-comparison" },
  { id: "faq", label: "常見問題", href: "#product-faq" },
  { id: "reviews", label: "評論", href: "#product-reviews" },
];

function ServiceBenefits() {
  const items = [
    {
      icon: "local_shipping",
      title: "快速出貨",
      desc: "下單後 Email 寄送 eSIM QR Code",
    },
    {
      icon: "assignment_return",
      title: "安心購買",
      desc: "非原生依安裝／激活狀態；原生售出後不退不換",
      href: "/refund-policy",
    },
    {
      icon: "verified_user",
      title: "品質保障",
      desc: "正規電信線路，穩定連線",
    },
    { icon: "support_agent", title: "客服支援", desc: "LINE 官方客服即時協助" },
  ];
  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-bold text-slate-900 mb-4">服務與保障</h3>
      <a
        href="/promotions"
        className="flex items-center justify-between rounded-xl px-4 py-3.5 mb-4 text-sm font-semibold text-slate-800 transition-colors hover:opacity-90"
        style={{ background: "rgba(0, 190, 250, 0.12)" }}
      >
        <span>更多專屬優惠</span>
        <MaterialIcon
          name="chevron_right"
          size={18}
          className="text-gray-400"
        />
      </a>
      <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-white">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-gray-50/80"
          >
            <span
              className="w-8 shrink-0 flex items-center justify-center"
              style={{ color: ANKER_BLUE }}
            >
              <MaterialIcon name={item.icon} size={22} />
            </span>
            <div className="flex-1 min-w-0">
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <p className="font-semibold text-slate-900 group-hover:text-[#00befa]">
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </a>
              ) : (
                <>
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </>
              )}
            </div>
            <MaterialIcon
              name={item.href ? "open_in_new" : "info"}
              size={16}
              className="text-gray-300 shrink-0"
            />
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <p className="text-xs font-bold text-gray-500 mb-2">付款方式</p>
        <div className="flex flex-wrap gap-2">
          {["Visa", "Mastercard", "Apple Pay", "LINE Pay", "街口", "藍新"].map(
            (p) => (
              <span
                key={p}
                className="px-2.5 py-1 text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded"
              >
                {p}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. UI 組件設定 (Modal, Tabs 等)
// ==========================================
const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-5xl",
}) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => (document.body.style.overflow = "unset");
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`bg-white w-full ${maxWidth} max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl pointer-events-auto flex flex-col`}
            >
              <div className="flex justify-between items-center p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <MaterialIcon name="close" size={22} />
                </button>
              </div>
              <div className="p-6">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const CompatibilityModal = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredDevices = useMemo(() => {
    if (!searchTerm) return COMPATIBLE_DEVICES;
    return COMPATIBLE_DEVICES.map((cat) => ({
      ...cat,
      items: cat.items.filter((item) =>
        item.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchTerm]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="我的手機支援日本 eSIM 嗎？"
      maxWidth="max-w-3xl"
    >
      <div className="text-slate-700 space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl text-sm leading-relaxed border border-gray-100">
          <p className="font-bold mb-2">
            若要使用 FeGo eSIM，請確保您的裝置：支援 eSIM 且未鎖定電信商。
          </p>
        </div>
        <input
          type="text"
          className="block w-full px-3 py-3 border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="輸入設備型號 (例如：iPhone 14)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="space-y-3">
          {filteredDevices.map((category, idx) => (
            <div
              key={idx}
              className="border border-gray-200 rounded-xl overflow-hidden p-4 bg-white"
            >
              <span className="font-bold text-slate-800 block mb-2">
                {category.category}
              </span>
              <ul className="space-y-1 text-sm text-slate-600">
                {category.items.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

const CARRIER_HTML_SANITIZE_CONFIG = CARRIER_HTML_SANITIZE;

const CARRIER_QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    [{ size: ["small", false, "large", "huge"] }],
    ["bold", "italic", "underline", "strike", "blockquote"],
    [{ align: [] }],
    [
      { list: "ordered" },
      { list: "bullet" },
      { indent: "-1" },
      { indent: "+1" },
    ],
    [{ color: [] }, { background: [] }],
    ["link", "image", "video"],
    ["clean"],
  ],
};

function CarrierHtmlDisplay({ html, className = "", accordion = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || !html || !accordion) return undefined;

    const cleanups = [];

    const bindAccordion = ({
      triggerSelector,
      itemSelector,
      panelSelector,
      openClass,
      panelOpenClass,
      // 平滑模式：以 max-height 過渡展開/收合，避免 display:none/block 造成版面瞬間跳動
      smooth = false,
      iconSelector = null,
    }) => {
      const setPanelState = (entry, entryPanel, entryTrigger, isEntryOpen) => {
        if (!entryPanel) return;
        if (smooth) {
          entryPanel.style.overflow = "hidden";
          entryPanel.style.transition = "max-height .3s ease";
          entryPanel.style.maxHeight = isEntryOpen
            ? `${entryPanel.scrollHeight}px`
            : "0px";
        } else {
          entryPanel.classList.toggle(panelOpenClass, isEntryOpen);
          entryPanel.style.display = isEntryOpen ? "block" : "none";
        }
        entry.classList.toggle(openClass, isEntryOpen);
        if (entryTrigger?.setAttribute) {
          entryTrigger.setAttribute(
            "aria-expanded",
            isEntryOpen ? "true" : "false",
          );
        }
        const entryIcon = iconSelector
          ? entry.querySelector(iconSelector)
          : null;
        if (entryIcon) {
          entryIcon.style.transform = `rotate(${isEntryOpen ? 180 : 0}deg)`;
        }
      };

      root.querySelectorAll(triggerSelector).forEach((trigger) => {
        const item = trigger.closest(itemSelector);
        const panel = item?.querySelector(panelSelector);
        if (!item || !panel) return;

        trigger.style.cursor = "pointer";

        // 初始化平滑模式的高度（依目前 openClass 狀態），避免第一次點擊才套用過渡
        if (smooth) {
          setPanelState(
            item,
            panel,
            trigger,
            item.classList.contains(openClass),
          );
        }

        const toggle = (event) => {
          event?.preventDefault();
          const isOpen = item.classList.contains(openClass);

          root.querySelectorAll(itemSelector).forEach((entry) => {
            const entryPanel = entry.querySelector(panelSelector);
            const entryTrigger = entry.querySelector(triggerSelector);
            setPanelState(entry, entryPanel, entryTrigger, false);
          });

          if (!isOpen) {
            setPanelState(item, panel, trigger, true);
          }
        };

        const onKeyDown = (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle(event);
          }
        };

        trigger.addEventListener("click", toggle);
        trigger.addEventListener("keydown", onKeyDown);
        cleanups.push(() => {
          trigger.removeEventListener("click", toggle);
          trigger.removeEventListener("keydown", onKeyDown);
        });
      });
    };

    bindAccordion({
      triggerSelector: ".jeko-faq-trigger",
      itemSelector: ".jeko-faq-item",
      panelSelector: ".jeko-faq-panel",
      openClass: "is-open",
      panelOpenClass: "is-open",
      smooth: true,
      iconSelector: ".jeko-faq-icon",
    });

    bindAccordion({
      triggerSelector: ".t4s-accor-title",
      itemSelector: ".t4s-tab-wrapper",
      panelSelector: ".t4s-tab-content",
      openClass: "t4s-active",
      panelOpenClass: "t4s-active",
    });

    return () => cleanups.forEach((fn) => fn());
  }, [html, accordion]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function CarrierHtmlEditor({
  carrier,
  content,
  onChange,
  editMode,
  onEditModeChange,
  onSave,
  isSaving,
  sectionLabel,
  preferHtmlMode = false,
}) {
  const handleModeChange = (mode) => {
    if (
      mode === "visual" &&
      (preferHtmlMode || hasBlockLevelCarrierHtml(content))
    ) {
      alert(
        "此區塊含區塊級 HTML 排版，請使用「HTML 原始碼」貼上與編輯。切換視覺化會把標籤轉成純文字。",
      );
      return;
    }
    onEditModeChange(mode);
  };

  return (
    <div className="mb-10 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-xs text-amber-900">
        正在編輯{sectionLabel} · 電信商：
        <strong className="font-bold ml-1">{carrier}</strong>
        <span className="text-amber-700 ml-2">
          （各電信商內容獨立儲存，切換電信商前請先儲存）
        </span>
      </div>
      {preferHtmlMode ? (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-900">
          含表格／多欄排版請在「HTML
          原始碼」貼上，儲存後再預覽，不要切到視覺化編輯。
        </div>
      ) : null}
      <div className="flex items-center gap-2 bg-slate-100 p-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => handleModeChange("visual")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${editMode === "visual" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"}`}
        >
          <MaterialIcon name="visibility" size={16} /> 視覺化編輯
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("html")}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${editMode === "html" ? "bg-slate-800 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200"}`}
        >
          <MaterialIcon name="code" size={16} /> HTML 原始碼
        </button>
      </div>
      <div className="relative">
        {editMode === "visual" ? (
          <div className="bg-white">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={onChange}
              modules={CARRIER_QUILL_MODULES}
              className="h-[400px] pb-10"
            />
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-[442px] p-5 font-mono text-sm leading-relaxed bg-[#1e1e1e] text-[#d4d4d4] focus:outline-none resize-none"
            placeholder="請在此貼上 HTML 原始碼..."
            spellCheck="false"
          />
        )}
      </div>
      <div className="flex justify-end items-center p-4 bg-gray-50 border-t border-gray-200">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          {isSaving ? (
            "儲存中..."
          ) : (
            <>
              <MaterialIcon name="save" size={16} />
              儲存並發布
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 產品動態介紹區域 (依電信商 + 管理者專用編輯)
// ==========================================
const ProductTabs = ({ product, selectedCarrier, onProductUpdate }) => {
  const [activeTab, setActiveTab] = useState("desc");
  const { isAdmin, adminChecked, authHeaders } = useProductAdmin();

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [isEditingUsage, setIsEditingUsage] = useState(false);
  const [isEditingFaq, setIsEditingFaq] = useState(false);
  const [descContent, setDescContent] = useState("");
  const [usageContent, setUsageContent] = useState("");
  const [faqContent, setFaqContent] = useState("");
  const [descEditMode, setDescEditMode] = useState("html");
  const [usageEditMode, setUsageEditMode] = useState("html");
  const [faqEditMode, setFaqEditMode] = useState("html");
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isSavingUsage, setIsSavingUsage] = useState(false);
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  const safeCarrier = selectedCarrier || null;
  const displayedContent = resolveDetailedContent(product, safeCarrier);
  const displayedUsage = resolveUsageContent(product, safeCarrier);
  const displayedFaq = resolveFaqContent(product, safeCarrier);
  const sanitizedDisplayHtml = useMemo(
    () =>
      DOMPurify.sanitize(
        normalizeCarrierHtml(displayedContent || ""),
        CARRIER_HTML_SANITIZE_CONFIG,
      ),
    [displayedContent],
  );
  const sanitizedUsageHtml = useMemo(
    () =>
      DOMPurify.sanitize(
        normalizeCarrierHtml(displayedUsage || ""),
        CARRIER_HTML_SANITIZE_CONFIG,
      ),
    [displayedUsage],
  );
  const sanitizedFaqHtml = useMemo(
    () =>
      DOMPurify.sanitize(
        normalizeCarrierHtml(displayedFaq || ""),
        CARRIER_HTML_SANITIZE_CONFIG,
      ),
    [displayedFaq],
  );
  const faqHasSectionHead = sanitizedFaqHtml.includes("jeko-section-head");

  useEffect(() => {
    if (!isEditingDesc) {
      setDescContent(
        normalizeCarrierHtml(resolveDetailedContent(product, safeCarrier)),
      );
    }
  }, [product, safeCarrier, isEditingDesc]);

  useEffect(() => {
    if (!isEditingUsage) {
      setUsageContent(
        normalizeCarrierHtml(resolveUsageContent(product, safeCarrier)),
      );
    }
  }, [product, safeCarrier, isEditingUsage]);

  useEffect(() => {
    if (!isEditingFaq) {
      setFaqContent(
        normalizeCarrierHtml(resolveFaqContent(product, safeCarrier)),
      );
    }
  }, [product, safeCarrier, isEditingFaq]);

  const saveCarrierContent = async ({
    contentType,
    html,
    setSaving,
    closeEditing,
    successLabel,
  }) => {
    if (!safeCarrier) {
      alert("請先選擇電信商後再儲存");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/product-detailed-content", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          productId: product.id,
          carrier: safeCarrier,
          html: normalizeCarrierHtml(html),
          contentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.detail || "儲存失敗");
      }

      if (contentType === "usage") {
        onProductUpdate?.({
          usage_content_by_carrier: data.usage_content_by_carrier,
        });
      } else if (contentType === "faq") {
        onProductUpdate?.({
          faq_content_by_carrier: data.faq_content_by_carrier,
        });
      } else {
        onProductUpdate?.({
          detailed_content_by_carrier: data.detailed_content_by_carrier,
        });
      }
      closeEditing();
      alert(`已儲存「${safeCarrier}」的${successLabel}`);
    } catch (error) {
      alert(error.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "desc", label: "產品介紹" },
    { id: "usage", label: "使用介紹" },
    { id: "faq", label: "常見問題" },
  ];

  return (
    <div id="product-tabs" className="mt-16">
      <div className="flex justify-center border-b border-gray-200 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setIsEditingDesc(false);
              setIsEditingUsage(false);
              setIsEditingFaq(false);
              setActiveTab(tab.id);
            }}
            className={`px-5 sm:px-8 py-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-[#00befa] text-slate-900"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px]">
        {activeTab === "desc" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <MaterialIcon
                  name="travel_explore"
                  size={24}
                  className="text-[#2B59C3]"
                />
                關於 {product.name}
              </h3>
              {adminChecked && isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (!safeCarrier) {
                      alert("請先選擇電信商，再編輯該電信商的產品介紹");
                      return;
                    }
                    if (!isEditingDesc) {
                      setDescContent(
                        normalizeCarrierHtml(
                          resolveDetailedContent(product, safeCarrier),
                        ),
                      );
                    }
                    setIsEditingUsage(false);
                    setIsEditingFaq(false);
                    setIsEditingDesc(!isEditingDesc);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white transition-colors ${isEditingDesc ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  {isEditingDesc ? (
                    <>
                      <MaterialIcon name="close" size={16} /> 取消編輯
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="edit" size={16} /> 編輯內容
                    </>
                  )}
                </button>
              )}
            </div>

            {isEditingDesc && isAdmin ? (
              <CarrierHtmlEditor
                carrier={safeCarrier}
                content={descContent}
                onChange={setDescContent}
                editMode={descEditMode}
                onEditModeChange={setDescEditMode}
                isSaving={isSavingDesc}
                sectionLabel="產品介紹"
                preferHtmlMode
                onSave={() =>
                  saveCarrierContent({
                    contentType: "detailed",
                    html: descContent,
                    setSaving: setIsSavingDesc,
                    closeEditing: () => setIsEditingDesc(false),
                    successLabel: "產品介紹",
                  })
                }
              />
            ) : (
              <div className="mb-10 text-slate-600 text-sm leading-relaxed">
                {sanitizedDisplayHtml ? (
                  <div>
                    <h4 className="font-bold text-slate-800 mb-4 inline-flex items-center gap-2">
                      <MaterialIcon
                        name="menu_book"
                        size={20}
                        className="text-[#2B59C3]"
                      />
                      方案詳細說明
                      {safeCarrier ? (
                        <span className="text-gray-400 font-normal text-sm ml-2">
                          （{safeCarrier}）
                        </span>
                      ) : null}
                    </h4>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizedDisplayHtml,
                      }}
                      className="max-w-none product-content-wrapper"
                    />
                  </div>
                ) : (
                  safeCarrier && (
                    <p className="text-sm text-slate-400">
                      「{safeCarrier}」尚無產品介紹內容。
                      {isAdmin ? " 點「編輯內容」新增。" : ""}
                    </p>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "usage" && (
          <motion.div
            id="product-usage"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <MaterialIcon
                  name="tips_and_updates"
                  size={24}
                  className="text-[#2B59C3]"
                />
                使用介紹
              </h3>
              {adminChecked && isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (!safeCarrier) {
                      alert("請先選擇電信商，再編輯該電信商的使用介紹");
                      return;
                    }
                    if (!isEditingUsage) {
                      setUsageContent(
                        normalizeCarrierHtml(
                          resolveUsageContent(product, safeCarrier),
                        ),
                      );
                    }
                    setIsEditingDesc(false);
                    setIsEditingFaq(false);
                    setIsEditingUsage(!isEditingUsage);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white transition-colors ${isEditingUsage ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  {isEditingUsage ? (
                    <>
                      <MaterialIcon name="close" size={16} /> 取消編輯
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="edit" size={16} /> 編輯內容
                    </>
                  )}
                </button>
              )}
            </div>

            {isEditingUsage && isAdmin ? (
              <CarrierHtmlEditor
                carrier={safeCarrier}
                content={usageContent}
                onChange={setUsageContent}
                editMode={usageEditMode}
                onEditModeChange={setUsageEditMode}
                isSaving={isSavingUsage}
                sectionLabel="使用介紹"
                preferHtmlMode
                onSave={() =>
                  saveCarrierContent({
                    contentType: "usage",
                    html: usageContent,
                    setSaving: setIsSavingUsage,
                    closeEditing: () => setIsEditingUsage(false),
                    successLabel: "使用介紹",
                  })
                }
              />
            ) : (
              <div className="mb-10 text-slate-600 text-sm leading-relaxed">
                {sanitizedUsageHtml ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: sanitizedUsageHtml }}
                    className="max-w-none product-content-wrapper"
                  />
                ) : (
                  safeCarrier && (
                    <p className="text-sm text-slate-400">
                      「{safeCarrier}」尚無使用介紹內容。
                      {isAdmin ? " 點「編輯內容」新增。" : ""}
                    </p>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "faq" && (
          <motion.div
            id="product-faq"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex justify-between items-center mb-6">
              {!faqHasSectionHead ? (
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <MaterialIcon
                    name="quiz"
                    size={24}
                    className="text-[#2B59C3]"
                  />
                  常見問題
                </h3>
              ) : (
                <div />
              )}
              {adminChecked && isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (!safeCarrier) {
                      alert("請先選擇電信商，再編輯該電信商的常見問題");
                      return;
                    }
                    if (!isEditingFaq) {
                      setFaqContent(
                        normalizeCarrierHtml(
                          resolveFaqContent(product, safeCarrier),
                        ),
                      );
                    }
                    setIsEditingDesc(false);
                    setIsEditingUsage(false);
                    setIsEditingFaq(!isEditingFaq);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold text-white transition-colors ${isEditingFaq ? "bg-red-500 hover:bg-red-600" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  {isEditingFaq ? (
                    <>
                      <MaterialIcon name="close" size={16} /> 取消編輯
                    </>
                  ) : (
                    <>
                      <MaterialIcon name="edit" size={16} /> 編輯內容
                    </>
                  )}
                </button>
              )}
            </div>

            {isEditingFaq && isAdmin ? (
              <CarrierHtmlEditor
                carrier={safeCarrier}
                content={faqContent}
                onChange={setFaqContent}
                editMode={faqEditMode}
                onEditModeChange={setFaqEditMode}
                isSaving={isSavingFaq}
                sectionLabel="常見問題"
                preferHtmlMode
                onSave={() =>
                  saveCarrierContent({
                    contentType: "faq",
                    html: faqContent,
                    setSaving: setIsSavingFaq,
                    closeEditing: () => setIsEditingFaq(false),
                    successLabel: "常見問題",
                  })
                }
              />
            ) : (
              <div className="mb-10 text-slate-600 text-sm leading-relaxed">
                {sanitizedFaqHtml ? (
                  <CarrierHtmlDisplay
                    html={sanitizedFaqHtml}
                    className="max-w-none product-content-wrapper"
                    accordion
                  />
                ) : (
                  safeCarrier && (
                    <p className="text-sm text-slate-400">
                      「{safeCarrier}」尚無常見問題內容。
                      {isAdmin ? " 點「編輯內容」新增。" : ""}
                    </p>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// Medusa API 資料抓取
// ==========================================
const getMedusaHeaders = () => {
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
  return {
    "Content-Type": "application/json",
    ...(publishableKey && { "x-publishable-api-key": publishableKey }),
  };
};

const backendUrl =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

export async function getStaticPaths() {
  // Vercel／CI：不在 build 時預渲染全部 PDP（日本無限流量等變體極多會超時）。
  // fallback: blocking + revalidate → 首訪 ISR 生成 HTML，之後等同靜態頁。
  if (process.env.VERCEL || process.env.SKIP_PRODUCT_SSG === "1") {
    return { paths: [], fallback: "blocking" };
  }

  try {
    const paths = [];
    const seen = new Set();
    const limit = 100;
    for (let offset = 0; offset < 500; offset += limit) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        fields: "id,handle,*categories",
      });
      const res = await fetch(`${backendUrl}/store/products?${params}`, {
        headers: getMedusaHeaders(),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error("無法取得 Medusa 商品");
      const { products } = await res.json();
      for (const p of products || []) {
        const slug = p.handle;
        const categoryHandle = p.categories?.[0]?.handle || "uncategorized";
        if (!slug) continue;
        const key = `${categoryHandle}/${slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        paths.push({ params: { category: categoryHandle, slug } });
      }
      if (!products?.length || products.length < limit) break;
    }

    return { paths, fallback: "blocking" };
  } catch (error) {
    console.error("Medusa getStaticPaths 錯誤:", error);
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const { slug, category: categoryHandle } = params;
    const headers = getMedusaHeaders();

    let regionId = "";
    try {
      const region = await fetchMedusaRegions();
      if (region?.id) regionId = region.id;
    } catch {
      /* ignore */
    }

    const query = new URLSearchParams({
      handle: slug,
      fields:
        "+metadata,*variants,*variants.metadata,*variants.prices,*variants.calculated_price,*variants.options,*variants.options.option,*images,*categories",
    });
    if (regionId) query.set("region_id", regionId);

    const prodUrl = `${backendUrl}/store/products?${query.toString()}`;
    const prodRes = await fetch(prodUrl, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    const prodData = await prodRes.json();

    if (!prodRes.ok) {
      // 60 秒後允許重新嘗試：若是 Medusa 暫時無回應／逾時，
      // 不應該把這次的失敗永久快取成 404（否則要等下次部署才會恢復）。
      return { notFound: true, revalidate: 60 };
    }

    const product = prodData.products?.[0];

    if (!product) {
      return { notFound: true, revalidate: 60 };
    }

    const rawKeyFeatures = product.metadata?.key_features_by_carrier;
    const parsedKeyFeatures = parseKeyFeaturesByCarrier(rawKeyFeatures) || {};

    const rawOverviewNotices = product.metadata?.overview_notices_by_carrier;
    const rawDetailedByCarrier = product.metadata?.detailed_content_by_carrier;
    const rawUsageByCarrier = product.metadata?.usage_content_by_carrier;
    const rawFaqByCarrier = product.metadata?.faq_content_by_carrier;
    const rawPromoByCarrier = product.metadata?.promo_offer_by_carrier;

    // 分潤％／旅客折扣％（夥伴商業機密）絕不可送到客戶端頁面 props——
    // getStaticProps 回傳值會整包序列化進 __NEXT_DATA__，訪客看原始碼／
    // Network 分頁就能讀到。這兩個欄位只在 Medusa Admin 與後端伺服端流程
    // （結帳套碼、夥伴後台 API）讀取，見 lib/productPartnerTerms.js。
    const { ...publicMetadata } = product.metadata || {};
    delete publicMetadata.carrier_partner_rate_by_carrier;
    delete publicMetadata.carrier_referral_discount_by_carrier;

    const parsedSubtitleByCarrier = parseSubtitleByCarrier(
      product.metadata?.subtitle_by_carrier,
    );
    // product-content 以 JSON 字串寫入；未解析就 spread 會變成 "0"→"{" 並被模糊比對誤中
    publicMetadata.subtitle_by_carrier = parsedSubtitleByCarrier;

    const formattedProduct = {
      id: product.id,
      name: product.title,
      subtitle: product.subtitle || "",
      slug: product.handle,
      description: stripEuPackCopy(product.description || ""),
      metadata: publicMetadata,
      subtitle_by_carrier: parsedSubtitleByCarrier,
      detailed_content: stripEuPackCopy(product.metadata?.detailed_content || ""),
      detailed_content_by_carrier:
        parseDetailedContentByCarrier(rawDetailedByCarrier),
      usage_content_by_carrier: parseUsageContentByCarrier(rawUsageByCarrier),
      faq_content_by_carrier: parseFaqContentByCarrier(rawFaqByCarrier),
      promo_offer_by_carrier: parsePromoOfferByCarrier(rawPromoByCarrier),
      key_features_by_carrier: parsedKeyFeatures,
      carrier_specs_by_carrier:
        parseCarrierSpecsByCarrier(
          product.metadata?.carrier_specs_by_carrier,
        ) || {},
      hot_sale_telecoms: parseHotSaleTelecoms(
        product.metadata?.hot_sale_telecoms,
      ),
      overview_notices_by_carrier:
        parseOverviewNoticesByCarrier(rawOverviewNotices),
      image_url: (() => {
        const resolved = resolveMedusaImageUrl(product.thumbnail);
        const cat =
          categoryHandle || product.categories?.[0]?.handle || "uncategorized";
        return withUsEsimDefaultImage(resolved, {
          categorySlug: cat,
          handle: product.handle,
        });
      })(),
      image_urls: (() => {
        const urls = resolveMedusaImageUrls(
          product.images?.map((img) => img.url) || [],
        );
        const cat =
          categoryHandle || product.categories?.[0]?.handle || "uncategorized";
        if (
          isUsEsimProduct({ categorySlug: cat, handle: product.handle })
        ) {
          return [
            US_ESIM_DEFAULT_IMAGE,
            ...urls.filter((u) => u && u !== US_ESIM_DEFAULT_IMAGE),
          ];
        }
        return urls;
      })(),
      price: product.variants?.[0]?.prices?.[0]?.amount || null,
    };

    const formattedVariations =
      product.variants?.map((v) => {
        let price = 0;

        // 🌟 價格相容性處理 (完整支援 Medusa V1 / V2 各種回傳格式)
        if (
          v.calculated_price &&
          typeof v.calculated_price.calculated_amount === "number"
        ) {
          price = v.calculated_price.calculated_amount;
        } else if (typeof v.calculated_price === "number") {
          price = v.calculated_price;
        } else if (v.prices && v.prices.length > 0) {
          const twdPrice = v.prices.find(
            (p) =>
              p.currency_code === "twd" ||
              p.currency_code === "TWD" ||
              p.currency_code === "NTD",
          );
          price = twdPrice ? twdPrice.amount : v.prices[0].amount;
        }

        let attrs = {};
        if (v.metadata?.attributes) {
          try {
            attrs =
              typeof v.metadata.attributes === "string"
                ? JSON.parse(v.metadata.attributes)
                : { ...v.metadata.attributes };
          } catch (e) {}
        }

        // 只取選購規格欄位，勿把整包 metadata 灌進 attributes（頁面 JSON 會爆）
        // 依選項標題解析（使用天數／電信商／數據量）；天數勿用 includes("天") 以免誤判
        v.options?.forEach((opt) => {
          const val = String(opt.value || "").trim();
          if (!val) return;
          const title = String(opt.option?.title || opt.title || "").trim();

          if (title === "使用天數" || /^\d+\s*天/.test(val)) {
            attrs.days = parseInt(val, 10);
          } else if (title === "數據量") {
            attrs.data_amount = val;
          } else if (
            !title &&
            (val.includes("流量") ||
              val.includes("GB") ||
              val.includes("MB") ||
              val.includes("吃到飽") ||
              val.includes("每日") ||
              /5Mbps續航/i.test(val))
          ) {
            attrs.data_amount = val;
          } else if (title === "電信商") {
            attrs.telecom = val;
          } else if (title === "線路" || title === "方案") {
            attrs.line = val;
          }
        });

        // title 後備：中國移動 · 5天 · 每日 1GB（5Mbps續航）
        const fromTitle = getVariationOptionAttrs({
          title: v.title,
          attributes: attrs,
        });
        if (!attrs.telecom && fromTitle.telecom)
          attrs.telecom = fromTitle.telecom;
        if (
          (attrs.days == null || attrs.days === "") &&
          fromTitle.days != null
        ) {
          attrs.days = parseInt(fromTitle.days, 10);
        }
        if (!attrs.data_amount && fromTitle.data_amount) {
          attrs.data_amount = fromTitle.data_amount;
        }

        const n = (x) => (x === undefined ? null : x);
        return {
          id: v.id,
          title: v.title || "",
          sku: v.sku || "",
          price: price,
          original_price: v.original_price || price,
          plan_id: v.metadata?.plan_id || "",
          attributes: {
            telecom: attrs.telecom || null,
            days: attrs.days ?? null,
            data_amount: attrs.data_amount || null,
            line: attrs.line || null,
            speed_rule: attrs.speed_rule || v.metadata?.speed_rule || null,
            ip_type: attrs.ip_type || null,
            network: attrs.network || null,
            route_type: attrs.route_type || null,
            hotspot: n(attrs.hotspot),
            gpt: n(attrs.gpt),
            tiktok: n(attrs.tiktok),
            gemini: n(attrs.gemini),
          },
          tags: v.metadata?.tags ? String(v.metadata.tags).split(",") : [],
          speed_desc: v.metadata?.speed_desc || "",
          rule_desc: v.metadata?.rule_desc || "",
          metadata: {
            plan_id: v.metadata?.plan_id || "",
            cost_price: n(v.metadata?.cost_price),
            cost_hkd: n(v.metadata?.cost_hkd),
            throttle_kind: n(v.metadata?.throttle_kind),
            speed_rule: n(v.metadata?.speed_rule),
          },
        };
      }) || [];

    // 試算器跨商品比較改由進頁後 /api/esim/comparable-plans 拉取，不阻塞 ISR
    const hotSaleTelecoms = parseHotSaleTelecoms(
      product.metadata?.hot_sale_telecoms,
    );
    const comparablePlans = formattedVariations.map((v) => ({
      ...v,
      productId: product.id,
      productSlug: product.handle,
      productName: product.title || "",
      productLabel: "",
      productKind: "other",
      isCurrentProduct: true,
      categoryHandle: categoryHandle || "",
      hotSaleTelecoms,
      isHotSale: isHotSaleTelecom(
        hotSaleTelecoms,
        v.attributes?.telecom || "",
      ),
    }));

    return {
      props: {
        product: formattedProduct,
        variations: formattedVariations,
        comparablePlans,
      },
      revalidate: 3600,
    };
  } catch (e) {
    console.error("Medusa getStaticProps error:", e);
    return { notFound: true, revalidate: 60 };
  }
}

// ==========================================
// 5. 主頁面 Component
// ==========================================
export default function ProductPage({
  product: initialProduct,
  variations = [],
  comparablePlans = [],
  /** "site" = 主站 Layout；"shop" = /shop Navbar+Footer（夥伴賣場） */
  shell = "site",
  store = null,
}) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [product, setProduct] = useState(initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [currentVariation, setCurrentVariation] = useState(null);

  const [isCompatOpen, setIsCompatOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [mainSwiper, setMainSwiper] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false);
  const [galleryLightboxIndex, setGalleryLightboxIndex] = useState(0);
  const [featuresOpen, setFeaturesOpen] = useState(true);
  const [mediaTab, setMediaTab] = useState("overview");
  const [showStickyBuy, setShowStickyBuy] = useState(false);
  const [coveragePromptOpen, setCoveragePromptOpen] = useState(false);
  const [pendingPurchaseAction, setPendingPurchaseAction] = useState(null);
  const [coverageContinueAction, setCoverageContinueAction] = useState(null);
  const [iijApnPromptOpen, setIijApnPromptOpen] = useState(false);
  const [auApnPromptOpen, setAuApnPromptOpen] = useState(false);
  const [softbankApnPromptOpen, setSoftbankApnPromptOpen] = useState(false);
  const [dataExhaustPromptOpen, setDataExhaustPromptOpen] = useState(false);
  const [liveComparablePlans, setLiveComparablePlans] =
    useState(comparablePlans);
  const isPartnerShell = shell === "shop" && store;
  const productAdmin = useProductAdmin();
  const isAdmin = isPartnerShell ? false : productAdmin.isAdmin;
  const adminChecked = isPartnerShell ? true : productAdmin.adminChecked;
  const authHeaders = productAdmin.authHeaders;

  // 專屬折扣碼連結進入：隱藏商品頁自訂優惠（兩者互斥、結帳也只能套一組碼）
  const [suppressProductPromo, setSuppressProductPromo] = useState(false);
  useEffect(() => {
    if (isPartnerShell) {
      setSuppressProductPromo(false);
      return;
    }
    let fromStorage = false;
    try {
      fromStorage = Boolean(sessionStorage.getItem(PENDING_COUPON_KEY));
    } catch {
      /* ignore */
    }
    const q = router.query || {};
    // 僅在帶 coupon（專屬折扣碼）時隱藏；純 ?ref= 歸因連結仍可顯示商品優惠
    const fromQuery = Boolean(typeof q.coupon === "string" && q.coupon.trim());
    setSuppressProductPromo(fromStorage || fromQuery);
  }, [isPartnerShell, router.query?.coupon, router.query?.ref]);

  useEffect(() => {
    setProduct(initialProduct);
    setLiveComparablePlans(comparablePlans);
    setCoverageContinueAction(null);
    setCoveragePromptOpen(false);
    setPendingPurchaseAction(null);
    setIijApnPromptOpen(false);
    setAuApnPromptOpen(false);
    setSoftbankApnPromptOpen(false);
  }, [initialProduct, comparablePlans]);

  useEffect(() => {
    if (isPartnerShell) return;
    const category =
      typeof router.query?.category === "string"
        ? router.query.category
        : "";
    const handle = initialProduct?.slug;
    if (!category || !handle) return;
    let cancelled = false;
    fetch(
      `/api/esim/comparable-plans?category=${encodeURIComponent(category)}&handle=${encodeURIComponent(handle)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.plans) || !data.plans.length)
          return;
        setLiveComparablePlans(data.plans);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isPartnerShell, router.query?.category, initialProduct?.slug]);

  // 進頁即時拉最新 metadata（後台儲存後不用等 ISR）
  useEffect(() => {
    if (!initialProduct?.slug) return;

    fetch(
      `/api/medusa/product-features?handle=${encodeURIComponent(initialProduct.slug)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setProduct((prev) => ({
          ...prev,
          ...(data.key_features_by_carrier
            ? { key_features_by_carrier: data.key_features_by_carrier }
            : {}),
          ...(data.carrier_specs_by_carrier
            ? { carrier_specs_by_carrier: data.carrier_specs_by_carrier }
            : {}),
          ...(data.hot_sale_telecoms
            ? { hot_sale_telecoms: data.hot_sale_telecoms }
            : {}),
          ...(data.overview_notices_by_carrier
            ? {
                overview_notices_by_carrier: data.overview_notices_by_carrier,
              }
            : {}),
          ...(data.detailed_content_by_carrier
            ? {
                detailed_content_by_carrier: data.detailed_content_by_carrier,
              }
            : {}),
          ...(data.usage_content_by_carrier
            ? { usage_content_by_carrier: data.usage_content_by_carrier }
            : {}),
          ...(data.faq_content_by_carrier
            ? { faq_content_by_carrier: data.faq_content_by_carrier }
            : {}),
          ...(data.promo_offer_by_carrier
            ? { promo_offer_by_carrier: data.promo_offer_by_carrier }
            : {}),
          detailed_content: data.detailed_content || prev.detailed_content,
        }));
      })
      .catch(() => {});
  }, [initialProduct?.slug]);

  // 1. 初始化網址參數與「預設選取」（相容舊中文 URL，內部用完整名稱）
  useEffect(() => {
    if (router.isReady && variations.length > 0) {
      const carriers = [
        ...new Set(
          variations
            .map((v) => getVariationOptionAttrs(v).telecom)
            .filter(Boolean),
        ),
      ];
      const daysList = [
        ...new Set(
          variations
            .map((v) => getVariationOptionAttrs(v).days)
            .filter(Boolean),
        ),
      ];
      const amounts = [
        ...new Set(
          variations
            .map((v) => getVariationOptionAttrs(v).data_amount)
            .filter(Boolean),
        ),
      ].sort(compareDataAmountsAsc);

      const initialAttrs = resolveProductOptionQuery(router.query, {
        telecoms: carriers,
        days: daysList,
        dataAmounts: amounts,
      });

      if (Object.keys(initialAttrs).length === 0) {
        const firstTelecom = carriers[0];
        if (firstTelecom) initialAttrs.telecom = firstTelecom;
        if (amounts[0]) initialAttrs.data_amount = amounts[0];
      }

      setSelectedAttributes(initialAttrs);

      // 僅在網址已有規格參數時，改寫成安全別名（方便複製分享）
      const hadOptionQuery =
        router.query.telecom != null ||
        router.query.days != null ||
        router.query.data_amount != null;
      if (hadOptionQuery) {
        const safeQuery = sanitizeProductQueryForUrl({
          ...router.query,
          ...(initialAttrs.telecom ? { telecom: initialAttrs.telecom } : {}),
          ...(initialAttrs.days ? { days: initialAttrs.days } : {}),
          ...(initialAttrs.data_amount
            ? { data_amount: initialAttrs.data_amount }
            : {}),
        });
        const same =
          String(router.query.telecom || "") ===
            String(safeQuery.telecom || "") &&
          String(router.query.days || "") === String(safeQuery.days || "") &&
          String(router.query.data_amount || "") ===
            String(safeQuery.data_amount || "");
        if (!same) {
          router.replace(
            { pathname: router.pathname, query: safeQuery },
            undefined,
            { shallow: true },
          );
        }
      }
    }
  }, [router.isReady, variations]);

  // 2. 匹配變體與價格
  useEffect(() => {
    if (variations.length > 0) {
      const match = variations.find((v) => {
        const opts = getVariationOptionAttrs(v);
        return ["telecom", "days", "data_amount"].every((key) => {
          if (selectedAttributes[key] == null || selectedAttributes[key] === "")
            return true;
          return String(opts[key] ?? "") === String(selectedAttributes[key]);
        });
      });
      setCurrentVariation(match || null);
    }
  }, [selectedAttributes, variations]);

  // 🌟 嚴格防呆：檢查三個規格是否「全部」都已選取
  const isAllOptionsSelected = !!(
    selectedAttributes.telecom &&
    selectedAttributes.days &&
    selectedAttributes.data_amount
  );
  const canPurchase =
    isAllOptionsSelected && currentVariation && currentVariation.price > 0;

  const availableCarriers = useMemo(
    () => [
      ...new Set(
        variations
          .map((v) => getVariationOptionAttrs(v).telecom)
          .filter(Boolean),
      ),
    ],
    [variations],
  );

  const availableDays = useMemo(() => {
    const currentTelecom = selectedAttributes["telecom"];
    const filteredVariations = currentTelecom
      ? variations.filter(
          (v) => getVariationOptionAttrs(v).telecom === currentTelecom,
        )
      : variations;
    const days = [
      ...new Set(
        filteredVariations
          .map((v) => getVariationOptionAttrs(v).days)
          .filter(Boolean),
      ),
    ];
    return days.sort(
      (a, b) => (parseInt(String(a), 10) || 0) - (parseInt(String(b), 10) || 0),
    );
  }, [variations, selectedAttributes["telecom"]]);

  const availableData = useMemo(() => {
    const currentTelecom = selectedAttributes["telecom"];
    const currentDays = selectedAttributes["days"];
    let filtered = variations;
    if (currentTelecom)
      filtered = filtered.filter(
        (v) => getVariationOptionAttrs(v).telecom === currentTelecom,
      );
    if (currentDays)
      filtered = filtered.filter(
        (v) => String(getVariationOptionAttrs(v).days) === String(currentDays),
      );
    return [
      ...new Set(
        filtered
          .map((v) => getVariationOptionAttrs(v).data_amount)
          .filter(Boolean),
      ),
    ].sort(compareDataAmountsAsc);
  }, [variations, selectedAttributes["telecom"], selectedAttributes["days"]]);

  const handleAttributeSelect = (name, option) => {
    let newAttrs = { ...selectedAttributes, [name]: option };
    let newQuery = sanitizeProductQueryForUrl({
      ...router.query,
      [name]: option,
    });

    setSelectedAttributes(newAttrs);
    router.push({ pathname: router.pathname, query: newQuery }, undefined, {
      shallow: true,
    });
  };

  /** 流量估算器：本商品直接套用；其他商品則導向該商品頁並帶入規格 */
  const handleEstimatorSelectVariant = ({
    telecom,
    days,
    data_amount,
    productSlug,
    isCurrentProduct,
    categoryHandle: planCategory,
  }) => {
    const patch = {};
    if (telecom != null && telecom !== "") patch.telecom = telecom;
    if (days != null && days !== "") patch.days = days;
    if (data_amount != null && data_amount !== "")
      patch.data_amount = data_amount;

    setIsEstimatorOpen(false);

    const sameProduct =
      isCurrentProduct ||
      !productSlug ||
      String(productSlug) === String(product?.slug);

    if (!sameProduct) {
      const cat = planCategory || router.query.category || "china";
      const q = buildProductOptionQuery(patch);

      const href =
        isPartnerShell && store?.domain
          ? `/p/${store.domain}/${productSlug}${q ? `?${q}` : ""}`
          : `/product/${cat}/${productSlug}${q ? `?${q}` : ""}`;

      if (typeof window !== "undefined") {
        window.open(href, "_blank", "noopener,noreferrer");
      }
      return;
    }

    const newAttrs = { ...selectedAttributes, ...patch };
    const newQuery = sanitizeProductQueryForUrl({
      ...router.query,
      ...patch,
    });
    setSelectedAttributes(newAttrs);
    router.push({ pathname: router.pathname, query: newQuery }, undefined, {
      shallow: true,
    });

    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        document
          .getElementById("product-options")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleAddToCart = () => {
    if (!currentVariation) return;
    const specLabel = [
      selectedAttributes.telecom,
      selectedAttributes.days ? `${selectedAttributes.days}天` : null,
      selectedAttributes.data_amount,
    ]
      .filter(Boolean)
      .join(" · ");

    addToCart({
      id: currentVariation.id,
      variant_id: currentVariation.id,
      parentId: product.id,
      name: product.name,
      price: currentVariation.price,
      sku: currentVariation.sku,
      planId: currentVariation.plan_id,
      image: product.image_url || "/images/jeko-esim.png",
      slug: product.slug || product.handle,
      categorySlug:
        router.query.category ||
        product.category_slug ||
        product.categories?.[0]?.slug ||
        "japan",
      quantity,
      options: specLabel,
      specLabel,
      type: "esim",
      ...(isPartnerShell
        ? {
            store_id: store.id,
          }
        : {}),
    });
    window.dispatchEvent(new Event("open-cart-sidebar"));
  };

  const performBuyNow = () => {
    handleAddToCart();
    if (isPartnerShell) {
      router.push(`/p/${store.domain}/cart/`);
    } else {
      router.push("/Cart");
    }
  };

  const finalizePurchaseAction = (action) => {
    setCoverageContinueAction(null);
    setCoveragePromptOpen(false);
    setIijApnPromptOpen(false);
    setAuApnPromptOpen(false);
    setSoftbankApnPromptOpen(false);
    setPendingPurchaseAction(null);
    if (action === "buy") performBuyNow();
    else handleAddToCart();
  };

  /** 涵蓋確認後／略過涵蓋後：IIJ / SoftBank 手動 APN 再跳提醒 */
  const continueAfterCoverageOrDirect = (action) => {
    const telecom = selectedAttributes?.telecom;
    if (isIijDocomoTelecom(telecom)) {
      setPendingPurchaseAction(action);
      setIijApnPromptOpen(true);
      return;
    }
    if (isSoftBankManualApnTelecom(telecom)) {
      setPendingPurchaseAction(action);
      setSoftbankApnPromptOpen(true);
      return;
    }
    finalizePurchaseAction(action);
  };

  const executePurchaseAction = (action) => {
    if (product?.id) markCoverageAck(product.id);
    setCoverageContinueAction(null);
    setCoveragePromptOpen(false);
    continueAfterCoverageOrDirect(action);
  };

  const requestPurchase = (action) => {
    if (!canPurchase) return;
    const telecom = selectedAttributes?.telecom;
    const days = selectedAttributes?.days;

    // 總量「用完斷網」：加入購物車／購買前必顯示提示
    if (isDataExhaustTerminateVariant(currentVariation)) {
      setPendingPurchaseAction(action);
      setDataExhaustPromptOpen(true);
      return;
    }

    // 需手動 APN：略過收訊熱點圖 popup，改彈 APN 提醒
    if (needsAuKddiManualApnReminder(telecom, days)) {
      setPendingPurchaseAction(action);
      setAuApnPromptOpen(true);
      return;
    }
    if (isIijDocomoTelecom(telecom)) {
      setPendingPurchaseAction(action);
      setIijApnPromptOpen(true);
      return;
    }
    if (isSoftBankManualApnTelecom(telecom)) {
      setPendingPurchaseAction(action);
      setSoftbankApnPromptOpen(true);
      return;
    }

    const coverageCountry = resolveCoverageCountry(
      product,
      router.query.category ||
        product?.category_slug ||
        product?.categories?.[0]?.handle ||
        "",
    );
    if (!coverageCountry || hasCoverageAck(product?.id)) {
      continueAfterCoverageOrDirect(action);
      return;
    }
    setPendingPurchaseAction(action);
    setCoveragePromptOpen(true);
  };

  const handleBuyNow = () => {
    requestPurchase("buy");
  };

  const handleAddToCartClick = () => {
    requestPurchase("cart");
  };

  const handleViewCoverageFromPrompt = () => {
    const action = pendingPurchaseAction;
    setCoveragePromptOpen(false);
    setPendingPurchaseAction(null);
    if (action) setCoverageContinueAction(action);
    requestAnimationFrame(() => {
      document
        .getElementById("network-coverage")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const carrierName = selectedAttributes["telecom"] || "default";
  const activeCarrierInfo =
    CARRIER_INFO_MAP[carrierName] || CARRIER_INFO_MAP.default;
  const marketingConfig = activeCarrierInfo.marketingBox;
  const introBullets = resolveIntroBullets(product, carrierName);
  const actualExperience = resolveActualExperience(product, carrierName);
  const overviewNotices = resolveOverviewNotices(product, carrierName);
  const carrierSpecItems = useMemo(() => {
    const specs = resolveCarrierSpecs(product, carrierName, currentVariation);
    return buildCarrierSpecDisplayItems(specs);
  }, [product, carrierName, currentVariation]);

  const showCarrierSpecsPanel =
    !!carrierName && carrierName !== "default" && carrierSpecItems.length > 0;

  /**
   * 副標題：優先依電信商顯示。
   * 「漫遊／原生」只標在下方規格卡 route_type，上方文案不重複標「漫遊」。
   */
  const displaySubtitle = useMemo(() => {
    const stripRoamingLabel = (text) => {
      if (!text) return text;
      return stripInternalMarginFromSubtitle(
        String(text)
          .replace(/^漫遊每日型/u, "每日型")
          .replace(/^漫遊總量型/u, "總量型")
          .replace(/^漫遊[：:・‧·\s]+/u, "")
          .replace(/^漫遊/u, "")
          .trim(),
      );
    };

    const telecom = String(selectedAttributes.telecom || "").trim();
    if (!telecom) return null;

    const byCarrier = {
      ...parseSubtitleByCarrier(product?.metadata?.subtitle_by_carrier),
      ...parseSubtitleByCarrier(product?.subtitle_by_carrier),
    };

    if (byCarrier[telecom]) return stripRoamingLabel(byCarrier[telecom]);

    // URL／選項括號全半形差異時模糊比對（略過單一字元／純數字 key，避免 JSON 字串被 spread 後 "0"→"{"）
    const hit = Object.entries(byCarrier).find(([key]) => {
      if (!key || key.length < 2 || /^\d+$/.test(key)) return false;
      const norm = (s) =>
        String(s)
          .replace(/[（）]/g, (c) => (c === "（" ? "(" : ")"))
          .replace(/\s+/g, "");
      return (
        norm(key) === norm(telecom) ||
        key.includes(telecom) ||
        telecom.includes(key)
      );
    });
    if (hit) return stripRoamingLabel(hit[1]);

    if (/LG\s*U\+|Promo/i.test(telecom) && byCarrier["LG U+ / SK電信"]) {
      return stripRoamingLabel(byCarrier["LG U+ / SK電信"]);
    }
    if (/韓國\s*IP|SK電信/i.test(telecom) && byCarrier["SK電信（韓國IP）"]) {
      return stripRoamingLabel(byCarrier["SK電信（韓國IP）"]);
    }

    if (/GPT|TikTok|ChatGPT/i.test(telecom)) {
      return stripRoamingLabel(
        byCarrier[telecom] || "支援 TikTok 與 ChatGPT",
      );
    }
    const attrs = currentVariation?.attributes || {};
    if (attrs.gpt === true && attrs.tiktok === true) {
      return stripRoamingLabel(
        byCarrier[telecom] || "支援 TikTok 與 ChatGPT",
      );
    }
    if (/50-70|70Mbps|常規速度/i.test(telecom)) {
      return "常規速度 50–70Mbps 吃到飽";
    }
    if (/-B0$/i.test(String(currentVariation?.sku || ""))) {
      return "常規速度 50–70Mbps 吃到飽";
    }
    return null;
  }, [
    selectedAttributes.telecom,
    currentVariation,
    product?.subtitle,
    product?.subtitle_by_carrier,
    product?.metadata?.subtitle_by_carrier,
  ]);

  const priceSavings = useMemo(() => {
    if (
      !currentVariation?.original_price ||
      !currentVariation?.price ||
      currentVariation.original_price <= currentVariation.price
    ) {
      return 0;
    }
    return currentVariation.original_price - currentVariation.price;
  }, [currentVariation]);

  const formatTelecomLabel = (opt) => {
    const s = String(opt || "").trim();
    if (!s) return s;
    // 中港澳 T+C：方案類型按鈕標中英文電信商
    const cnhkmoTc = {
      每日型: true,
      總量型: true,
      吃到飽: true,
    };
    if (cnhkmoTc[s]) {
      return (
        <span className="flex flex-col gap-0.5 text-left">
          <span className="font-semibold leading-snug">
            {s}｜中國電信／聯通／CSL／澳門電訊
          </span>
          <span className="text-[11px] font-normal leading-snug text-slate-500">
            China Telecom / China Unicom / CSL / CTM
          </span>
        </span>
      );
    }
    if (s === "中國電信／聯通／CSL／澳門電訊") {
      return (
        <span className="flex flex-col gap-0.5 text-left">
          <span className="font-semibold leading-snug">{s}</span>
          <span className="text-[11px] font-normal leading-snug text-slate-500">
            China Telecom / China Unicom / CSL / CTM
          </span>
        </span>
      );
    }
    if (/Tiktok\+ChatGPT|常規速度|50-70|GPT\s*\+\s*TikTok/i.test(s)) return s;
    // 括號內改中文電信商名（勿顯示 CMCC／CUCC 英文代號給客人）
    if (/\(\s*CMCC\s*\+?\s*\)/i.test(s))
      return s.replace(/\(\s*CMCC\s*\+?\s*\)/i, "(中國移動)");
    if (/\(\s*CUCC\s*\+?\s*\)/i.test(s))
      return s.replace(/\(\s*CUCC\s*\+?\s*\)/i, "(中國聯通)");
    if (/\(\s*中國移動\s*\)/.test(s) || /\(\s*中國聯通\s*\)/.test(s)) return s;
    if (/中國移動|CMCC/i.test(s)) return `${s} (中國移動)`;
    if (/中國聯通|CUCC|Unicom/i.test(s)) return `${s} (中國聯通)`;
    // 僅去掉尾端／「雙切換」前的 4G/5G（保留「UMobile 5G 當地」這類名稱內的 5G）
    return s
      .replace(/\s*[45]G(?:\s*\/\s*[45]G)?(?=\s*雙切換\s*$)/gi, "")
      .replace(/\s*[45]G(?:\s*\/\s*[45]G)?\s*$/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  };

  const renderDataAmountOptionLabel = (opt, { compact = false } = {}) => {
    if (!is5MbpsDataAmount(opt)) return opt;
    const main = formatDataAmountMain(opt) || opt;
    if (compact) return `${main}（5Mbps續航）`;
    return (
      <span className="flex items-center justify-between gap-2 w-full">
        <span>{main}</span>
        <SpeedInfoChip
          speedId="5mbps"
          label="5Mbps"
          className="shrink-0 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
        >
          5Mbps續航
        </SpeedInfoChip>
      </span>
    );
  };

  // 一律用按鈕網格（含 5Mbps續航 標籤），避免下拉選單把續航選項藏起來
  const useDataAmountButtons = availableData.length > 0;

  const telecomSectionHint = (() => {
    const tags = [];
    if (availableCarriers.some((c) => /中國移動|CMCC/i.test(String(c)))) {
      tags.push("中國移動");
    }
    if (
      availableCarriers.some((c) => /中國聯通|CUCC|Unicom/i.test(String(c)))
    ) {
      tags.push("中國聯通");
    }
    return tags.length ? ` ( ${tags.join(" / ")} )` : "";
  })();

  const choiceSummary = [
    selectedAttributes.telecom
      ? (() => {
          const t = String(selectedAttributes.telecom);
          if (t === "每日型" || t === "總量型" || t === "吃到飽") {
            return `${t}｜中國電信／聯通／CSL／澳門電訊`;
          }
          const label = formatTelecomLabel(t);
          return typeof label === "string" ? label : t;
        })()
      : null,
    selectedAttributes.days ? `${selectedAttributes.days}天` : null,
    selectedAttributes.data_amount,
  ]
    .filter(Boolean)
    .join(" | ");

  const variantBtnClass = (selected) =>
    selected
      ? isPartnerShell
        ? "border-2 border-[#0A6CD0] bg-white text-slate-900 font-semibold shadow-[0_0_0_1px_rgba(10,108,208,0.12)]"
        : "border-2 border-[#00befa] bg-white text-slate-900 font-semibold"
      : "border border-gray-200 bg-white text-slate-700 hover:border-gray-300";

  const PRODUCT_BLUE = "#0A6CD0";

  const displayPrice =
    isAllOptionsSelected && currentVariation?.price > 0
      ? currentVariation.price
      : null;
  const displayTotal = displayPrice != null ? displayPrice * quantity : null;

  // 滾過頁內購買區後才顯示底部固定規格／購買列
  useEffect(() => {
    const update = () => {
      const nodes = document.querySelectorAll("[data-product-buy-cta]");
      if (!nodes.length) {
        setShowStickyBuy(false);
        return;
      }
      let scrolledPast = false;
      let stillVisible = false;
      nodes.forEach((n) => {
        const r = n.getBoundingClientRect();
        if (r.bottom < 0) scrolledPast = true;
        if (r.top < window.innerHeight && r.bottom > 0) stillVisible = true;
      });
      setShowStickyBuy(scrolledPast && !stillVisible);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [product?.id, isPartnerShell, canPurchase]);

  const images = useMemo(
    () =>
      buildProductMediaList({
        thumbnail: product?.image_url,
        imageUrls: product?.image_urls || [],
        name: product?.name,
      }),
    [product],
  );

  const openGalleryLightbox = useCallback((index) => {
    setGalleryLightboxIndex(index ?? 0);
    setGalleryLightboxOpen(true);
  }, []);

  const goToGallerySlide = useCallback(
    (idx) => {
      setActiveSlide(idx);
      if (images.length > 1) {
        mainSwiper?.slideToLoop?.(idx, 300) ?? mainSwiper?.slideTo(idx, 300);
      } else {
        mainSwiper?.slideTo(0, 300);
      }
    },
    [mainSwiper, images.length],
  );

  const pageSeo = buildProductSeo(
    { ...product, subtitle: displaySubtitle || "" },
    currentVariation,
    router.query.category,
    { variations },
  );

  const breadcrumbCategorySlug = String(
    router.query.category ||
      product.category_slug ||
      product.categories?.[0]?.handle ||
      "",
  );
  const breadcrumbCategoryLabel = resolveProductCategoryBreadcrumbLabel(
    product,
    breadcrumbCategorySlug,
  );
  const coverageCountry = resolveCoverageCountry(
    product,
    breadcrumbCategorySlug,
  );
  const showNetworkCoverage = Boolean(coverageCountry);

  const documentTitle =
    pageSeo?.title ||
    [
      product?.name,
      displaySubtitle,
      currentVariation?.title && currentVariation.title !== product?.name
        ? currentVariation.title
        : null,
    ]
      .filter(Boolean)
      .join("｜");

  const PageShell = isPartnerShell ? PartnerShopLayout : Layout;
  const categoryHandle =
    product?.category_handle ||
    (typeof router.query.category === "string" ? router.query.category : null);
  const mainProductUrl =
    categoryHandle && product?.slug
      ? absoluteUrl(`/product/${categoryHandle}/${product.slug}`)
      : null;
  const shellProps = isPartnerShell
    ? {
        store,
        title: documentTitle || product?.name,
        description: product?.description,
        seo: {
          pageType: "Product",
          ogType: "product",
          path: String(product?.slug || product?.handle || ""),
          product: {
            name: product?.name,
            description: product?.description,
            image: product?.thumbnail || product?.images?.[0],
            images: product?.images,
          },
          mainProductUrl,
          breadcrumbs: [
            { name: "Jeko eSIM", path: "/" },
            {
              name: store?.store_name || "夥伴賣場",
              path: `/p/${store?.domain}/`,
            },
            {
              name: product?.name || "商品",
              path: `/p/${store?.domain}/${product?.slug || product?.handle || ""}/`,
            },
          ],
        },
      }
    : { seo: pageSeo };

  if (router.isFallback || !product) {
    return <PageShell {...shellProps}>載入中...</PageShell>;
  }

  return (
    <SpeedScenarioProvider>
    <>
      <PageShell {...shellProps}>
        <CompatibilityModal
          isOpen={isCompatOpen}
          onClose={() => setIsCompatOpen(false)}
        />
        <DataEstimatorModal
          isOpen={isEstimatorOpen}
          onClose={() => setIsEstimatorOpen(false)}
          destination={getEstimatorDestinationLabel(
            product,
            router.query.category,
          )}
          productName={product?.name}
          variations={variations}
          comparablePlans={liveComparablePlans}
          preferredTelecom={selectedAttributes?.telecom || ""}
          onSelectVariant={handleEstimatorSelectVariant}
        />
        <CoveragePromptModal
          isOpen={coveragePromptOpen}
          country={coverageCountry}
          purchaseAction={pendingPurchaseAction || "cart"}
          onClose={() => {
            setCoveragePromptOpen(false);
            setPendingPurchaseAction(null);
          }}
          onViewCoverage={handleViewCoverageFromPrompt}
          onContinuePurchase={() =>
            executePurchaseAction(pendingPurchaseAction || "cart")
          }
        />
        <IijApnReminderModal
          isOpen={iijApnPromptOpen}
          purchaseAction={pendingPurchaseAction || "cart"}
          onClose={() => {
            setIijApnPromptOpen(false);
            setPendingPurchaseAction(null);
          }}
          onContinuePurchase={() =>
            finalizePurchaseAction(pendingPurchaseAction || "cart")
          }
        />
        <AuKddiApnReminderModal
          isOpen={auApnPromptOpen}
          purchaseAction={pendingPurchaseAction || "cart"}
          onClose={() => {
            setAuApnPromptOpen(false);
            setPendingPurchaseAction(null);
          }}
          onContinuePurchase={() =>
            finalizePurchaseAction(pendingPurchaseAction || "cart")
          }
        />
        <SoftBankApnReminderModal
          isOpen={softbankApnPromptOpen}
          purchaseAction={pendingPurchaseAction || "cart"}
          onClose={() => {
            setSoftbankApnPromptOpen(false);
            setPendingPurchaseAction(null);
          }}
          onContinuePurchase={() =>
            finalizePurchaseAction(pendingPurchaseAction || "cart")
          }
        />
        <DataExhaustReminderModal
          isOpen={dataExhaustPromptOpen}
          purchaseAction={pendingPurchaseAction || "cart"}
          dataLabel={
            selectedAttributes?.data_amount
              ? `${selectedAttributes.telecom || ""} · ${selectedAttributes.days || ""} · ${selectedAttributes.data_amount}`
              : ""
          }
          onClose={() => {
            setDataExhaustPromptOpen(false);
            setPendingPurchaseAction(null);
          }}
          onContinuePurchase={() => {
            setDataExhaustPromptOpen(false);
            finalizePurchaseAction(pendingPurchaseAction || "cart");
          }}
        />

        <div className="bg-white">
          <div
            className={`${
              isPartnerShell
                ? "max-w-[1100px] mx-auto"
                : "max-w-[1280px] mx-auto"
            } px-4 sm:px-6 pt-3 sm:pt-4 pb-16 lg:pb-20`}
          >
            {isPartnerShell ? (
              <nav className="text-xs text-slate-400 mb-3 tracking-wide flex items-center gap-1.5 flex-wrap">
                <a
                  href={`/p/${store.domain}/`}
                  className="hover:text-[#0A6CD0]"
                >
                  {store.store_name || "賣場首頁"}
                </a>
                <MaterialIcon name="chevron_right" size={14} />
                <span className="text-slate-600 truncate max-w-[240px]">
                  {product.name}
                </span>
              </nav>
            ) : (
              <nav className="text-xs text-gray-400 mb-3 tracking-wide flex items-center gap-1.5 flex-wrap">
                <Link href="/product" className="hover:text-[#00befa]">
                  商店
                </Link>
                <span>/</span>
                {breadcrumbCategorySlug ? (
                  <Link
                    href={`/product/${breadcrumbCategorySlug}`}
                    className="hover:text-[#00befa]"
                  >
                    {breadcrumbCategoryLabel}
                  </Link>
                ) : (
                  <span className="text-gray-500">
                    {breadcrumbCategoryLabel}
                  </span>
                )}
                <span>/</span>
                <span className="text-gray-600 truncate max-w-[280px]">
                  {product.name}
                </span>
              </nav>
            )}

            <section
              id="purchase-section"
              className={
                isPartnerShell
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 mb-14 lg:mb-16"
                  : "grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-8 lg:gap-12 mb-16 lg:mb-20"
              }
            >
              {/* ========== 左：媒體畫廊 ========== */}
              <div className="w-full lg:sticky lg:top-24 lg:self-start">
                <div
                  className={`relative bg-white overflow-hidden group ${
                    isPartnerShell
                      ? "border border-slate-100"
                      : "border border-gray-100"
                  }`}
                >
                  {priceSavings > 0 &&
                    (isPartnerShell ? (
                      <div
                        className="absolute top-3 left-3 z-20 text-white text-[11px] font-bold px-2.5 py-1"
                        style={{ background: "#0A6CD0" }}
                      >
                        省 NT${priceSavings}
                      </div>
                    ) : (
                      <div
                        className="absolute top-0 left-0 z-20 text-white text-[11px] font-bold leading-tight shadow-md"
                        style={{
                          background: ANKER_BLUE,
                          clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)",
                          padding: "10px 28px 10px 12px",
                        }}
                      >
                        省 NT${priceSavings}
                      </div>
                    ))}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 right-3 z-20 bg-black/50 text-white text-xs font-medium px-2.5 py-1">
                      {activeSlide + 1}/{images.length}
                    </div>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          mainSwiper?.slidePrev();
                        }}
                        aria-label="上一張"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                      >
                        <MaterialIcon name="chevron_left" size={22} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          mainSwiper?.slideNext();
                        }}
                        aria-label="下一張"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 shadow-md border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                      >
                        <MaterialIcon name="chevron_right" size={22} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => openGalleryLightbox(activeSlide)}
                    className="absolute top-3 right-3 z-20 w-9 h-9 bg-white/90 border border-gray-100 shadow-sm flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity sm:opacity-100"
                    aria-label="放大檢視"
                  >
                    <MaterialIcon name="fullscreen" size={16} />
                  </button>

                  <Swiper
                    onSwiper={setMainSwiper}
                    loop={images.length > 1}
                    modules={[Navigation]}
                    slidesPerView={1}
                    spaceBetween={0}
                    centeredSlides={false}
                    watchOverflow
                    onSlideChange={(swiper) => setActiveSlide(swiper.realIndex)}
                    className="w-full product-main-swiper !h-[min(52vh,460px)] bg-white"
                  >
                    {images.map((item, idx) => (
                      <SwiperSlide key={idx}>
                        {item.type === "video" ? (
                          <div
                            className="relative block w-full h-full bg-black flex items-center justify-center"
                            aria-label={`播放第 ${idx + 1} 部影片`}
                          >
                            <ProductMediaSlide
                              item={item}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openGalleryLightbox(idx)}
                            className={`relative block w-full h-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                              isPartnerShell
                                ? "focus-visible:ring-[#0A6CD0]"
                                : "focus-visible:ring-[#00befa]"
                            }`}
                            aria-label={`放大檢視第 ${idx + 1} 張圖片`}
                          >
                            <ProductMediaSlide
                              item={{
                                ...item,
                                alt:
                                  item.alt ||
                                  `${product.name || "商品"} 第 ${idx + 1} 張`,
                              }}
                              fill
                              className="object-contain pointer-events-none"
                              priority={idx === 0}
                            />
                          </button>
                        )}
                      </SwiperSlide>
                    ))}
                  </Swiper>
                </div>

                {/* 縮圖列（單行） */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
                    {images.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => goToGallerySlide(idx)}
                        className={`relative shrink-0 w-[64px] h-[80px] sm:w-[72px] sm:h-[90px] overflow-hidden border-2 transition-all ${
                          activeSlide === idx
                            ? isPartnerShell
                              ? "border-[#0A6CD0]"
                              : "border-[#00befa]"
                            : "border-gray-200 hover:border-gray-400"
                        }`}
                        aria-label={`第 ${idx + 1} 個媒體`}
                        aria-current={activeSlide === idx ? "true" : undefined}
                      >
                        {item.type === "video" ? (
                          <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                            <MaterialIcon
                              name="play_circle"
                              size={28}
                              className="text-white"
                            />
                          </div>
                        ) : (
                          <SafeImage
                            src={item.src}
                            alt={item.alt || `${product.name || "商品"} 縮圖 ${idx + 1}`}
                            fill
                            sizes="80px"
                            className="object-contain bg-white"
                            unoptimized={shouldBypassImageOptimization(
                              item.src,
                            )}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <MediaGalleryLightbox
                  isOpen={galleryLightboxOpen}
                  onClose={(idx) => {
                    setGalleryLightboxOpen(false);
                    if (typeof idx === "number") goToGallerySlide(idx);
                  }}
                  images={images}
                  productName={product.name}
                  initialIndex={galleryLightboxIndex}
                  ariaLabel="商品圖片檢視"
                />

                <div className="mt-4 inline-flex rounded-full border border-gray-200 p-0.5 bg-white">
                  <button
                    type="button"
                    onClick={() => setMediaTab("overview")}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      mediaTab === "overview"
                        ? "bg-slate-900 text-white"
                        : "text-gray-600 hover:text-slate-900"
                    }`}
                  >
                    <MaterialIcon
                      name="view_agenda"
                      size={14}
                      className="opacity-80"
                    />
                    概覽
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMediaTab("specs");
                      document
                        .getElementById("product-tabs")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                      mediaTab === "specs"
                        ? "bg-slate-900 text-white"
                        : "text-gray-600 hover:text-slate-900"
                    }`}
                  >
                    <MaterialIcon name="install_mobile" size={14} />
                    安裝說明
                  </button>
                </div>

                {mediaTab === "overview" && (
                  <ProductOverviewNotices
                    notices={overviewNotices}
                    carrierFallback={marketingConfig}
                    product={product}
                    carrier={carrierName}
                    onProductUpdate={(patch) =>
                      setProduct((prev) => ({ ...prev, ...patch }))
                    }
                  />
                )}
              </div>

              {isPartnerShell ? (
                <div className="w-full flex flex-col">
                  <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-slate-900 leading-snug tracking-tight mb-1.5">
                    {product.name}
                  </h1>
                  {displaySubtitle ? (
                    <p className="text-[14px] sm:text-[15px] font-semibold text-[#0A6CD0] leading-snug mb-1">
                      {displaySubtitle}
                    </p>
                  ) : null}
                  {isAllOptionsSelected && currentVariation?.title ? (
                    <p className="text-[14px] sm:text-[15px] font-medium text-slate-500 leading-snug mb-3">
                      {currentVariation.title}
                    </p>
                  ) : (
                    <div className="mb-3" />
                  )}

                  <ProductRatingBadge
                    productId={product.id}
                    href="#product-reviews"
                    className="mb-4"
                    starColor="text-[#3B9EFF]"
                  />

                  {introBullets[0] ? (
                    <p className="product-seo-summary text-[15px] font-bold text-[#0A6CD0] leading-relaxed mb-2">
                      <FeatureBulletText>{introBullets[0]}</FeatureBulletText>
                    </p>
                  ) : null}

                  <div className="text-[13px] sm:text-sm text-slate-600 leading-relaxed mb-3 space-y-1.5">
                    {(introBullets.length > 1
                      ? introBullets.slice(1, 4)
                      : []
                    ).map((line, i) => (
                      <p key={i}>
                        <FeatureBulletText>{line}</FeatureBulletText>
                      </p>
                    ))}
                    {introBullets.length === 0 && product.description ? (
                      <p className="line-clamp-3">
                        {String(product.description)
                          .replace(/<[^>]+>/g, " ")
                          .trim()}
                      </p>
                    ) : null}
                  </div>

                  <ProductActualExperience text={actualExperience} />

                  <p className="text-xs text-slate-400 mb-5">
                    ID: {currentVariation?.sku || product.slug || product.id}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="inline-block bg-sky-50 text-[#0A6CD0] text-[11px] font-bold px-2.5 py-1 rounded-md">
                      eSIM
                    </span>
                    {activeCarrierInfo.badges?.map((b, i) => {
                      const speedId = resolveSpeedScenarioId(b.text);
                      const typeSpeedId = resolveSpeedScenarioId(b.type);
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700"
                        >
                          {speedId ? (
                            <SpeedInfoChip
                              speedId={speedId}
                              label={b.text}
                              className="text-[11px] font-bold text-slate-700"
                            >
                              {b.text}
                            </SpeedInfoChip>
                          ) : (
                            <span>{b.text}</span>
                          )}
                          {b.type ? (
                            typeSpeedId || speedId ? (
                              <SpeedInfoChip
                                speedId={typeSpeedId || speedId}
                                label={b.type === "FUP" ? b.text : b.type}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600"
                              >
                                {b.type}
                              </SpeedInfoChip>
                            ) : (
                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600">
                                {b.type}
                              </span>
                            )
                          ) : null}
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCompatOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A6CD0] hover:underline ml-auto"
                    >
                      <MaterialIcon name="phonelink_setup" size={15} />
                      檢查相容性
                    </button>
                  </div>

                  <ProductPromoOfferBanner
                    product={product}
                    carrierName={carrierName}
                    isAdmin={isAdmin}
                    adminChecked={adminChecked}
                    authHeaders={authHeaders}
                    suppressCustomerBanner={suppressProductPromo}
                    onSaved={(promoMap) =>
                      setProduct((prev) => ({
                        ...prev,
                        promo_offer_by_carrier: promoMap,
                      }))
                    }
                  />

                  {/* 規格選擇 */}
                  {availableCarriers.length > 0 && (
                    <div id="product-options" className="mb-5 scroll-mt-24">
                      <span className="text-xs font-bold text-slate-500 block mb-2.5">
                        電信商{telecomSectionHint}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableCarriers.map((opt) => (
                          <div key={opt} className="relative">
                            {isHotSaleTelecom(
                              product.hot_sale_telecoms,
                              opt,
                            ) ? (
                              <Image
                                src="/images/hot-sale.png"
                                alt="熱銷推薦"
                                width={56}
                                height={56}
                                className="absolute -top-3 right-3 z-10 w-14 pointer-events-none drop-shadow-sm"
                                style={{ width: "auto", height: "auto" }}
                              />
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                handleAttributeSelect("telecom", opt)
                              }
                              className={`w-full px-4 py-3.5 text-sm rounded-xl transition-all text-left ${variantBtnClass(selectedAttributes["telecom"] === opt)}`}
                            >
                              {formatTelecomLabel(opt)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableDays.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-slate-500 block mb-2.5">
                        天數
                      </span>
                      <div className="relative sm:hidden">
                        <select
                          id="product-days-select-mobile"
                          value={String(selectedAttributes["days"] ?? "")}
                          onChange={(e) =>
                            handleAttributeSelect("days", e.target.value)
                          }
                          className={`w-full h-[50px] pl-4 pr-12 text-[17px] font-medium rounded-xl appearance-none cursor-pointer focus:outline-none ${
                            selectedAttributes["days"]
                              ? "bg-white text-slate-900 border-2 border-[#0A6CD0]"
                              : "bg-white text-slate-500 border border-gray-200"
                          }`}
                        >
                          <option value="" disabled>
                            請選擇天數
                          </option>
                          {availableDays.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt} 天
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                          <MaterialIcon
                            name="expand_more"
                            size={20}
                            className="text-slate-400"
                          />
                        </div>
                      </div>
                      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {availableDays.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAttributeSelect("days", opt)}
                            className={`px-4 py-3.5 text-sm rounded-xl transition-all ${variantBtnClass(String(selectedAttributes["days"]) === String(opt))}`}
                          >
                            {opt} 天
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableData.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-slate-500 block mb-2.5">
                        數據量
                      </span>
                      {!useDataAmountButtons ? (
                        <div className="relative">
                          <select
                            id="product-data-select"
                            value={String(
                              selectedAttributes["data_amount"] ?? "",
                            )}
                            onChange={(e) =>
                              handleAttributeSelect(
                                "data_amount",
                                e.target.value,
                              )
                            }
                            className={`w-full h-[50px] pl-4 pr-12 text-[17px] font-medium rounded-xl appearance-none cursor-pointer focus:outline-none ${
                              selectedAttributes["data_amount"]
                                ? "bg-white text-slate-900 border-2 border-[#0A6CD0]"
                                : "bg-white text-slate-500 border border-gray-200"
                            }`}
                          >
                            <option value="" disabled>
                              請選擇數據量
                            </option>
                            {availableData.map((opt) => (
                              <option key={opt} value={opt}>
                                {renderDataAmountOptionLabel(opt, {
                                  compact: true,
                                })}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                            <MaterialIcon
                              name="expand_more"
                              size={20}
                              className="text-slate-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {availableData.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                handleAttributeSelect("data_amount", opt)
                              }
                              className={`px-4 py-3.5 text-sm rounded-xl transition-all text-left ${variantBtnClass(selectedAttributes["data_amount"] === opt)}`}
                            >
                              {renderDataAmountOptionLabel(opt)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {currentVariation?.tags &&
                    currentVariation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {currentVariation.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-sky-50 text-[#0A6CD0] border border-sky-100 px-2.5 py-1 rounded-full text-xs font-bold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  <AnimatePresence mode="wait">
                    {showCarrierSpecsPanel && (
                      <motion.div
                        key={`specs-${carrierName}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="mb-5 p-4 rounded-xl flex flex-wrap items-center gap-x-6 gap-y-3 text-sm bg-slate-50 border border-gray-100"
                      >
                        {carrierSpecItems
                          .filter((item) =>
                            [
                              "ip_type",
                              "route_type",
                              "network",
                              "speed_rule",
                            ].includes(item.key),
                          )
                          .map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center gap-2 min-w-[7.5rem]"
                            >
                              <MaterialIcon
                                name={item.icon}
                                size={20}
                                className="text-slate-500 shrink-0"
                              />
                              <span className="font-semibold text-slate-700">
                                {item.key === "speed_rule" ? (
                                  <SpeedAwareText text={item.text} />
                                ) : (
                                  item.text
                                )}
                              </span>
                            </div>
                          ))}
                        {carrierSpecItems
                          .filter(
                            (item) =>
                              ![
                                "ip_type",
                                "route_type",
                                "network",
                                "speed_rule",
                              ].includes(item.key),
                          )
                          .map((item) => (
                            <div
                              key={item.key}
                              className={`flex items-center gap-2.5 w-full ${
                                item.fullWidth
                                  ? "pt-3 border-t border-gray-100"
                                  : ""
                              }`}
                            >
                              <MaterialIcon
                                name={item.icon}
                                size={20}
                                className={
                                  item.iconClass || "text-slate-500 shrink-0"
                                }
                              />
                              <span
                                className={`font-semibold text-slate-700 ${
                                  item.fullWidth
                                    ? "text-xs leading-relaxed"
                                    : ""
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 價格 */}
                  <div className="flex flex-wrap items-baseline gap-2 mb-5">
                    <p
                      className={`text-[28px] sm:text-[32px] font-bold tracking-tight ${
                        displayPrice != null
                          ? "text-slate-900"
                          : "text-gray-300"
                      }`}
                    >
                      {displayTotal != null
                        ? `NT$${displayTotal.toLocaleString()}`
                        : displayPrice != null
                          ? `NT$${displayPrice.toLocaleString()}`
                          : "請選擇規格"}
                    </p>
                    {displayPrice != null && (
                      <span className="text-xs text-slate-400">（含稅）</span>
                    )}
                    {priceSavings > 0 && (
                      <span className="inline-block bg-[#0A6CD0] text-white text-xs font-bold px-2.5 py-1 rounded-md">
                        省 NT${priceSavings}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-5 -mt-3">
                    <a
                      href={buildLoginUrl("/account")}
                      className="inline-flex items-center gap-1 font-semibold text-[#0A6CD0] hover:underline"
                    >
                      登入會員享更多優惠
                      <MaterialIcon name="arrow_forward" size={16} />
                    </a>
                  </p>

                  {/* 數量 */}
                  <div className="mb-5">
                    <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden bg-white">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                        aria-label="減少數量"
                      >
                        <MaterialIcon name="remove" size={18} />
                      </button>
                      <div className="w-12 h-11 flex items-center justify-center font-bold text-slate-800 border-x border-gray-100 text-[15px]">
                        {quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                        aria-label="增加數量"
                      >
                        <MaterialIcon name="add" size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-4">
                    {canPurchase
                      ? "現貨供應 — 下單後 Email 寄送 eSIM QR Code"
                      : choiceSummary
                        ? `已選：${choiceSummary}`
                        : "請完整選擇電信商、天數與數據量"}
                  </p>

                  {/* CTA：加入購物車（主）＋ 立即購買（次） */}
                  <div data-product-buy-cta>
                    <button
                      type="button"
                      onClick={handleAddToCartClick}
                      disabled={!canPurchase}
                      className={`w-full h-[52px] font-bold rounded-full text-[15px] text-white transition-all inline-flex items-center justify-center gap-2 mb-3 ${
                        canPurchase
                          ? "hover:opacity-90 shadow-sm"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      style={
                        canPurchase ? { background: PRODUCT_BLUE } : undefined
                      }
                    >
                      <MaterialIcon name="shopping_cart" size={20} />
                      {!isAllOptionsSelected
                        ? "請選規格"
                        : currentVariation?.price > 0
                          ? "加入購物車"
                          : "尚未定價"}
                    </button>

                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!canPurchase}
                      className={`w-full h-[52px] font-bold rounded-full text-[15px] transition-all inline-flex items-center justify-center gap-2 border-2 mb-4 ${
                        canPurchase
                          ? "bg-white hover:bg-sky-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                      }`}
                      style={
                        canPurchase
                          ? { borderColor: PRODUCT_BLUE, color: PRODUCT_BLUE }
                          : undefined
                      }
                    >
                      立即購買
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400">分享商品</span>
                    <div className="flex items-center gap-2">
                      {[
                        { name: "share", label: "分享" },
                        { name: "link", label: "複製連結" },
                      ].map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          aria-label={item.label}
                          onClick={async () => {
                            try {
                              if (
                                item.name === "link" ||
                                item.name === "share"
                              ) {
                                await navigator.clipboard.writeText(
                                  typeof window !== "undefined"
                                    ? window.location.href
                                    : "",
                                );
                              }
                            } catch {
                              /* ignore */
                            }
                          }}
                          className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-sky-50 hover:text-[#0A6CD0] flex items-center justify-center transition"
                        >
                          <MaterialIcon name={item.name} size={16} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <EsimRefundDisclosure compact />
                  </div>

                  <DataEstimatorCta onClick={() => setIsEstimatorOpen(true)} />

                  <ServiceBenefits />
                </div>
              ) : (
                <div className="w-full flex flex-col">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        eSIM
                      </span>
                      {activeCarrierInfo.badges?.map((b, i) => {
                        const speedId = resolveSpeedScenarioId(b.text);
                        const typeSpeedId = resolveSpeedScenarioId(b.type);
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700"
                          >
                            {speedId ? (
                              <SpeedInfoChip
                                speedId={speedId}
                                label={b.text}
                                className="text-[11px] font-bold text-slate-700"
                              >
                                {b.text}
                              </SpeedInfoChip>
                            ) : (
                              <span>{b.text}</span>
                            )}
                            {b.type ? (
                              typeSpeedId || speedId ? (
                                <SpeedInfoChip
                                  speedId={typeSpeedId || speedId}
                                  label={b.type === "FUP" ? b.text : b.type}
                                  className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600"
                                >
                                  {b.type}
                                </SpeedInfoChip>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-600">
                                  {b.type}
                                </span>
                              )
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCompatOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                    >
                      <MaterialIcon name="phonelink_setup" size={16} />
                      檢查相容性
                    </button>
                  </div>

                  <h1 className="text-2xl sm:text-[28px] lg:text-[32px] font-bold text-slate-900 leading-tight tracking-tight mb-1.5">
                    {product.name}
                  </h1>
                  {displaySubtitle ? (
                    <p className="product-seo-summary text-[15px] sm:text-base font-semibold text-[#00befa] leading-snug mb-1">
                      {displaySubtitle}
                    </p>
                  ) : null}
                  {isAllOptionsSelected && currentVariation?.title ? (
                    <p className="text-[15px] sm:text-base font-medium text-slate-500 leading-snug mb-3">
                      {currentVariation.title}
                    </p>
                  ) : (
                    <div className="mb-3" />
                  )}

                  <ProductRatingBadge
                    productId={product.id}
                    href="#product-reviews"
                    className="mb-5"
                    starColor="text-amber-400"
                  />

                  {/* 價格區 */}
                  <div className="flex flex-wrap items-center gap-3 mb-4 pb-5 border-b border-gray-100">
                    <p
                      className={`text-3xl sm:text-4xl font-bold tracking-tight ${
                        isAllOptionsSelected && currentVariation?.price > 0
                          ? "text-slate-900"
                          : "text-gray-300"
                      }`}
                    >
                      {isAllOptionsSelected && currentVariation ? (
                        currentVariation.price > 0 ? (
                          `NT$${currentVariation.price}`
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <MaterialIcon name="warning" size={20} />
                            尚未定價
                          </span>
                        )
                      ) : (
                        "請選擇規格"
                      )}
                    </p>
                    {priceSavings > 0 && (
                      <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                        省 NT${priceSavings}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-5 -mt-2">
                    <a
                      href={buildLoginUrl("/account")}
                      className="inline-flex items-center gap-1 font-semibold hover:underline"
                      style={{ color: ANKER_BLUE }}
                    >
                      登入會員享更多優惠
                      <MaterialIcon name="arrow_forward" size={16} />
                    </a>
                  </p>

                  <ProductPromoOfferBanner
                    product={product}
                    carrierName={carrierName}
                    isAdmin={isAdmin}
                    adminChecked={adminChecked}
                    authHeaders={authHeaders}
                    suppressCustomerBanner={suppressProductPromo}
                    onSaved={(promoMap) =>
                      setProduct((prev) => ({
                        ...prev,
                        promo_offer_by_carrier: promoMap,
                      }))
                    }
                  />

                  {/* Key Features */}
                  <div className="mb-6 border-b border-gray-100 pb-5">
                    <button
                      type="button"
                      onClick={() => setFeaturesOpen((v) => !v)}
                      className="flex w-full items-center justify-between text-left font-bold text-slate-900 mb-3"
                    >
                      <span>重點特色</span>
                      <span
                        className={`text-gray-400 transition-transform inline-flex ${featuresOpen ? "rotate-180" : ""}`}
                      >
                        <MaterialIcon name="expand_more" size={22} />
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {featuresOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <ul className="space-y-2.5 text-sm text-slate-600 leading-relaxed">
                            {introBullets.length > 0 ? (
                              introBullets.map((line, i) => (
                                <li
                                  key={i}
                                  className="flex gap-2 items-start list-none"
                                >
                                  <span className="text-[#00befa] shrink-0 mt-0.5">
                                    •
                                  </span>
                                  <FeatureBulletText className="flex-1 min-w-0">
                                    {line}
                                  </FeatureBulletText>
                                </li>
                              ))
                            ) : (
                              <li className="text-gray-400 text-sm list-none">
                                {carrierName && carrierName !== "default"
                                  ? "此電信商尚未設定重點特色。"
                                  : "請先選擇電信商以查看重點特色。"}
                              </li>
                            )}
                          </ul>
                          <ProductActualExperience text={actualExperience} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 規格選擇（Anker Choice） */}
                  <h2
                    id="product-options"
                    className="text-sm font-bold text-slate-900 mb-4 scroll-mt-24"
                  >
                    方案選擇
                    {choiceSummary ? (
                      <span className="font-normal text-gray-500 ml-1">
                        ：{choiceSummary}
                      </span>
                    ) : null}
                  </h2>

                  {availableCarriers.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">
                        電信商{telecomSectionHint}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableCarriers.map((opt) => (
                          <div key={opt} className="relative">
                            {isHotSaleTelecom(
                              product.hot_sale_telecoms,
                              opt,
                            ) ? (
                              <Image
                                src="/images/hot-sale.png"
                                alt="熱銷推薦"
                                width={56}
                                height={56}
                                className="absolute -top-3 right-3 z-10 w-14 pointer-events-none drop-shadow-sm"
                                style={{ width: "auto", height: "auto" }}
                              />
                            ) : null}
                            <button
                              type="button"
                              onClick={() =>
                                handleAttributeSelect("telecom", opt)
                              }
                              className={`w-full px-4 py-3 text-sm rounded-xl transition-all text-left ${variantBtnClass(selectedAttributes["telecom"] === opt)}`}
                            >
                              {formatTelecomLabel(opt)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableDays.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">
                        天數
                      </span>

                      {/* 手機版：Apple 風格下拉 */}
                      <div className="relative sm:hidden">
                        <select
                          id="product-days-select-mobile"
                          value={String(selectedAttributes["days"] ?? "")}
                          onChange={(e) =>
                            handleAttributeSelect("days", e.target.value)
                          }
                          className={`w-full h-[50px] pl-4 pr-12 text-[17px] font-medium tracking-[-0.01em] rounded-[14px] appearance-none cursor-pointer transition-all duration-200 ease-out active:scale-[0.985] focus:outline-none ${
                            selectedAttributes["days"]
                              ? "bg-white text-slate-900 border border-[#007aff]/30 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_0_0_3px_rgba(0,122,255,0.12)]"
                              : "bg-[#f2f2f7] text-slate-500 border border-black/[0.06] shadow-[inset_0_0.5px_0_rgba(0,0,0,0.06)] focus:bg-white focus:border-[#007aff]/40 focus:shadow-[0_0_0_3px_rgba(0,122,255,0.18)]"
                          }`}
                          style={{ WebkitTapHighlightColor: "transparent" }}
                        >
                          <option value="" disabled>
                            請選擇天數
                          </option>
                          {availableDays.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt} 天
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/[0.05]">
                            <MaterialIcon
                              name="expand_more"
                              size={20}
                              className="text-slate-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 電腦版：原本按鈕網格 */}
                      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {availableDays.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAttributeSelect("days", opt)}
                            className={`px-4 py-3 text-sm rounded-xl transition-all ${variantBtnClass(String(selectedAttributes["days"]) === String(opt))}`}
                          >
                            {opt} 天
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableData.length > 0 && (
                    <div className="mb-5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">
                        數據量
                      </span>
                      {!useDataAmountButtons ? (
                        <div className="relative">
                          <select
                            id="product-data-select-partner"
                            value={String(
                              selectedAttributes["data_amount"] ?? "",
                            )}
                            onChange={(e) =>
                              handleAttributeSelect(
                                "data_amount",
                                e.target.value,
                              )
                            }
                            className={`w-full h-[50px] pl-4 pr-12 text-[17px] font-medium rounded-xl appearance-none cursor-pointer focus:outline-none ${
                              selectedAttributes["data_amount"]
                                ? "bg-white text-slate-900 border-2 border-[#00befa]"
                                : "bg-white text-slate-500 border border-gray-200"
                            }`}
                          >
                            <option value="" disabled>
                              請選擇數據量
                            </option>
                            {availableData.map((opt) => (
                              <option key={opt} value={opt}>
                                {renderDataAmountOptionLabel(opt, {
                                  compact: true,
                                })}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                            <MaterialIcon
                              name="expand_more"
                              size={20}
                              className="text-slate-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {availableData.map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                handleAttributeSelect("data_amount", opt)
                              }
                              className={`px-4 py-3 text-sm rounded-xl transition-all text-left ${variantBtnClass(selectedAttributes["data_amount"] === opt)}`}
                            >
                              {renderDataAmountOptionLabel(opt)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {currentVariation?.tags &&
                    currentVariation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 my-4">
                        {currentVariation.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full text-xs font-bold"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  <AnimatePresence mode="wait">
                    {showCarrierSpecsPanel && (
                      <motion.div
                        key={`specs-main-${carrierName}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="my-5 p-4 rounded-xl flex flex-wrap items-center gap-x-6 gap-y-3 text-sm bg-slate-50 border border-gray-100"
                      >
                        {carrierSpecItems
                          .filter((item) =>
                            [
                              "ip_type",
                              "route_type",
                              "network",
                              "speed_rule",
                            ].includes(item.key),
                          )
                          .map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center gap-2 min-w-[7.5rem]"
                            >
                              <MaterialIcon
                                name={item.icon}
                                size={20}
                                className="text-slate-500 shrink-0"
                              />
                              <span className="font-semibold text-slate-700">
                                {item.key === "speed_rule" ? (
                                  <SpeedAwareText text={item.text} />
                                ) : (
                                  item.text
                                )}
                              </span>
                            </div>
                          ))}
                        {carrierSpecItems
                          .filter(
                            (item) =>
                              ![
                                "ip_type",
                                "route_type",
                                "network",
                                "speed_rule",
                              ].includes(item.key),
                          )
                          .map((item) => (
                            <div
                              key={item.key}
                              className={`flex items-center gap-2.5 w-full ${
                                item.fullWidth
                                  ? "pt-3 border-t border-gray-100"
                                  : ""
                              }`}
                            >
                              <MaterialIcon
                                name={item.icon}
                                size={20}
                                className={
                                  item.iconClass || "text-slate-500 shrink-0"
                                }
                              />
                              <span
                                className={`font-semibold text-slate-700 ${
                                  item.fullWidth
                                    ? "text-xs leading-relaxed"
                                    : ""
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 數量 */}
                  <div className="mb-6">
                    <p className="text-sm font-bold text-slate-900 mb-3">
                      數量
                    </p>
                    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white w-[140px]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        aria-label="減少數量"
                      >
                        <MaterialIcon name="remove" size={20} />
                      </button>
                      <div className="flex-1 h-11 flex items-center justify-center font-bold text-slate-800 border-x border-gray-100">
                        {quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50"
                        aria-label="增加數量"
                      >
                        <MaterialIcon name="add" size={20} />
                      </button>
                    </div>
                  </div>

                  {/* 確認您的選擇（Anker Review Your Selections） */}
                  <div className="rounded-xl bg-[#f5f5f5] p-4 sm:p-5 mb-5">
                    <p className="text-sm font-bold text-slate-900 mb-4">
                      確認您的選擇
                    </p>
                    <div className="flex gap-3 sm:gap-4">
                      <div className="relative w-16 sm:w-[72px] aspect-[3/4] shrink-0 overflow-hidden bg-white border border-gray-200">
                        <SafeImage
                          src={images[0]?.src || "/default-image.jpg"}
                          alt={images[0]?.alt || product.name || "已選商品"}
                          fill
                          sizes="72px"
                          className="object-contain p-1"
                          unoptimized={shouldBypassImageOptimization(
                            images[0]?.src || "/default-image.jpg",
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                          {product.name}
                        </p>
                        {displaySubtitle ? (
                          <p className="text-xs font-semibold text-[#00befa] mt-0.5 line-clamp-1">
                            {displaySubtitle}
                          </p>
                        ) : null}
                        <p className="text-xs text-gray-500 mt-1">
                          {choiceSummary || "請選擇方案規格"}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-500 shrink-0">
                        ×{quantity}
                      </span>
                    </div>
                    <p className="text-[11px] font-normal text-slate-400 mt-4">
                      •{" "}
                      {canPurchase
                        ? "現貨供應 — 下單後 Email 寄送 eSIM QR Code"
                        : "請先選擇完整規格以查看供貨狀態"}
                    </p>
                  </div>

                  {/* 價格與雙 CTA（Anker Add to Cart + Buy Now） */}
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    <p
                      className={`text-3xl sm:text-[34px] font-bold tracking-tight ${
                        displayPrice != null
                          ? "text-slate-900"
                          : "text-gray-300"
                      }`}
                    >
                      {displayTotal != null
                        ? `NT$${displayTotal}`
                        : displayPrice != null
                          ? `NT$${displayPrice}`
                          : "請選擇規格"}
                    </p>
                    {priceSavings > 0 && (
                      <span className="inline-block bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded">
                        省 NT${priceSavings}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3" data-product-buy-cta>
                    <button
                      type="button"
                      onClick={handleAddToCartClick}
                      disabled={!canPurchase}
                      className={`h-[52px] font-bold rounded-lg text-[15px] border-2 transition-all ${
                        canPurchase
                          ? "bg-white hover:bg-sky-50"
                          : "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50"
                      }`}
                      style={
                        canPurchase
                          ? { borderColor: ANKER_BLUE, color: ANKER_BLUE }
                          : undefined
                      }
                    >
                      {!isAllOptionsSelected
                        ? "請選規格"
                        : currentVariation?.price > 0
                          ? "加入購物車"
                          : "尚未定價"}
                    </button>
                    <button
                      type="button"
                      onClick={handleBuyNow}
                      disabled={!canPurchase}
                      className={`h-[52px] font-bold rounded-lg text-[15px] text-white transition-all ${
                        canPurchase
                          ? "hover:opacity-90 shadow-md"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                      style={
                        canPurchase ? { background: ANKER_BLUE } : undefined
                      }
                    >
                      立即購買
                    </button>
                  </div>

                  <div className="mt-4">
                    <EsimRefundDisclosure compact />
                  </div>

                  <DataEstimatorCta onClick={() => setIsEstimatorOpen(true)} />

                  <ServiceBenefits />
                </div>
              )}
            </section>

            {showNetworkCoverage ? (
              <NetworkCoverageSection
                country={coverageCountry}
                continuePurchase={
                  coverageContinueAction
                    ? {
                        action: coverageContinueAction,
                        onContinue: () =>
                          executePurchaseAction(coverageContinueAction),
                        onDismiss: () => setCoverageContinueAction(null),
                      }
                    : null
                }
              />
            ) : null}

            <ProductTabs
              product={product}
              selectedCarrier={carrierName}
              onProductUpdate={(patch) =>
                setProduct((prev) => ({ ...prev, ...patch }))
              }
            />
            <ProductReviewsSection
              productId={product.id}
              productTitle={product.name}
              design={isPartnerShell ? "nissin" : "default"}
            />
          </div>
        </div>
      </PageShell>

      {/* 滾過頁內購買區後才出現：規格選擇 + 立即購買（層級低於「我的 eSIM」） */}
      {showStickyBuy && (
        <div
          className="fixed inset-x-0 z-[80] md:hidden border-t border-gray-300 bg-white"
          style={{ bottom: 32 }}
        >
          <div className="mx-auto max-w-lg px-3 pt-2.5 pb-2 space-y-2">
            <div
              className={`grid gap-1.5 ${
                [
                  availableCarriers.length > 0,
                  availableDays.length > 0,
                  availableData.length > 0,
                ].filter(Boolean).length >= 3
                  ? "grid-cols-3"
                  : "grid-cols-2"
              }`}
            >
              {availableCarriers.length > 0 && (
                <label className="min-w-0">
                  <span className="sr-only">電信商</span>
                  <select
                    value={String(selectedAttributes.telecom ?? "")}
                    onChange={(e) =>
                      handleAttributeSelect("telecom", e.target.value)
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-2 pr-6 text-[11px] font-semibold text-slate-800 appearance-none"
                  >
                    <option value="" disabled>
                      電信商
                    </option>
                    {availableCarriers.map((opt) => (
                      <option key={opt} value={opt}>
                        {formatTelecomLabel(opt)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {availableDays.length > 0 && (
                <label className="min-w-0">
                  <span className="sr-only">天數</span>
                  <select
                    value={String(selectedAttributes.days ?? "")}
                    onChange={(e) =>
                      handleAttributeSelect("days", e.target.value)
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-2 pr-6 text-[11px] font-semibold text-slate-800 appearance-none"
                  >
                    <option value="" disabled>
                      天數
                    </option>
                    {availableDays.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} 天
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {availableData.length > 0 && (
                <label className="min-w-0">
                  <span className="sr-only">數據量</span>
                  <select
                    value={String(selectedAttributes.data_amount ?? "")}
                    onChange={(e) =>
                      handleAttributeSelect("data_amount", e.target.value)
                    }
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-2 pr-6 text-[11px] font-semibold text-slate-800 appearance-none"
                  >
                    <option value="" disabled>
                      數據
                    </option>
                    {availableData.map((opt) => (
                      <option key={opt} value={opt}>
                        {renderDataAmountOptionLabel(opt, { compact: true })}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] text-slate-500">
                  {choiceSummary || product.name}
                </p>
                <p className="text-[15px] font-black text-slate-900">
                  {displayTotal != null
                    ? `NT$${Number(displayTotal).toLocaleString()}`
                    : displayPrice != null
                      ? `NT$${Number(displayPrice).toLocaleString()}`
                      : "請選規格"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={!canPurchase}
                className="h-11 shrink-0 rounded-full px-5 text-[13px] font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                style={
                  canPurchase
                    ? { background: isPartnerShell ? ANKER_BLUE : PRODUCT_BLUE }
                    : undefined
                }
              >
                {canPurchase ? "立即購買" : "請選規格"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 預留底部空間 */}
      <div
        className={`md:hidden ${showStickyBuy ? "h-[132px]" : "h-8"}`}
        aria-hidden
      />
    </>
    </SpeedScenarioProvider>
  );
}
