import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useCart } from "../../../components/context/CartContext";
import Layout from "../../Layout";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Navigation, Thumbs } from "swiper/modules";
import { motion, AnimatePresence } from "framer-motion";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/thumbs";

// --- Chart.js ---
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
ChartJS.register(ArcElement, Tooltip, Legend);

// 🚀 導入 Supabase
import { supabase } from "../../../lib/supabaseClient";

// ==========================================
// 1. 靜態資料設定 (保留你原本的所有設定)
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
  "SoftBank / KDDI": {
    badges: [
      { text: "KDDI", type: "5G" },
      { text: "SoftBank", type: "5G" },
    ],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      couponText: "這款 eSIM 加碼 5% 折扣！使用折扣碼：Hello26",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc:
        "每日高速數據用完後，降速至 5Mbps 吃到飽 (高速數據每24小時重置)。",
      note: "注意：我們建議您抵達當地後再安裝 eSIM。",
    },
    summaryPrefix: "SoftBank / KDDI",
  },
  "AU(KDDI)": {
    badges: [{ text: "KDDI", type: "5G" }],
    marketingBox: {
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-100",
      couponText: "這款 eSIM 加碼 5% 折扣！使用折扣碼：Hello26",
      policyTitle: "公平使用政策 (FUP):",
      policyDesc: "無限流量，平均速度8~20Mbps。",
      note: "注意：我們建議您抵達後再新增 eSIM。查看啟用政策。",
    },
    summaryPrefix: "AU(KDDI)",
  },
  "IIJ Docomo": {
    badges: [{ text: "Docomo", type: "4G/LTE" }],
    marketingBox: {
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
      couponText: "支援 TikTok / Netflix 跨區解鎖",
      policyTitle: "流量規範:",
      policyDesc: "本方案為原生日網，支援多數日本限定服務。",
      note: "注意：此線路為日本 IP。",
    },
    summaryPrefix: "IIJ Docomo",
  },
  default: {
    badges: [],
    marketingBox: {
      bgColor: "bg-gray-50",
      borderColor: "border-gray-100",
      couponText: "請選擇電信商以查看詳細規格",
      policyTitle: "說明:",
      policyDesc: "不同電信商擁有不同的流量公平使用原則 (FUP)。",
      note: "",
    },
    summaryPrefix: "eSIM",
  },
};

const CARRIER_SPECS_DATA = {
  "SoftBank / KDDI": [
    {
      label: "訊號覆蓋範圍",
      value: "東京、京都、廣島、關東、長崎、大阪等日本各城市及旅遊目的地。",
    },
    { label: "電信業者", value: "KDDI (5G) / Softbank (5G)" },
    { label: "速度", value: "4G / LTE / 5G" },
    { label: "方案類型", value: "僅數據流量" },
    { label: "網路共用 / 熱點功能", value: "支持" },
    { label: "電話號碼", value: "無" },
    { label: "通話", value: "不支持，只能透過應用程式（網路通話，即 VoIP）。" },
    { label: "簡訊", value: "無" },
    { label: "eKYC (身分驗證)", value: "不需要" },
    {
      label: "效期政策",
      value:
        "一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期即開始。我們建議您在到達目的地後添加 eSIM。您可以提前安裝 eSIM，但請記得安裝後立即將其關閉，以避免有效期提前開始。",
      fullWidth: true,
    },
  ],
  "AU(KDDI)": [
    {
      label: "訊號覆蓋範圍",
      value: "東京、京都、廣島、關東、長崎、大阪等日本各城市及旅遊目的地。",
    },
    { label: "電信業者", value: "KDDI 5G" },
    { label: "速度", value: "4G / LTE / 5G" },
    { label: "方案類型", value: "僅數據流量" },
    { label: "網路共用／熱點功能", value: "支持" },
    { label: "通話", value: "不支持，只能透過應用程式（網路通話，即 VoIP）。" },
    {
      label: "效期政策",
      value:
        "一旦 eSIM 連接到支援的網路並開始產生數據訪問互聯網，有效期限即開始。我們建議您在到達目的地後添加 eSIM。",
      fullWidth: true,
    },
  ],
  "IIJ Docomo": [
    {
      label: "訊號覆蓋範圍",
      value: "東京、京都、廣島、關東、長崎、大阪等日本各城市及旅遊目的地。",
    },
    { label: "電信業者", value: "IIJ(Docomo) LTE" },
    { label: "速度", value: "4G / LTE" },
    { label: "方案類型", value: "僅數據流量" },
    {
      label: "效期政策",
      value:
        "有效期於eSIM下載到您的裝置後立即開始計算。請在準備好使用時再安裝eSIM。",
      fullWidth: true,
    },
  ],
  default: [
    {
      label: "說明",
      value: "請選擇上方的電信商以查看詳細技術規格。",
      fullWidth: true,
    },
  ],
};

const CARRIER_INTRO_DATA = {
  "SoftBank / KDDI": {
    bullets: [
      "在這裡尋找最佳日本旅遊 eSIM，為您的奇妙旅程帶來便利。",
      "我們的日本 eSIM 支援無限數據，覆蓋大部分城市，並讓您在流暢的網絡下設置熱點，與朋友或家人分享。",
      "此日本 eSIM 方案支援 Google、YouTube、Facebook、Instagram 和 WhatsApp 等應用程式，但不支援 TikTok。如果您是 TikTok 的忠實用戶，請考慮 IIJ NTT Docomo 方案。",
    ],
  },
  "AU(KDDI)": {
    bullets: [
      "本方案由日本主要電信商 au（KDDI）提供。",
      "包含多種規格可選，熱點分享將消耗您分配的總GB數據量。",
      "✅ 此日本 eSIM 方案支援 Google、YouTube、Facebook、Instagram、ChatGPT 和 TikTok 等應用程式。",
    ],
  },
  "IIJ Docomo": {
    bullets: [
      "隆重介紹日本 Docomo eSIM，您在日本輕鬆連結的終極旅伴。",
      "此 eSIM 是純數據 eSIM，具有日本本地 IP 位址，讓您無需設定漫遊即可保持連線。",
      "*注意：此日本eSIM IIJ NTT Docomo套餐需要手動設定APN。",
    ],
  },
  default: {
    bullets: ["請選擇電信商以查看介紹。"],
  },
};

const CATEGORIES = [
  {
    id: "social",
    label: "社群媒體",
    subLabel: "IG, FB, Threads",
    rate: 0.45,
    color: "#1E3A8A",
  },
  {
    id: "video",
    label: "影片串流",
    subLabel: "YouTube, Netflix, TikTok",
    rate: 1.5,
    color: "#1D4ED8",
  },
  {
    id: "voip",
    label: "視訊通話",
    subLabel: "WhatsApp, LINE, Zoom",
    rate: 0.8,
    color: "#3B82F6",
  },
  {
    id: "web",
    label: "網頁瀏覽",
    subLabel: "Chrome, Safari, 網購",
    rate: 0.15,
    color: "#60A5FA",
  },
  {
    id: "maps",
    label: "地圖導航",
    subLabel: "Google Maps",
    rate: 0.06,
    color: "#93C5FD",
  },
];

const stripHtml = (html) =>
  html ? html.replace(/<[^>]*>?/gm, "").substring(0, 160) + "..." : "";

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
                  ✕
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

const DataEstimatorModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="估算您的數據用量"
      maxWidth="max-w-md"
    >
      <div className="text-center py-10">
        <p>數據估算器正在載入中...</p>
        <button
          onClick={onClose}
          className="mt-4 bg-slate-900 text-white px-6 py-2 rounded-lg"
        >
          關閉
        </button>
      </div>
    </Modal>
  );
};

const ComparisonTable = () => (
  <div className="overflow-x-auto rounded-xl border shadow-sm my-8 text-sm text-left border-collapse min-w-full">
    <table className="w-full">
      <thead>
        <tr className="bg-slate-900 text-white">
          <th className="p-4 w-1/4">產品</th>
          <th className="p-4 w-1/6">運營商</th>
          <th className="p-4 w-1/6">最適合</th>
          <th className="p-4">優點與注意事項</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y">
        <tr>
          <td className="p-4 font-bold">日本 eSIM AU</td>
          <td className="p-4">KDDI</td>
          <td className="p-4">串流愛好者</td>
          <td className="p-4 text-xs">✅ 本地網絡 ✅ 支援 TikTok</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-4 font-bold">SoftBank / KDDI 雙網</td>
          <td className="p-4">SB / KDDI</td>
          <td className="p-4">多城市旅行者</td>
          <td className="p-4 text-xs">✅ 雙網切換 ❌ 無法訪問 TikTok</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const ProductTabs = ({ product, selectedCarrier }) => {
  const [activeTab, setActiveTab] = useState("desc");
  const tabs = [
    { id: "desc", label: "產品介紹" },
    { id: "specs", label: "套餐參數" },
    { id: "install", label: "安裝/激活" },
  ];
  const safeCarrier = selectedCarrier || "SoftBank / KDDI";
  const specs =
    CARRIER_SPECS_DATA[safeCarrier] || CARRIER_SPECS_DATA["default"];
  const intro =
    CARRIER_INTRO_DATA[safeCarrier] || CARRIER_INTRO_DATA["default"];

  return (
    <div className="mt-16">
      <div className="flex justify-center border-b mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px]">
        {activeTab === "desc" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              🇯🇵 關於 {safeCarrier} 方案
            </h3>
            <div className="mb-10 text-slate-600 space-y-2">
              {intro.bullets.map((point, idx) => (
                <div key={idx} className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <ComparisonTable />
          </motion.div>
        )}
        {activeTab === "specs" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-50 rounded-2xl p-6 md:p-10"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
              {specs.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${item.fullWidth ? "md:col-span-2" : ""}`}
                >
                  <span className="text-sm font-bold text-slate-900 mb-1">
                    {item.label}
                  </span>
                  <span className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        {activeTab === "install" && (
          <div className="text-center py-10 text-gray-500">
            <h4 className="text-lg font-bold mb-4 text-slate-800">安裝步驟</h4>
            <p>1. 下單後檢查 Email 收取 QR Code。</p>
            <p>2. 前往手機「設定」 「行動服務」 「加入 eSIM」。</p>
            <p>3. 掃描 QR Code 並依照指示完成設定。</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 3. Supabase 資料抓取邏輯
// ==========================================
export async function getStaticPaths() {
  try {
    const { data: products } = await supabase
      .from("products")
      .select("slug, categories(slug)");
    const paths = products.map((p) => ({
      params: { category: p.categories?.slug || "uncategorized", slug: p.slug },
    }));
    return { paths, fallback: "blocking" };
  } catch (error) {
    return { paths: [], fallback: "blocking" };
  }
}

export async function getStaticProps({ params }) {
  try {
    const { slug } = params;
    const { data: product, error: pError } = await supabase
      .from("products")
      .select("*, categories(slug, name)")
      .eq("slug", slug)
      .single();
    if (pError || !product) return { notFound: true };

    const { data: variations } = await supabase
      .from("product_variations")
      .select("*")
      .eq("product_id", product.id);
    return { props: { product, variations: variations || [] }, revalidate: 60 };
  } catch (e) {
    return { notFound: true };
  }
}

// ==========================================
// 4. 主頁面 Component
// ==========================================
export default function ProductPage({ product, variations = [] }) {
  const { addToCart } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [currentVariation, setCurrentVariation] = useState(null);
  const [displayPrice, setDisplayPrice] = useState(product?.price);

  const [isCompatOpen, setIsCompatOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  const [mainSwiper, setMainSwiper] = useState(null);

  // 1. 初始化網址參數
  useEffect(() => {
    if (router.isReady) {
      const initialAttrs = {};
      ["電信商", "天數", "數據"].forEach((key) => {
        if (router.query[key]) initialAttrs[key] = router.query[key];
      });
      if (Object.keys(initialAttrs).length > 0)
        setSelectedAttributes(initialAttrs);
    }
  }, [router.isReady]);

  // 2. 匹配變體與價格
  useEffect(() => {
    if (variations.length > 0) {
      const match = variations.find((v) =>
        Object.keys(selectedAttributes).every(
          (key) =>
            v.attributes && v.attributes[key] === selectedAttributes[key],
        ),
      );
      if (match) {
        setCurrentVariation(match);
        setDisplayPrice(match.price);
      } else {
        setCurrentVariation(null);
        if (Object.keys(selectedAttributes).length === 3) setDisplayPrice(null);
      }
    }
  }, [selectedAttributes, variations]);

  // 3. 動態取得所有可用的選項
  const availableCarriers = useMemo(
    () => [
      ...new Set(
        variations.map((v) => v.attributes?.["電信商"]).filter(Boolean),
      ),
    ],
    [variations],
  );
  const availableDays = useMemo(
    () => [
      ...new Set(variations.map((v) => v.attributes?.["天數"]).filter(Boolean)),
    ],
    [variations],
  );
  const availableData = useMemo(
    () => [
      ...new Set(variations.map((v) => v.attributes?.["數據"]).filter(Boolean)),
    ],
    [variations],
  );

  const handleAttributeSelect = (name, option) => {
    const newAttrs = { ...selectedAttributes, [name]: option };
    setSelectedAttributes(newAttrs);
    router.push(
      { pathname: router.pathname, query: { ...router.query, [name]: option } },
      undefined,
      { shallow: true },
    );
  };

  const handleAddToCart = () => {
    const final = currentVariation || product;
    addToCart({
      id: final.id,
      parentId: product.id,
      name: `${product.name} ${currentVariation ? JSON.stringify(currentVariation.attributes) : ""}`,
      price: final.price,
      sku: final.sku,
      planId: final.plan_id, // 🚀 關鍵：把 Supabase 撈出來的 plan_id 傳給購物車
      image: product.image_url || "/default-image.jpg",
      quantity,
    });
    window.dispatchEvent(new Event("open-cart-sidebar"));
  };

  const carrierName = selectedAttributes["電信商"] || "default";
  const activeCarrierInfo =
    CARRIER_INFO_MAP[carrierName] ||
    CARRIER_INFO_MAP["SoftBank / KDDI"] ||
    CARRIER_INFO_MAP["default"];
  const marketingConfig = activeCarrierInfo.marketingBox;

  // 🚀 修復重點：正確讀取 Supabase 的 image_urls 陣列
  const images =
    product.image_urls && product.image_urls.length > 0
      ? product.image_urls.map((url) => ({ src: url, alt: product.name }))
      : [{ src: product.image_url || "/default-image.jpg", alt: product.name }];

  if (router.isFallback || !product) return <Layout>載入中...</Layout>;

  return (
    <Layout>
      <Head>
        <title>{product.name} | FeGo eSIM</title>
        <meta
          name="description"
          content={stripHtml(product.description || "")}
        />
      </Head>

      <CompatibilityModal
        isOpen={isCompatOpen}
        onClose={() => setIsCompatOpen(false)}
      />
      <DataEstimatorModal
        isOpen={isEstimatorOpen}
        onClose={() => setIsEstimatorOpen(false)}
      />

      <div className="max-w-6xl mx-auto py-10 px-4 bg-white">
        <div className="text-xs text-gray-400 mb-6">
          首頁 / 日本 eSIM / {product.name}
        </div>

        <div className="flex flex-col lg:flex-row gap-12 mb-20">
          <div className="w-full lg:w-3/5 flex flex-col gap-6">
            {/* 🚀 修復重點：還原 Swiper 輪播 UI */}
            <div className="flex gap-4 items-stretch h-[500px]">
              <div className="hidden lg:flex flex-col items-center gap-3 w-[80px] shrink-0 h-full">
                <button
                  onClick={() => mainSwiper?.slidePrev()}
                  className="w-full h-8 flex items-center justify-center hover:bg-gray-50 text-gray-400"
                >
                  ▲
                </button>
                <Swiper
                  onSwiper={setThumbsSwiper}
                  direction="vertical"
                  spaceBetween={10}
                  slidesPerView="auto"
                  modules={[FreeMode, Thumbs]}
                  className="w-full flex-1"
                >
                  {images.map((img, idx) => (
                    <SwiperSlide
                      key={idx}
                      className="!h-[80px] border rounded overflow-hidden cursor-pointer"
                    >
                      <Image
                        src={img.src}
                        alt="thumb"
                        fill
                        className="object-cover"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
                <button
                  onClick={() => mainSwiper?.slideNext()}
                  className="w-full h-8 flex items-center justify-center hover:bg-gray-50 text-gray-400"
                >
                  ▼
                </button>
              </div>
              <div className="w-full relative bg-gray-50 rounded-2xl overflow-hidden border h-full">
                <Swiper
                  onSwiper={setMainSwiper}
                  loop={true}
                  thumbs={{ swiper: thumbsSwiper }}
                  modules={[FreeMode, Navigation, Thumbs]}
                  className="w-full h-full"
                >
                  {images.map((img, idx) => (
                    <SwiperSlide key={idx}>
                      <div className="w-full h-full relative">
                        <Image
                          src={img.src}
                          alt="main"
                          fill
                          className="object-contain p-4"
                          priority
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </div>

            <div
              className={`p-5 rounded-xl border ${marketingConfig.bgColor} ${marketingConfig.borderColor}`}
            >
              <div className="flex items-center gap-2">
                <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded font-bold">
                  優惠
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {marketingConfig.couponText}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-2/5 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-slate-900">
                {product.name}
              </h1>
              <button
                onClick={() => setIsCompatOpen(true)}
                className="flex items-center gap-1 text-xs font-bold text-gray-600 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                檢查相容性
              </button>
            </div>

            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <p
                className={`text-3xl font-bold ${displayPrice ? "text-cyan-500" : "text-gray-300"}`}
              >
                {displayPrice ? `NT$${displayPrice}` : "請選擇規格"}
              </p>
            </div>

            {availableCarriers.length > 0 && (
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-900 block mb-2">
                  電信商
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableCarriers.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAttributeSelect("電信商", opt)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${selectedAttributes["電信商"] === opt ? "border-cyan-500 text-cyan-600 bg-cyan-50 font-bold" : "border-gray-200"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableDays.length > 0 && (
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-900 block mb-2">
                  天數
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableDays.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAttributeSelect("天數", opt)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${selectedAttributes["天數"] === opt ? "border-cyan-500 text-cyan-600 bg-cyan-50 font-bold" : "border-gray-200"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableData.length > 0 && (
              <div className="mb-6">
                <span className="text-xs font-bold text-slate-900 block mb-2">
                  數據
                </span>
                <div className="flex flex-wrap gap-2">
                  {availableData.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAttributeSelect("數據", opt)}
                      className={`px-4 py-2 text-sm rounded-lg border transition-all ${selectedAttributes["數據"] === opt ? "border-cyan-500 text-cyan-600 bg-cyan-50 font-bold" : "border-gray-200"}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentVariation?.tags && currentVariation.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 my-4">
                {currentVariation.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {currentVariation?.description && (
              <div className="mb-4 bg-[#147AD7] border border-blue-100 p-4 rounded-xl shadow-sm text-sm text-white leading-relaxed">
                {currentVariation.description}
              </div>
            )}

            <div className="flex gap-3 h-[50px] mt-4">
              <button
                onClick={handleAddToCart}
                disabled={!displayPrice}
                className={`flex-1 font-bold rounded-lg transition-all ${!displayPrice ? "bg-gray-200 text-gray-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}
              >
                {displayPrice
                  ? `加入購物車 - NT$${displayPrice}`
                  : "請選擇完整規格"}
              </button>
            </div>

            <button
              onClick={() => setIsEstimatorOpen(true)}
              className="w-full mt-3 py-3 border border-gray-200 text-gray-500 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all"
            >
              📊 估算我的數據用量
            </button>
          </div>
        </div>

        {product.description && (
          <div className="mt-20 max-w-4xl mx-auto border-t pt-10">
            <h3 className="text-2xl font-bold mb-8 text-center text-slate-800">
              產品詳細介紹
            </h3>
            <div
              className="prose max-w-none text-slate-700 leading-relaxed product-specs-container"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </div>
        )}

        <ProductTabs product={product} selectedCarrier={carrierName} />
      </div>
    </Layout>
  );
}
