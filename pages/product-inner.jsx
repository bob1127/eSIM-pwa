import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Check,
  ShoppingCart,
} from "lucide-react";
import { clsx } from "clsx";
import Layout from "./Layout";
// --- 模擬商品資料 ---
const PRODUCT_DATA = {
  title: "New Nylon USB-C to USB-C 100W Cable (10 ft)",
  price: 15.99, // 為了展示效果稍微改了價格
  rating: 4.9,
  reviews: 663,
  colors: [
    { name: "Black", value: "#000000" },
    { name: "Silver", value: "#C0C0C0" },
  ],
  features: [
    "The Anker Advantage",
    "Rapid Charging",
    "Highly Compatible",
    "Rugged and Durable",
  ],
  images: [
    "/images/泰國旅遊首選 - 極客eSIM | Jeko eSIM 出國上網首選，免換卡、即買即用、高速吃到飽.jpg", // 鞋子示意圖1
    "/images/eSIM設定教學.jpg", // 鞋子示意圖2
    "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?q=80&w=1000&auto=format&fit=crop", // 鞋子示意圖3
    "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?q=80&w=1000&auto=format&fit=crop", // 鞋子示意圖4
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1000&auto=format&fit=crop", // 鞋子示意圖5
  ],
};

// --- 子組件：縮圖按鈕 ---
const ThumbButton = ({ selected, onClick, imgSrc }) => (
  <div
    className={clsx(
      "relative min-w-[80px] h-[80px] cursor-pointer rounded-md overflow-hidden border-2 transition-all duration-200 mr-3",
      selected
        ? "border-blue-500 opacity-100"
        : "border-transparent opacity-60 hover:opacity-100"
    )}
    onClick={onClick}
  >
    <img src={imgSrc} alt="thumbnail" className="w-full h-full object-cover" />
  </div>
);

// --- 子組件：畫廊核心 (Gallery Logic) ---
const ProductGallery = ({ images, onImageClick }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({ loop: true });
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  const onThumbClick = useCallback(
    (index) => {
      if (!emblaMainApi || !emblaThumbsApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi, emblaThumbsApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    emblaMainApi.on("select", onSelect);
    emblaMainApi.on("reInit", onSelect);
  }, [emblaMainApi, onSelect]);

  return (
    <div className="w-full">
      {/* 主圖區域 */}
      <div className="relative group overflow-hidden rounded-xl bg-gray-50 border border-gray-100 mb-4">
        <div className="overflow-hidden" ref={emblaMainRef}>
          <div className="flex touch-pan-y">
            {images.map((src, index) => (
              <div
                className="flex-[0_0_100%] min-w-0 relative aspect-square md:aspect-[4/3] cursor-zoom-in"
                key={index}
                onClick={() => onImageClick(index)} // 點擊觸發 Popup
              >
                <img
                  src={src}
                  className="w-full h-full object-contain p-4"
                  alt={`Product view ${index + 1}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 主圖左右導航 (Hover 顯示) */}
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            emblaMainApi?.scrollPrev();
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
          onClick={(e) => {
            e.stopPropagation();
            emblaMainApi?.scrollNext();
          }}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 縮圖區域 */}
      <div className="overflow-hidden" ref={emblaThumbsRef}>
        <div className="flex">
          {images.map((src, index) => (
            <ThumbButton
              key={index}
              onClick={() => onThumbClick(index)}
              selected={index === selectedIndex}
              imgSrc={src}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 子組件：全螢幕 Lightbox ---
const Lightbox = ({ isOpen, onClose, images, startIndex }) => {
  const [selectedIndex, setSelectedIndex] = useState(startIndex);
  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    startIndex: startIndex,
    loop: true,
  });
  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
  });

  // 當 Lightbox 打開時，同步索引
  useEffect(() => {
    if (isOpen && emblaMainApi) {
      emblaMainApi.scrollTo(startIndex, true); // true = instant jump
    }
  }, [isOpen, startIndex, emblaMainApi]);

  const onThumbClick = useCallback(
    (index) => {
      if (!emblaMainApi) return;
      emblaMainApi.scrollTo(index);
    },
    [emblaMainApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return;
    setSelectedIndex(emblaMainApi.selectedScrollSnap());
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap());
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!emblaMainApi) return;
    emblaMainApi.on("select", onSelect);
  }, [emblaMainApi, onSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-center items-center backdrop-blur-sm animate-in fade-in duration-200">
      {/* 關閉按鈕 */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors z-50 p-2"
      >
        <X size={32} />
      </button>

      {/* Lightbox 主圖 */}
      <div className="w-full max-w-5xl flex-1 flex items-center overflow-hidden relative px-12">
        <button
          className="absolute left-2 z-10 text-white/50 hover:text-white p-2"
          onClick={() => emblaMainApi?.scrollPrev()}
        >
          <ChevronLeft size={48} />
        </button>

        <div className="overflow-hidden w-full h-full" ref={emblaMainRef}>
          <div className="flex h-full items-center">
            {images.map((src, index) => (
              <div
                className="flex-[0_0_100%] min-w-0 h-[80vh] flex items-center justify-center relative px-4"
                key={index}
              >
                <img
                  src={src}
                  className="max-h-full max-w-full object-contain shadow-2xl"
                  alt={`Full view ${index}`}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          className="absolute right-2 z-10 text-white/50 hover:text-white p-2"
          onClick={() => emblaMainApi?.scrollNext()}
        >
          <ChevronRight size={48} />
        </button>
      </div>

      {/* Lightbox 縮圖 */}
      <div
        className="h-24 w-full max-w-3xl mb-8 overflow-hidden"
        ref={emblaThumbsRef}
      >
        <div className="flex justify-center">
          {images.map((src, index) => (
            <div
              key={index}
              onClick={() => onThumbClick(index)}
              className={clsx(
                "relative min-w-[60px] h-[60px] mx-2 cursor-pointer rounded overflow-hidden border-2 transition-all",
                index === selectedIndex
                  ? "border-white opacity-100"
                  : "border-transparent opacity-40 hover:opacity-80"
              )}
            >
              <img
                src={src}
                className="w-full h-full object-cover"
                alt="thumb"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 主頁面組件 ---
export default function ProductDetailComplete() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PRODUCT_DATA.colors[0]);
  const [quantity, setQuantity] = useState(1);

  // 處理點擊主圖開啟 Lightbox
  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white font-sans text-slate-800 pb-20">
        {/* 模擬 Header */}

        <main className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* 左側：商品展示 (佔 7 欄) */}
            <div className="lg:col-span-7">
              <ProductGallery
                images={PRODUCT_DATA.images}
                onImageClick={handleImageClick}
              />
            </div>

            {/* 右側：商品資訊 (佔 5 欄) */}
            <div className="lg:col-span-5 space-y-6">
              {/* 標題與評分 */}
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {PRODUCT_DATA.title}
                </h1>
                <div className="flex items-center space-x-2 text-sm text-yellow-500 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        fill="currentColor"
                        className="text-yellow-400"
                      />
                    ))}
                  </div>
                  <span className="text-blue-500 hover:underline cursor-pointer">
                    {PRODUCT_DATA.rating} ({PRODUCT_DATA.reviews} reviews)
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-900">
                  ${PRODUCT_DATA.price}
                </div>
              </div>

              <hr className="border-gray-200" />

              {/* Key Features */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-700">
                  Key Features
                </h3>
                <ul className="space-y-2">
                  {PRODUCT_DATA.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center text-slate-600 text-sm"
                    >
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 顏色選擇 */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-700">
                  Color:{" "}
                  <span className="text-slate-500 font-normal">
                    {selectedColor.name}
                  </span>
                </h3>
                <div className="flex space-x-3">
                  {PRODUCT_DATA.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={clsx(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all",
                        selectedColor.name === color.name
                          ? "border-blue-500 ring-2 ring-blue-100"
                          : "border-gray-200 hover:border-gray-400"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-full shadow-inner"
                        style={{ backgroundColor: color.value }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 數量選擇 */}
              <div>
                <h3 className="font-semibold mb-3 text-slate-700">Quantity</h3>
                <div className="inline-flex items-center border border-gray-300 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-gray-100 transition"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-gray-100 transition"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 按鈕組 */}
              <div className="pt-4 flex gap-4">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2">
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
                <button className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-4 px-6 rounded-lg border border-blue-200 transition-all">
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Lightbox 彈出層 */}
        <Lightbox
          isOpen={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          images={PRODUCT_DATA.images}
          startIndex={currentImageIndex}
        />
      </div>
    </Layout>
  );
}
