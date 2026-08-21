"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buildLoginUrl } from "@/lib/authRedirect";

// 🌟 引入 NextAuth 勾子
import { useSession, signOut } from "next-auth/react";
import { useUser } from "@/components/context/UserContext";
// 🚀 導入你的 supabase 客戶端
import { supabase } from "@/lib/supabaseClient";

import FeaturedCountryCard, {
  type FeaturedCountry,
  resolveCategoryImageSrc,
} from "./FeaturedCountryCard";
import SocialIconLinks, { SocialIconLinksMobile } from "./SocialIconLinks";
import NavbarSiteSearch from "./NavbarSiteSearch";
import { filterCountriesByQuery } from "@/lib/heroCountryPlans";

import {
  UserIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAsiaAustraliaIcon,
  MapIcon,
  QuestionMarkCircleIcon,
  GiftIcon,
  QrCodeIcon,
  WifiIcon,
  BookOpenIcon,
  DevicePhoneMobileIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// --- 1. 定義資料型別 ---
interface MedusaCategory {
  id: string;
  name: string;
  handle: string;
  description?: string;
  rank?: number;
  metadata?: Record<string, string>;
}

function buildFeaturedCountries(
  categories: MedusaCategory[],
  products: any[],
): FeaturedCountry[] {
  const statsByCategory = new Map<
    string,
    { count: number; minPrice: number | null }
  >();

  products.forEach((product) => {
    const variant = product.variants?.[0];
    let price: number | null = null;
    if (variant?.calculated_price?.calculated_amount != null) {
      price = variant.calculated_price.calculated_amount;
    } else if (variant?.prices?.[0]?.amount != null) {
      price = variant.prices[0].amount;
    }

    const categoryIds: string[] =
      product.categories?.map((c: { id: string }) => c.id) || [];

    categoryIds.forEach((catId) => {
      const prev = statsByCategory.get(catId) || {
        count: 0,
        minPrice: null as number | null,
      };
      prev.count += 1;
      if (price != null) {
        prev.minPrice =
          prev.minPrice == null ? price : Math.min(prev.minPrice, price);
      }
      statsByCategory.set(catId, prev);
    });
  });

  return categories
    .map((cat) => {
      const meta = cat.metadata || {};
      const stats = statsByCategory.get(cat.id) || { count: 0, minPrice: null };

      return {
        id: cat.id,
        name: cat.name || "未命名",
        slug: cat.handle || "/",
        description: cat.description || meta.subtitle || "",
        imageSrc: resolveCategoryImageSrc(
          cat.handle || "",
          meta.image_url || meta.image || null,
        ),
        productCount: stats.count,
        minPrice: stats.minPrice,
        regionLabel: meta.region_label || meta.region || meta.location || "",
        badge: meta.badge || meta.tag || "",
        rank: cat.rank ?? 9999,
      };
    })
    .sort((a, b) => {
      const rankDiff = (a.rank ?? 9999) - (b.rank ?? 9999);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, "zh-TW");
    });
}

interface NavbarProps {
  className?: string;
}

function isHomePath(path: string | null | undefined) {
  if (!path) return true;
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized === "/" || normalized === "/index";
}

// --- 2. 導覽列資料 (桌面版) ---
const navLinks = [
  { key: "categories", label: "精選eSIM", href: "/product", hasMega: true },
  { key: "shop", label: "Jeko 商城", href: "/shop", comingSoon: true },
  { key: "blog", label: "旅遊須知", href: "/blog" },
  { key: "tutorial", label: "啟用教學", href: "/operation-shopee" },
  { key: "about", label: "關於Jeko", href: "/about" },
  { key: "partner", label: "合作夥伴", href: "/cooperation" },
  { key: "promo", label: "優惠活動", href: "/promo" },
  { key: "contact", label: "聯絡我們", href: "/contact" },
  {
    key: "shopee",
    label: "蝦皮兌換",
    href: "/shopee-qrcode",
    comingSoon: true,
  },
  { key: "usage", label: "查詢用量", href: "/data-query" },
];

const fullMenuLinks = [
  ...navLinks,
  { key: "sale", label: "限時特惠", href: "#" },
];

/** 精選 Mega Menu 第二列：真．不限速吃到飽 */
const UNLIMITED_SPEED_PLANS: FeaturedCountry[] = [
  {
    id: "unlimited-jp-au-kddi",
    name: "日本 AU(KDDI)",
    slug: "japan",
    description: "au KDDI 原生 IP・真．不限速吃到飽",
    imageSrc: "/images/分類eSIM-日本.png",
    productCount: 0,
    minPrice: null,
    regionLabel: "日本",
    badge: "真．不限速",
    href: "/product/japan/japan-unlimited-esim?telecom=au-kddi",
    footerText: "日本三大電信原生高速上網",
  },
  {
    id: "unlimited-kr-sk-phone",
    name: "韓國 SK電信（含門號）",
    slug: "korea",
    description: "SK 原生 IP・實名後可接聽／收簡訊",
    imageSrc: "/images/分類eSIM-韓國.png",
    productCount: 0,
    minPrice: null,
    regionLabel: "韓國",
    badge: "含當地門號",
    href: "/product/korea/korea-unlimited-esim?telecom=sk-native",
    footerText: "真．不限速・當地電話可用",
  },
  {
    id: "unlimited-th-truemove-8-15",
    name: "泰國 Truemove 8／15天",
    slug: "thailand",
    description: "Truemove H 當地號碼・8 天與 15 天",
    imageSrc: "/images/sim/分類/分類eSIM-泰國.png",
    productCount: 2,
    minPrice: null,
    regionLabel: "泰國",
    badge: "8／15天",
    href: "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8",
    footerText: "真．不限速・免費接聽與收簡訊",
  },
];

// --- 3. Navbar 主元件 ---
export default function Navbar({ className }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHomePage = isHomePath(pathname);
  const search = searchParams?.toString?.() || "";
  const returnPath = search ? `${pathname}?${search}` : pathname;
  const loginHref = buildLoginUrl(returnPath || "/account");
  const [mounted, setMounted] = useState(false);

  // --- UI 狀態管理 ---
  const [isScrolled, setIsScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [openMega, setOpenMega] = useState<string>("none");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [comingSoonLabel, setComingSoonLabel] = useState<string | null>(null);

  const showComingSoon = (label: string) => {
    setComingSoonLabel(label);
    setMobileOpen(false);
    setOpenMega("none");
  };

  /** 捲動超過此距離才視為離開頁面頂部 */
  const TOP_HIDE_THRESHOLD = 48;
  /** 與 Tailwind lg 一致：手機版不收回 navbar */
  const DESKTOP_NAV_MQ = "(min-width: 1024px)";

  // --- 登入狀態管理 (Dual-Engine) ---
  const { data: session, status: nextAuthStatus } = useSession();
  const { user: supabaseUser, isHydrated: isSupabaseChecked } = useUser();

  // --- 分類資料狀態 ---
  const [featuredCountries, setFeaturedCountries] = useState<FeaturedCountry[]>(
    [],
  );
  const [loadingCats, setLoadingCats] = useState<boolean>(true);
  const [countryQuery, setCountryQuery] = useState("");

  const visibleCountries = useMemo(
    () => filterCountriesByQuery(featuredCountries, countryQuery, "slug"),
    [featuredCountries, countryQuery],
  );

  // 首頁桌面版：頂部收回 navbar。手機版與其他頁面一律顯示。
  useEffect(() => {
    setMounted(true);
  }, []);

  // 進入分類／換頁時關閉 mega menu，避免上方選單殘留
  useEffect(() => {
    setOpenMega("none");
    setMobileOpen(false);
    setCountryQuery("");
  }, [pathname]);

  useEffect(() => {
    const desktopMq = window.matchMedia(DESKTOP_NAV_MQ);

    const shouldAutoHide = () => isHomePage && desktopMq.matches;

    const handleScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 20);

      if (!shouldAutoHide()) {
        setNavVisible(true);
        return;
      }

      if (y <= TOP_HIDE_THRESHOLD) {
        setNavVisible(false);
        setOpenMega("none");
        setMobileOpen(false);
      } else {
        setNavVisible(true);
      }
    };

    const syncNavVisibility = () => {
      if (!shouldAutoHide()) {
        setNavVisible(true);
        return;
      }
      handleScroll();
    };

    syncNavVisibility();
    desktopMq.addEventListener("change", syncNavVisibility);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      desktopMq.removeEventListener("change", syncNavVisibility);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isHomePage]);

  const isLoggedIn = nextAuthStatus === "authenticated" || !!supabaseUser;
  const userName =
    supabaseUser?.user_metadata?.full_name || session?.user?.name || "會員";
  const userImage =
    supabaseUser?.user_metadata?.avatar_url || session?.user?.image || null;

  // 抓取 Medusa 分類（同源 API 代理，避免 :3001 CORS 被擋）
  useEffect(() => {
    const fetchCategoriesFromMedusa = async () => {
      try {
        setLoadingCats(true);
        const res = await fetch("/api/medusa/navbar-categories");
        if (!res.ok) throw new Error("無法取得 Medusa 分類資料");

        const data = await res.json();
        setFeaturedCountries(
          buildFeaturedCountries(
            data.product_categories || [],
            data.products || [],
          ),
        );
      } catch (error) {
        console.error("❌ Navbar 抓取 Medusa 分類失敗:", error);
      } finally {
        setLoadingCats(false);
      }
    };
    if (mounted) fetchCategoriesFromMedusa();
  }, [mounted]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await signOut({ redirect: false });
    setMobileOpen(false);
    router.push("/login");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenMega("none");
      setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // 背景遮罩：桌面 mega menu 時遮罩在 navbar 下方，避免攔截 hover
  const showOverlay = openMega !== "none" || mobileOpen;

  if (!mounted) return null;

  return (
    <>
      {/* 背景遮罩 (Overlay) */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setOpenMega("none");
              setMobileOpen(false);
            }}
            aria-hidden="true"
            className={cn(
              "fixed inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer",
              mobileOpen ? "z-[9999]" : "z-[998]",
            )}
          />
        )}
      </AnimatePresence>

      {/* ==========================================
          主要導覽列 (膠囊懸浮設計)
      ========================================== */}
      <motion.header
        initial={false}
        animate={{ y: navVisible ? 0 : "-110%" }}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 38,
          mass: 0.85,
        }}
        className={cn(
          "fixed top-0 left-0 w-full z-[1000] transition-[padding] duration-300 pointer-events-none",
          isScrolled ? "pt-2 px-2 md:px-4" : "pt-4 px-4 md:pt-6 md:px-6",
          className,
        )}
      >
        <div
          className={cn(
            "mx-auto max-w-[1450px] 2xl:max-w-[1600px] pointer-events-auto border border-gray-300 flex flex-col relative transition-[border-radius] duration-150",
            openMega !== "none"
              ? "rounded-t-2xl rounded-b-none"
              : "rounded-2xl",
          )}
          onMouseLeave={() => setOpenMega("none")}
        >
          {/* 上半部：白色區塊 (Logo & 工具列) */}
          <div className="bg-white rounded-t-2xl lg:rounded-t-2xl rounded-2xl lg:rounded-b-none px-5 py-3 lg:py-4 flex justify-between items-center relative z-[30]">
            {/* Logo */}
            <Link
              href="/"
              aria-label="Jeko eSIM 首頁"
              className="flex items-center gap-1 select-none shrink-0"
            >
              <span className="text-[20px] lg:text-[22px] font-black tracking-tighter">
                <span className="text-[#0A6CD0]">Jeko</span>
                <span className="text-[#24A148]">.eSIM</span>
              </span>
            </Link>

            {/* 右側動作按鈕 */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* 社群 icon — IG / LINE / FB */}
              <div className="hidden sm:flex items-center pr-2 lg:pr-3 mr-1 lg:mr-2 border-r border-slate-100">
                <SocialIconLinks size="sm" />
              </div>

              {/* 全站即時搜尋 */}
              <NavbarSiteSearch className="hidden sm:block" />

              {/* 🌟 橫向展開的會員狀態區塊 (電腦版) */}
              <div className="hidden lg:flex items-center pr-4 mr-2 border-r border-slate-100 gap-5">
                {isLoggedIn ? (
                  <>
                    {/* 會員頭像與名稱 */}
                    <div className="flex items-center gap-2">
                      {userImage ? (
                        <img
                          src={userImage}
                          alt={`${userName} 的頭像`}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-slate-500" />
                      )}
                      <span className="text-sm font-bold text-slate-700">
                        {userName}
                      </span>
                    </div>
                    {/* 會員中心連結 */}
                    <Link
                      href="/account"
                      className="text-sm font-bold text-slate-500 hover:text-[#0A6CD0] transition-colors"
                    >
                      會員中心 / 訂單
                    </Link>
                    {/* 登出按鈕 */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-sm font-bold text-slate-500 hover:text-red-500 transition-colors"
                    >
                      登出
                    </button>
                  </>
                ) : (
                  <Link
                    href={loginHref}
                    className="text-sm font-bold text-slate-600 hover:text-[#0A6CD0] transition-colors flex items-center gap-2"
                  >
                    <UserIcon className="w-5 h-5" />
                    登入 / 註冊
                  </Link>
                )}
              </div>

              {/* 購物車 (粉色按鈕) */}
              <Link
                href="/Cart"
                aria-label="進入購物車"
                className="bg-[#F4596A] hover:bg-[#e04556] text-white text-xs font-bold px-3 py-2 lg:px-6 lg:py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <ShoppingCartIcon className="w-4 h-4" />
                <span className="hidden lg:inline">進入購物車</span>
                <ChevronRightIcon className="w-4 h-4 hidden lg:block" />
              </Link>

              {/* 全站即時搜尋：手機漢堡旁也放一顆 */}
              <NavbarSiteSearch className="sm:hidden" />

              {/* 手機版：動畫漢堡選單 */}
              <button
                type="button"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav-menu"
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors ml-1"
              >
                <div className="relative w-4 h-3">
                  <span
                    className={cn(
                      "absolute block h-[2px] w-4 bg-[#0A6CD0] transition-all duration-300",
                      mobileOpen ? "top-1.5 rotate-45" : "top-0",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute top-1.5 block h-[2px] w-4 bg-[#0A6CD0] transition-all duration-300",
                      mobileOpen && "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "absolute block h-[2px] w-4 bg-[#0A6CD0] transition-all duration-300",
                      mobileOpen ? "top-1.5 -rotate-45" : "top-3",
                    )}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* 下半部：品牌藍色區塊 (選單 - 僅限電腦版顯示) */}
          <div
            className={cn(
              "hidden lg:flex bg-[#0A6CD0] h-[56px] relative justify-center items-center px-6 z-20 transition-[border-radius] duration-150",
              openMega !== "none" ? "rounded-b-none" : "rounded-b-2xl",
            )}
          >
            <nav className="flex gap-10 items-center h-full">
              {navLinks.map((link, index) => (
                <div
                  key={`${link.key}-${link.href}-${index}`}
                  className="h-full flex items-center relative group cursor-pointer"
                  onMouseEnter={() =>
                    setOpenMega(link.hasMega ? link.key : "none")
                  }
                >
                  {link.comingSoon ? (
                    <button
                      type="button"
                      onClick={() => showComingSoon(link.label)}
                      className="text-white text-sm font-bold tracking-wide"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-white text-sm font-bold tracking-wide"
                      aria-expanded={
                        link.hasMega ? openMega === link.key : undefined
                      }
                      aria-haspopup={link.hasMega ? "true" : undefined}
                      aria-controls={
                        link.hasMega ? "nav-mega-menu" : undefined
                      }
                    >
                      {link.label}
                    </Link>
                  )}
                  {/* Hover 黃色底線特效 */}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[4px] bg-[#FFD43A] transition-all duration-300 w-0 group-hover:w-full" />
                </div>
              ))}
            </nav>
          </div>

          {/* ==========================================
              Mega Menu 下拉選單 (附著在 Navbar 底層 - 電腦版)
          ========================================== */}
          <AnimatePresence>
            {openMega !== "none" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                id="nav-mega-menu"
                role="region"
                aria-label="精選 eSIM 方案"
                className="absolute top-full left-0 -mt-px w-full bg-white rounded-b-2xl shadow-2xl pt-3 pb-4 z-40 hidden lg:block border border-t-0 border-gray-300 max-h-[calc(100dvh-9.5rem)] overflow-y-auto overscroll-contain"
              >
                <div className="px-10 max-w-[1200px] mx-auto">
                  {openMega === "categories" && (
                    <>
                      <div className="flex flex-wrap items-end justify-between gap-3 mb-3 border-b border-gray-100 pb-2">
                        <div>
                          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                            精選eSIM
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            熱門旅遊目的地 eSIM 方案
                          </p>
                        </div>
                        <div className="flex items-center gap-3 min-w-0 flex-1 justify-end">
                          <label className="relative flex items-center min-w-0 w-full max-w-[280px]">
                            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
                            <input
                              type="search"
                              value={countryQuery}
                              onChange={(e) => setCountryQuery(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && visibleCountries[0]) {
                                  e.preventDefault();
                                  setOpenMega("none");
                                  setCountryQuery("");
                                  router.push(
                                    `/product/${visibleCountries[0].slug}`,
                                  );
                                }
                              }}
                              placeholder="搜尋國家或城市，例如 維也納"
                              autoComplete="off"
                              aria-label="搜尋國家或城市"
                              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm font-medium text-slate-800 placeholder:text-slate-600 outline-none focus:border-[#0A6CD0] focus:bg-white focus:ring-2 focus:ring-[#0A6CD0]/15"
                            />
                            {countryQuery ? (
                              <button
                                type="button"
                                onClick={() => setCountryQuery("")}
                                className="absolute right-2.5 p-0.5 text-slate-500 hover:text-slate-700"
                                aria-label="清除搜尋"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            ) : null}
                          </label>
                          <Link
                            href="/product"
                            onClick={() => setOpenMega("none")}
                            className="text-sm font-bold text-[#0A6CD0] hover:underline shrink-0"
                          >
                            查看全部 →
                          </Link>
                        </div>
                      </div>
                      {loadingCats ? (
                        <div className="flex justify-center items-center py-12">
                          <span className="text-gray-600 font-bold animate-pulse">
                            載入中...
                          </span>
                        </div>
                      ) : visibleCountries.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                          {visibleCountries.map((country) => (
                            <FeaturedCountryCard
                              key={country.id}
                              country={country}
                              onNavigate={() => setOpenMega("none")}
                            />
                          ))}
                        </div>
                      ) : featuredCountries.length > 0 ? (
                        <p className="text-gray-600 text-sm py-8 text-center">
                          找不到「{countryQuery}」相關國家，試試倫敦、首爾、維也納
                        </p>
                      ) : (
                        <p className="text-gray-600 text-sm py-8 text-center">
                          尚未建立國家分類
                        </p>
                      )}
                      {!countryQuery.trim() && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="mb-2">
                            <p className="text-xs font-bold text-[#0A6CD0] uppercase tracking-widest">
                              吃到飽
                            </p>
                            <p className="mt-1 text-sm font-black text-gray-900">
                              真．不限速 高速上網
                            </p>
                          </div>
                          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                            {UNLIMITED_SPEED_PLANS.map((plan) => (
                              <FeaturedCountryCard
                                key={plan.id}
                                country={plan}
                                onNavigate={() => setOpenMega("none")}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* =========================================
          手機版下拉選單 (還原為白色的浮動清單)
      ========================================= */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{
              opacity: navVisible ? 1 : 0,
              scale: navVisible ? 1 : 0.95,
              y: navVisible ? 0 : -10,
            }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{
              type: "spring",
              stiffness: 420,
              damping: 38,
              mass: 0.85,
            }}
            id="mobile-nav-menu"
            aria-label="手機選單"
            className="fixed top-[80px] left-0 right-0 w-[94%] mx-auto z-[10001] lg:hidden rounded-2xl bg-white shadow-2xl border border-black/5 p-5 overflow-y-auto max-h-[80vh]"
          >
            <div className="flex flex-col gap-6">
              {/* 全站即時搜尋（手機） */}
              <NavbarSiteSearch
                variant="inline"
                onNavigate={() => setMobileOpen(false)}
                className="w-full"
              />

              {/* 會員頭像顯示區塊 */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border-2 border-white shrink-0">
                  {isLoggedIn && userImage ? (
                    <img
                      src={userImage}
                      alt={`${userName} 的頭像`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-5 h-5 text-[#0A6CD0]" />
                  )}
                </div>
                <div>
                  <p className="text-[11px] text-[#0A6CD0] font-bold">
                    歡迎回來
                  </p>
                  <p className="text-sm font-black text-slate-800">
                    {isLoggedIn ? userName : "訪客，請先登入"}
                  </p>
                </div>
              </div>

              {/* 🌟 購物與方案區 */}
              <div className="grid grid-cols-1 gap-2.5">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-2 mb-1">
                  精選eSIM
                </p>
                {!loadingCats && featuredCountries.length > 0 && (
                  <label className="relative flex items-center mb-2">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500" />
                    <input
                      type="search"
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      placeholder="搜尋國家或城市"
                      autoComplete="off"
                      aria-label="搜尋國家或城市"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm font-medium text-slate-800 placeholder:text-slate-600 outline-none focus:border-[#0A6CD0] focus:bg-white"
                    />
                    {countryQuery ? (
                      <button
                        type="button"
                        onClick={() => setCountryQuery("")}
                        className="absolute right-2.5 p-0.5 text-slate-500"
                        aria-label="清除搜尋"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    ) : null}
                  </label>
                )}
                {!loadingCats && visibleCountries.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
                    {visibleCountries.slice(0, countryQuery.trim() ? 24 : 8).map(
                      (country) => (
                        <FeaturedCountryCard
                          key={country.id}
                          country={country}
                          compact
                          onNavigate={() => setMobileOpen(false)}
                        />
                      ),
                    )}
                  </div>
                )}
                {!loadingCats &&
                  featuredCountries.length > 0 &&
                  visibleCountries.length === 0 && (
                    <p className="text-slate-600 text-xs px-2 mb-2">
                      找不到「{countryQuery}」相關國家
                    </p>
                  )}
                {!countryQuery.trim() && (
                  <div className="pt-2">
                    <p className="text-[11px] font-bold text-[#0A6CD0] uppercase tracking-widest pl-2 mb-1">
                      吃到飽
                    </p>
                    <p className="text-sm font-black text-slate-800 pl-2 mb-2">
                      真．不限速 高速上網
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
                      {UNLIMITED_SPEED_PLANS.map((plan) => (
                        <FeaturedCountryCard
                          key={plan.id}
                          country={plan}
                          compact
                          onNavigate={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <MobileSimpleNavItem
                  icon={<GlobeAsiaAustraliaIcon className="w-5 h-5" />}
                  label="瀏覽全部國家方案"
                  href="/product"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<ShoppingBagIcon className="w-5 h-5" />}
                  label="Jeko 商城"
                  comingSoon
                  onClick={() => showComingSoon("Jeko 商城")}
                />
              </div>

              {/* 🌟 教學與工具區 */}
              <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-2 mb-1">
                  教學與工具
                </p>
                <MobileSimpleNavItem
                  icon={<MapIcon className="w-5 h-5" />}
                  label="全球訊號覆蓋範圍"
                  href="/coverage"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<DevicePhoneMobileIcon className="w-5 h-5" />}
                  label="eSIM 啟用教學"
                  href="/operation-shopee"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<QrCodeIcon className="w-5 h-5" />}
                  label="蝦皮訂單兌換"
                  comingSoon
                  onClick={() => showComingSoon("蝦皮兌換")}
                />
                <MobileSimpleNavItem
                  icon={<WifiIcon className="w-5 h-5" />}
                  label="查詢數據用量"
                  href="/data-query"
                  onClick={() => setMobileOpen(false)}
                />
              </div>

              {/* 🌟 支援與聯絡區 */}
              <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-2 mb-1">
                  追蹤我們
                </p>
                <SocialIconLinksMobile
                  onNavigate={() => setMobileOpen(false)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-2 mb-1">
                  支援與聯絡
                </p>
                <MobileSimpleNavItem
                  icon={<BookOpenIcon className="w-5 h-5" />}
                  label="旅遊須知｜部落格"
                  href="/blog"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<QuestionMarkCircleIcon className="w-5 h-5" />}
                  label="常見問題與支援"
                  href="/support"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<ChatBubbleLeftRightIcon className="w-5 h-5" />}
                  label="聯絡我們"
                  href="/contact"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<UserGroupIcon className="w-5 h-5" />}
                  label="合作夥伴"
                  href="/cooperation"
                  onClick={() => setMobileOpen(false)}
                />
                <MobileSimpleNavItem
                  icon={<GiftIcon className="w-5 h-5" />}
                  label="優惠活動"
                  href="/promo"
                  onClick={() => setMobileOpen(false)}
                />
              </div>

              {/* 🌟 底部操作按鈕整合區 (購物車、登入、登出) */}
              <div className="mt-2 pt-5 border-t border-gray-100 flex flex-col gap-3">
                <Link
                  href="/Cart"
                  onClick={() => setMobileOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A6CD0] py-3.5 text-sm font-bold text-white shadow-sm transition-opacity active:opacity-80"
                >
                  <ShoppingCartIcon className="w-5 h-5" />
                  我的購物車
                </Link>

                {isLoggedIn ? (
                  <div className="flex gap-3">
                    <Link
                      href="/account"
                      onClick={() => setMobileOpen(false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F2F4F7] text-[#0A6CD0] py-3.5 text-sm font-bold shadow-sm transition-opacity active:opacity-80"
                    >
                      <UserIcon className="w-5 h-5" />
                      會員中心
                    </Link>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 border border-red-100 py-3.5 text-sm font-bold shadow-sm transition-opacity active:opacity-80"
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5" />
                      安全登出
                    </button>
                  </div>
                ) : (
                  <Link
                    href={loginHref}
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F2F4F7] text-[#0A6CD0] py-3.5 text-sm font-bold shadow-sm transition-opacity active:opacity-80"
                  >
                    <UserIcon className="w-5 h-5" />
                    登入 / 註冊帳號
                  </Link>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* 即將上線提示 */}
      <AnimatePresence>
        {comingSoonLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-5"
            onClick={() => setComingSoonLabel(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 p-6 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-black text-slate-900 mb-2">
                {comingSoonLabel}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed mb-5">
                即將上線，敬請期待！
              </p>
              <button
                type="button"
                onClick={() => setComingSoonLabel(null)}
                className="w-full h-11 rounded-full bg-[#0A6CD0] text-white text-sm font-bold hover:bg-[#0859ad] transition"
              >
                知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- 輔助組件 ---

// 手機版清單項目
function MobileSimpleNavItem({
  icon,
  label,
  href,
  onClick,
  comingSoon = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  comingSoon?: boolean;
}) {
  const className =
    "flex h-12 w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white px-5 shadow-sm transition-colors active:bg-slate-50";

  if (comingSoon || !href) {
    return (
      <button type="button" onClick={onClick} className={className}>
        <div className="text-slate-500">{icon}</div>
        <span className="text-[13px] font-black text-slate-700">{label}</span>
        <span className="ml-auto text-[10px] font-bold text-[#0A6CD0] bg-blue-50 px-2 py-0.5 rounded-full">
          即將上線
        </span>
      </button>
    );
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      <div className="text-slate-500">{icon}</div>
      <span className="text-[13px] font-black text-slate-700">{label}</span>
    </Link>
  );
}
