"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  LayoutDashboard,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/context/CartContext";
import NavbarSiteSearch from "@/components/Navbar/NavbarSiteSearch";
import { supabase } from "@/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CONTAINER = "max-w-[1280px] mx-auto px-6 lg:px-10";

function useShopMemberAuth() {
  const { data: session, status } = useSession();
  const [supabaseUser, setSupabaseUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled) setSupabaseUser(user || null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSupabaseUser(s?.user || null);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const isLoggedIn = status === "authenticated" || !!supabaseUser;
  const userName =
    supabaseUser?.user_metadata?.full_name ||
    supabaseUser?.user_metadata?.name ||
    session?.user?.name ||
    "會員";
  const userImage =
    supabaseUser?.user_metadata?.avatar_url ||
    supabaseUser?.user_metadata?.picture ||
    session?.user?.image ||
    null;

  return { isLoggedIn, userName, userImage };
}

function MemberAvatarIcon({ size = 18, isLoggedIn, userImage, userName }) {
  if (isLoggedIn && userImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={userImage}
        alt=""
        width={size}
        height={size}
        className="rounded-full object-cover ring-1 ring-slate-200"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }
  if (isLoggedIn) {
    const initial = String(userName || "會")
      .trim()
      .charAt(0)
      .toUpperCase();
    return (
      <span
        className="inline-flex items-center justify-center rounded-full bg-[#1a56db] text-white font-bold leading-none"
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.45) }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }
  return (
    <User
      className="opacity-90"
      style={{ width: size, height: size }}
      strokeWidth={1.75}
    />
  );
}

function MemberNavControl({
  isLoggedIn,
  isPartnerNav,
  loginHref,
  partnerAdminHref = "/partner/dashboard",
  memberBtnClass,
  memberAria,
  userName,
  memberIcon,
}) {
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <Link
        href={loginHref}
        className={memberBtnClass}
        aria-label={memberAria}
        title="會員登入"
      >
        {memberIcon}
      </Link>
    );
  }

  if (!isPartnerNav) {
    return (
      <Link
        href={loginHref}
        className={memberBtnClass}
        aria-label={memberAria}
        title={userName}
      >
        {memberIcon}
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={memberBtnClass}
        aria-label={memberAria}
        title={userName}
        render={<button type="button" />}
      >
        {memberIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-[11rem]">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block text-xs text-slate-400">已登入</span>
            <span className="block truncate font-semibold text-slate-800">
              {userName}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push(loginHref)}>
            <User className="size-4" />
            會員後台
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(partnerAdminHref)}>
            <LayoutDashboard className="size-4" />
            商店後台
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── 導覽資料 ──────────────────────────────────────────────────────
const SHOP_NAV = [
  {
    key: "best",
    label: "精選商品",
    href: "/shop/best-sellers",
    mega: {
      shopAllLabel: "查看全部商品",
      shopAllHref: "/shop/best-sellers",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/best-sellers",
          type: "link",
        },
        {
          key: "feature",
          label: "依類型選購",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "本週熱銷", href: "/shop/best-sellers" },
            { label: "新品上架", href: "/shop/new-arrivals" },
            { label: "限時特惠", href: "/shop/deals" },
            { label: "品牌推薦", href: "/shop/recommended" },
          ],
        },
        {
          key: "device",
          label: "依用途選購",
          type: "accordion",
          defaultOpen: false,
          children: [
            { label: "出國旅行", href: "/shop/travel" },
            { label: "商務出差", href: "/shop/series/business" },
            { label: "日常使用", href: "/shop/tech" },
          ],
        },
      ],
      products: [
        {
          title: "日本 5G eSIM 吃到飽（7天）",
          badge: "熱銷",
          img: "/images/shop/shop-product-01.png",
          href: "/product/japan",
        },
        {
          title: "65W 氮化鎵旅行充電器 折疊插頭",
          badge: "新品",
          img: "/images/shop/shop-product-02.png",
          href: "/shop/charger",
        },
        {
          title: "韓國 5G eSIM（5天）不限速",
          badge: "熱銷",
          img: "/images/shop/shop-product-03.png",
          href: "/product/korea",
        },
        {
          title: "全球通用轉接插座 150+國家",
          badge: null,
          img: "/images/shop/shop-product-04.png",
          href: "/shop/travel",
        },
        {
          title: "10000mAh USB-C 行動電源",
          badge: "特惠",
          img: "/images/shop/shop-product-05.png",
          href: "/shop/charger",
        },
        {
          title: "旅行收納整理包套組",
          badge: null,
          img: "/images/shop/shop-product-06.png",
          href: "/shop/travel",
        },
      ],
    },
  },
  {
    key: "charger",
    label: "充電配件",
    href: "/shop/charger",
    mega: {
      shopAllLabel: "查看所有充電配件",
      shopAllHref: "/shop/charger",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/charger",
          type: "link",
        },
        {
          key: "feature",
          label: "依類型選購",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "有線充電器", href: "/shop/charger/adapter" },
            { label: "充電線材", href: "/shop/charger/cable" },
            { label: "無線充電板", href: "/shop/charger/wireless" },
            { label: "MagSafe 配件", href: "/shop/charger/magsafe" },
            { label: "行動電源", href: "/shop/charger/power-bank" },
          ],
        },
        {
          key: "device",
          label: "依裝置選購",
          type: "accordion",
          defaultOpen: false,
          children: [
            { label: "iPhone 充電", href: "/shop/charger/iphone" },
            { label: "Android 充電", href: "/shop/charger/android" },
            { label: "筆電充電", href: "/shop/charger/laptop" },
          ],
        },
      ],
      products: [
        {
          title: "65W 氮化鎵 GaN 充電器",
          badge: "新品",
          img: "/images/shop/shop-product-07.png",
          href: "/shop/charger/adapter",
        },
        {
          title: "MagSafe 15W 無線充電板",
          badge: null,
          img: "/images/shop/shop-product-01.png",
          href: "/shop/charger/magsafe",
        },
        {
          title: "10000mAh 行動電源 PD 45W",
          badge: "熱銷",
          img: "/images/shop/shop-product-02.png",
          href: "/shop/charger/power-bank",
        },
        {
          title: "USB-C to Lightning 充電線 2m",
          badge: null,
          img: "/images/shop/shop-product-03.png",
          href: "/shop/charger/cable",
        },
        {
          title: "多孔 USB 充電站 6-Port",
          badge: "推薦",
          img: "/images/shop/shop-product-04.png",
          href: "/shop/charger/adapter",
        },
        {
          title: "車用 PD 快充充電器",
          badge: null,
          img: "/images/shop/shop-product-05.png",
          href: "/shop/charger/adapter",
        },
      ],
    },
  },
  {
    key: "travel",
    label: "旅行配件",
    href: "/shop/travel",
    mega: {
      shopAllLabel: "查看所有旅行配件",
      shopAllHref: "/shop/travel",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/travel",
          type: "link",
        },
        {
          key: "feature",
          label: "依類型選購",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "網路 & 通訊", href: "/shop/travel/network" },
            { label: "轉接插座", href: "/shop/travel/adapter-plug" },
            { label: "行李配件", href: "/shop/travel/luggage" },
            { label: "旅行收納", href: "/shop/travel/organizer" },
          ],
        },
        {
          key: "dest",
          label: "依目的地選購",
          type: "accordion",
          defaultOpen: false,
          children: [
            { label: "日本旅行套組", href: "/shop/travel/japan" },
            { label: "歐洲旅行套組", href: "/shop/travel/europe" },
          ],
        },
      ],
      products: [
        {
          title: "全球通用轉接插座 150+ 國家",
          badge: "熱銷",
          img: "/images/shop/shop-product-06.png",
          href: "/shop/travel/adapter-plug",
        },
        {
          title: "旅行防盜頸掛包",
          badge: null,
          img: "/images/shop/shop-product-07.png",
          href: "/shop/travel/organizer",
        },
        {
          title: "輕量摺疊旅行袋",
          badge: "新品",
          img: "/images/shop/shop-product-01.png",
          href: "/shop/travel/luggage",
        },
        {
          title: "旅行盥洗收納包",
          badge: null,
          img: "/images/shop/shop-product-02.png",
          href: "/shop/travel/organizer",
        },
        {
          title: "行李箱防塵套 20吋",
          badge: null,
          img: "/images/shop/shop-product-03.png",
          href: "/shop/travel/luggage",
        },
        {
          title: "隱形腰包 防扒設計",
          badge: "推薦",
          img: "/images/shop/shop-product-04.png",
          href: "/shop/travel/organizer",
        },
      ],
    },
  },
  {
    key: "tech",
    label: "3C 周邊",
    href: "/shop/tech",
    mega: {
      shopAllLabel: "查看所有 3C 周邊",
      shopAllHref: "/shop/tech",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/tech",
          type: "link",
        },
        {
          key: "feature",
          label: "依類型選購",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "手機配件", href: "/shop/tech/phone" },
            { label: "耳機 & 音響", href: "/shop/tech/audio" },
            { label: "螢幕保護貼", href: "/shop/tech/screen" },
            { label: "電腦周邊", href: "/shop/tech/computer" },
            { label: "智慧穿戴", href: "/shop/tech/wearable" },
          ],
        },
        {
          key: "brand",
          label: "依品牌選購",
          type: "accordion",
          defaultOpen: false,
          children: [
            { label: "Apple 配件", href: "/shop/tech/apple" },
            { label: "Samsung 配件", href: "/shop/tech/samsung" },
          ],
        },
      ],
      products: [
        {
          title: "ANC 主動降噪無線耳機",
          badge: "熱銷",
          img: "/images/shop/shop-product-05.png",
          href: "/shop/tech/audio",
        },
        {
          title: "iPhone 防窺螢幕保護貼",
          badge: null,
          img: "/images/shop/shop-product-06.png",
          href: "/shop/tech/screen",
        },
        {
          title: "磁吸手機支架 多角度",
          badge: "新品",
          img: "/images/shop/shop-product-07.png",
          href: "/shop/tech/phone",
        },
        {
          title: "藍牙追蹤器 防遺失",
          badge: "推薦",
          img: "/images/shop/shop-product-01.png",
          href: "/shop/tech/phone",
        },
        {
          title: "Type-C Hub 7合1",
          badge: null,
          img: "/images/shop/shop-product-02.png",
          href: "/shop/tech/computer",
        },
        {
          title: "智慧手錶保護貼",
          badge: null,
          img: "/images/shop/shop-product-03.png",
          href: "/shop/tech/wearable",
        },
      ],
    },
  },
  {
    key: "gear",
    label: "旅遊用品",
    href: "/shop/gear",
    mega: {
      shopAllLabel: "查看所有旅遊用品",
      shopAllHref: "/shop/gear",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/gear",
          type: "link",
        },
        {
          key: "feature",
          label: "依類型選購",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "健康防護", href: "/shop/gear/health" },
            { label: "輕量行李袋", href: "/shop/gear/bag" },
            { label: "旅遊攝影", href: "/shop/gear/photo" },
            { label: "戶外探索", href: "/shop/gear/outdoor" },
          ],
        },
      ],
      products: [
        {
          title: "記憶棉頸枕 可水洗",
          badge: "熱銷",
          img: "/images/shop/shop-product-04.png",
          href: "/shop/gear/health",
        },
        {
          title: "輕量摺疊後背包 20L",
          badge: null,
          img: "/images/shop/shop-product-05.png",
          href: "/shop/gear/bag",
        },
        {
          title: "旅行防曬霜 SPF50",
          badge: null,
          img: "/images/shop/shop-product-06.png",
          href: "/shop/gear/health",
        },
        {
          title: "Gorillapod 迷你三腳架",
          badge: "推薦",
          img: "/images/shop/shop-product-07.png",
          href: "/shop/gear/photo",
        },
        {
          title: "輕量雨衣收納袋",
          badge: null,
          img: "/images/shop/shop-product-01.png",
          href: "/shop/gear/outdoor",
        },
        {
          title: "旅行壓縮收納袋",
          badge: "新品",
          img: "/images/shop/shop-product-02.png",
          href: "/shop/gear/bag",
        },
      ],
    },
  },
  {
    key: "series",
    label: "品牌系列",
    href: "/shop/series",
    mega: {
      shopAllLabel: "查看所有系列",
      shopAllHref: "/shop/series",
      sections: [
        {
          key: "bestsellers",
          label: "熱銷精選",
          href: "/shop/series",
          type: "link",
        },
        {
          key: "s",
          label: "精選系列",
          type: "accordion",
          defaultOpen: true,
          children: [
            { label: "Jeko 精選", href: "/shop/series/jeko" },
            { label: "旅行達人套組", href: "/shop/series/traveler" },
            { label: "商務人士套組", href: "/shop/series/business" },
            { label: "學生出遊套組", href: "/shop/series/student" },
          ],
        },
      ],
      products: [
        {
          title: "出國必備旅行箱 eSIM+充電+收納",
          badge: "熱銷",
          img: "/images/shop/shop-product-03.png",
          href: "/shop/series/traveler",
        },
        {
          title: "商務出差精選套組",
          badge: "推薦",
          img: "/images/shop/shop-product-04.png",
          href: "/shop/series/business",
        },
        {
          title: "日本旅行達人套組",
          badge: null,
          img: "/images/shop/shop-product-05.png",
          href: "/shop/series/traveler",
        },
        {
          title: "學生出遊輕量套組",
          badge: "新品",
          img: "/images/shop/shop-product-06.png",
          href: "/shop/series/student",
        },
        {
          title: "Jeko 品牌限量禮盒",
          badge: null,
          img: "/images/shop/shop-product-07.png",
          href: "/shop/series/jeko",
        },
        {
          title: "親子旅行便利套組",
          badge: null,
          img: "/images/shop/shop-product-01.png",
          href: "/shop/series/traveler",
        },
      ],
    },
  },
];

const SECONDARY_NAV = [
  { label: "依需求選購", href: "/shop/shop-by" },
  { label: "會員專屬", href: "/shop/member" },
  { label: "探索與支援", href: "/shop/support" },
];

const DEFAULT_UTILITY_NAV = [
  { label: "eSIM 方案", href: "/product" },
  { label: "旅遊文章", href: "/blog" },
  { label: "最新優惠", href: "/promo" },
  { label: "常見問題", href: "/faq" },
];

const DEFAULT_UTILITY_END = { label: "關於我們", href: "/about" };

// ── 左側 Accordion / Link ─────────────────────────────────────────
function LeftSection({ section, activeLeft, setActiveLeft }) {
  const [open, setOpen] = useState(section.defaultOpen ?? false);

  if (section.type === "link") {
    const active = activeLeft === section.key;
    return (
      <button
        type="button"
        onClick={() => setActiveLeft(section.key)}
        className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
          active
            ? "bg-[#f0f0f0] text-slate-900 font-semibold"
            : "text-slate-700 hover:bg-[#f5f5f5]"
        }`}
      >
        {section.label}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold text-slate-800 hover:bg-[#f5f5f5] transition-colors"
      >
        {section.label}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>
      {open && section.children && (
        <div className="pb-1">
          {section.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block pl-8 pr-4 py-1.5 text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Mega Dropdown（滿版，內容對齊 CONTAINER） ─────────────────────
function MegaMenu({ mega, visible }) {
  const [activeLeft, setActiveLeft] = useState(
    mega.sections.find((s) => s.type === "link")?.key || mega.sections[0]?.key,
  );

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="w-full bg-white border-t border-slate-200"
    >
      {/* 內容與 navbar 同寬對齊 */}
      <div className={`${CONTAINER} flex`} style={{ minHeight: 360 }}>
        {/* 左側選單 */}
        <div className="w-[220px] shrink-0 border-r border-slate-100 py-5 flex flex-col">
          <div className="flex-1 space-y-0.5">
            {mega.sections.map((sec) => (
              <LeftSection
                key={sec.key}
                section={sec}
                activeLeft={activeLeft}
                setActiveLeft={setActiveLeft}
              />
            ))}
          </div>
          <div className="px-4 pt-4 mt-auto">
            <Link
              href={mega.shopAllHref}
              className="block w-full text-center text-[12px] font-bold bg-black text-white py-2.5 px-3 hover:bg-slate-800 transition-colors"
            >
              {mega.shopAllLabel}
            </Link>
          </div>
        </div>

        {/* 右側商品格 */}
        <div className="flex-1 py-5 pl-8 pr-2">
          <p className="text-[14px] font-bold text-slate-900 mb-4">熱銷精選</p>
          <div className="grid grid-cols-3 gap-3">
            {mega.products.map((p, i) => (
              <Link
                key={i}
                href={p.href}
                className="group flex items-center gap-3 bg-[#f7f7f7] hover:bg-[#f0f0f0] rounded-lg p-3 transition-colors"
              >
                <div className="relative w-16 h-16 shrink-0 overflow-hidden">
                  <Image
                    src={p.img}
                    alt={p.title}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {p.badge && (
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 border ${
                        p.badge === "新品"
                          ? "border-sky-300 text-sky-600 bg-sky-50"
                          : p.badge === "熱銷"
                            ? "border-orange-300 text-orange-600 bg-orange-50"
                            : "border-blue-300 text-blue-600 bg-blue-50"
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                  <p className="text-[12.5px] text-slate-800 leading-snug line-clamp-2">
                    {p.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── 主元件 ─────────────────────────────────────────────────────────
export default function ShopNavbar({
  cartCount: cartCountProp = 0,
  compact = false,
  /** 覆寫主選單（夥伴賣場：國家列表，無 mega） */
  primaryNav = null,
  /** 次要選單覆寫；傳 [] 可隱藏 */
  secondaryNav = null,
  homeHref = "/shop",
  brandLabel = "Jeko 商城",
  loginHref = "/login",
  promoHref = "/shop/deals",
  supportHref = "/shop/support",
  /** 頂部灰列捷徑；傳 [] 可隱藏 */
  utilityNav = null,
  /** 灰列右側連結；傳 null 隱藏 */
  utilityEnd = undefined,
  searchScope = "site",
  searchDomain = "",
  /** 'physical' = /shop 實體車；'esim' = 夥伴賣場 eSIM 車 */
  cartMode = "physical",
  /** 夥伴商店後台連結（會員下拉選單） */
  partnerAdminHref = "/partner/dashboard",
  /** 編輯器預覽：依畫布寬度強制 RWD（不受瀏覽器視窗 media query 影響） */
  forceViewport = null,
}) {
  const { physicalCount, esimCount, setIsCartOpen } = useCart();
  const cartCount =
    (cartMode === "esim" ? esimCount : physicalCount) || cartCountProp;
  const { isLoggedIn, userName, userImage } = useShopMemberAuth();
  const [activeKey, setActiveKey] = useState(null);
  const [headerBottom, setHeaderBottom] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const headerRef = useRef(null);
  const hideTimer = useRef(null);
  const forceMobileNav =
    forceViewport === "mobile" || forceViewport === "tablet";

  const navItems = primaryNav ?? SHOP_NAV;
  const secondaryItems = secondaryNav ?? SECONDARY_NAV;
  const utilLinks = utilityNav ?? DEFAULT_UTILITY_NAV;
  const utilEnd =
    utilityEnd === undefined ? DEFAULT_UTILITY_END : utilityEnd;
  const isPartnerNav = cartMode === "esim";

  const memberBtnClass =
    "p-2 hover:bg-slate-50 rounded transition-colors inline-flex items-center justify-center";
  const memberAria = isLoggedIn ? "會員中心" : "會員登入";
  const memberIcon = (
    <MemberAvatarIcon
      size={24}
      isLoggedIn={isLoggedIn}
      userImage={userImage}
      userName={userName}
    />
  );

  useEffect(() => {
    const update = () => {
      if (headerRef.current) {
        setHeaderBottom(headerRef.current.getBoundingClientRect().bottom);
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const showMenu = useCallback((key) => {
    clearTimeout(hideTimer.current);
    setActiveKey(key);
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimer.current = window.setTimeout(() => setActiveKey(null), 120);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <>
      <header ref={headerRef} className="sticky top-0 z-[8000] bg-white">
        {/* ════ ① 頂部品牌列（黑底） ════ */}

        {/* ════ ② 促銷公告列（藍底） ════ */}
        <div className="bg-[#2B6CB0]">
          <div
            className={`${CONTAINER} h-9 flex items-center justify-center relative`}
          >
            <Link
              href={promoHref}
              className={`text-white text-[12px] font-medium hover:underline flex items-center gap-2 ${
                forceMobileNav ? "truncate max-w-[85%] justify-center" : ""
              }`}
            >
              全站限時 7.5 折優惠，出國必備一次購齊
              <span className="opacity-80">|</span>
              <span className="font-bold">立即選購 &gt;&gt;</span>
            </Link>
            <Link
              href={supportHref}
              className={`absolute right-6 lg:right-10 text-white/80 text-[11px] hover:text-white hover:underline ${
                forceMobileNav ? "hidden" : ""
              }`}
            >
              客服支援
            </Link>
          </div>
        </div>
        <div className="bg-[#F1F2F4] text-slate-600 border-b border-slate-200/80">
          <div
            className={`${CONTAINER} h-9 flex items-center gap-4 justify-between`}
          >
            {isPartnerNav ? (
              <nav
                className={`${forceMobileNav ? "hidden" : "hidden md:flex"} items-center gap-3 lg:gap-4 text-[11px] font-medium tracking-wide min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
                aria-label="商品分類"
              >
                <span className="shrink-0 text-slate-400">商品分類</span>
                <Link
                  href={`${homeHref}#plans`}
                  className="shrink-0 font-bold text-slate-800 hover:text-slate-900"
                >
                  全部方案
                </Link>
                {navItems.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="shrink-0 hover:text-slate-900 transition-colors"
                    onMouseEnter={() => item.mega && showMenu(item.key)}
                    onMouseLeave={scheduleHide}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : utilLinks.length ? (
              <nav
                className="flex items-center gap-4 sm:gap-5 text-[11px] font-medium tracking-wide overflow-x-auto min-w-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="快速連結"
              >
                {utilLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 hover:text-slate-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : (
              <span />
            )}
            {isPartnerNav && utilLinks.length ? (
              <nav
                className="flex items-center gap-4 sm:gap-5 text-[11px] font-medium tracking-wide shrink-0 ml-auto"
                aria-label="本店導覽"
              >
                {utilLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="shrink-0 hover:text-slate-900 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : utilEnd?.href ? (
              <Link
                href={utilEnd.href}
                className="shrink-0 ml-auto text-[11px] font-semibold text-slate-700 hover:text-slate-900 tracking-wide"
              >
                {utilEnd.label}
              </Link>
            ) : null}
          </div>
        </div>

        {/* ════ ③ 主 Navbar（白底）— compact：單列整合 ════ */}
        <div className="bg-white border-b border-slate-200">
          {compact ? (
            /* 單列：Logo + 分類 + 次要連結 + Icons */
            <div
              className={`${CONTAINER} h-14 flex items-center gap-4 lg:gap-6`}
            >
              <Link href={homeHref} className="flex items-center gap-2.5 shrink-0">
                <Image
                  src="/images/Logo/logo-no-bg.png"
                  alt="Jeko"
                  width={80}
                  height={28}
                  className="h-7 w-auto object-contain"
                />
                <span className="hidden xl:block text-[11px] text-slate-400 border-l border-slate-200 pl-2.5 leading-tight">
                  {brandLabel}
                </span>
              </Link>

              <nav className={`${forceMobileNav ? "hidden" : "hidden lg:flex"} items-center h-full flex-1 min-w-0`}>
                {isPartnerNav ? (
                  <Link
                    href={`${homeHref}#plans`}
                    className="relative h-full flex items-center px-2.5 xl:px-3 text-[13px] font-black text-[#1E4AD1] whitespace-nowrap"
                  >
                    全部方案
                  </Link>
                ) : null}
                {navItems.map((item) => (
                  <div
                    key={item.key}
                    className="relative h-full flex items-center"
                    onMouseEnter={() => item.mega && showMenu(item.key)}
                    onMouseLeave={scheduleHide}
                  >
                    <Link
                      href={item.href}
                      className={`relative h-full flex items-center px-2.5 xl:px-3 text-[13px] font-medium transition-colors whitespace-nowrap ${
                        activeKey === item.key
                          ? "text-slate-900"
                          : "text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                      {activeKey === item.key && (
                        <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-black rounded-sm" />
                      )}
                    </Link>
                  </div>
                ))}
              </nav>

              {!isPartnerNav ? (
              <nav className={`${forceMobileNav ? "hidden" : "hidden xl:flex"} items-center h-full gap-0.5 shrink-0`}>
                {secondaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="h-full flex items-center px-2 text-[12px] text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              ) : null}

              <div className="flex items-center gap-0.5 shrink-0 ml-auto lg:ml-0">
                <NavbarSiteSearch
                  variant="icon"
                  scope={searchScope}
                  domain={searchDomain}
                />
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 hover:bg-slate-50 rounded transition-colors"
                  aria-label="購物車"
                >
                  <ShoppingCart
                    className="w-6 h-6 text-slate-700"
                    strokeWidth={1.75}
                  />
                  {cartCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 bg-[#3B9EFF] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
                <MemberNavControl
                  isLoggedIn={isLoggedIn}
                  isPartnerNav={isPartnerNav}
                  loginHref={loginHref}
                  partnerAdminHref={partnerAdminHref}
                  memberBtnClass={memberBtnClass}
                  memberAria={memberAria}
                  userName={userName}
                  memberIcon={memberIcon}
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className={`${forceMobileNav ? "" : "lg:hidden"} p-2 hover:bg-slate-50 rounded transition-colors`}
                  aria-label="選單"
                >
                  <Menu className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`${CONTAINER} h-14 flex items-center justify-between gap-4`}
              >
                <Link
                  href={homeHref}
                  className="flex items-center gap-3 shrink-0 min-w-0"
                >
                  <Image
                    src="/images/Logo/logo-no-bg.png"
                    alt="Jeko"
                    width={80}
                    height={28}
                    className="h-7 w-auto object-contain"
                  />
                  <span className={`${forceViewport === "mobile" ? "hidden" : "hidden sm:block"} text-[11px] text-slate-400 border-l border-slate-200 pl-3 leading-tight truncate max-w-[140px]`}>
                    {brandLabel}
                  </span>
                </Link>

                <div className="flex items-center gap-1">
                  <NavbarSiteSearch
                    variant="icon"
                    scope={searchScope}
                    domain={searchDomain}
                  />
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-2 hover:bg-slate-50 rounded transition-colors"
                    aria-label="購物車"
                  >
                    <ShoppingCart
                      className="w-6 h-6 text-slate-700"
                      strokeWidth={1.75}
                    />
                    {cartCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 bg-[#3B9EFF] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </button>
                  <MemberNavControl
                    isLoggedIn={isLoggedIn}
                    isPartnerNav={isPartnerNav}
                    loginHref={loginHref}
                    partnerAdminHref={partnerAdminHref}
                    memberBtnClass={memberBtnClass}
                    memberAria={memberAria}
                    userName={userName}
                    memberIcon={memberIcon}
                  />
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className={`${forceMobileNav ? "" : "lg:hidden"} p-2 hover:bg-slate-50 rounded transition-colors`}
                    aria-label="選單"
                  >
                    <Menu className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* 下列：主站分類（夥伴分類已在灰列） */}
              {!isPartnerNav ? (
              <div>
              <div
                className={`${CONTAINER} h-11 ${forceMobileNav ? "hidden" : "hidden lg:flex"} items-center gap-3 ${
                  isPartnerNav ? "" : "justify-between"
                }`}
              >
                {isPartnerNav ? (
                  <span className="shrink-0 text-[11px] font-black tracking-[0.12em] text-slate-400 pr-3 border-r border-slate-200">
                    商品分類
                  </span>
                ) : null}
                <nav className="flex items-center h-full flex-1 min-w-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {isPartnerNav ? (
                    <Link
                      href={`${homeHref}#plans`}
                      className="relative h-full flex items-center px-3.5 text-[13px] font-black text-slate-900 whitespace-nowrap hover:text-slate-700"
                    >
                      全部方案
                    </Link>
                  ) : null}
                  {navItems.map((item) => (
                    <div
                      key={item.key}
                      className="relative h-full flex items-center"
                      onMouseEnter={() => item.mega && showMenu(item.key)}
                      onMouseLeave={scheduleHide}
                    >
                      <Link
                        href={item.href}
                        className={`relative h-full flex items-center px-3.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                          activeKey === item.key
                            ? "text-slate-900"
                            : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                        {activeKey === item.key && (
                          <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-black rounded-sm" />
                        )}
                      </Link>
                    </div>
                  ))}
                </nav>

                {!isPartnerNav ? (
                <nav className="flex items-center h-full gap-1">
                  {secondaryItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="h-full flex items-center px-3 text-[13px] text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                ) : null}
              </div>
              </div>
              ) : null}
            </>
          )}
        </div>
      </header>

      {/* ── Mega Dropdown：fixed 滿版，內容對齊 CONTAINER ── */}
      <AnimatePresence>
        {navItems.filter((i) => i.mega).map((item) =>
          activeKey === item.key ? (
            <div
              key={item.key}
              style={{
                position: "fixed",
                top: headerBottom,
                left: 0,
                right: 0,
                zIndex: 8100,
              }}
              onMouseEnter={() => showMenu(item.key)}
              onMouseLeave={scheduleHide}
            >
              <MegaMenu mega={item.mega} visible />
            </div>
          ) : null,
        )}
      </AnimatePresence>

      {/* ── 手機側滑選單 ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[8900]"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed left-0 top-0 bottom-0 w-[80vw] max-w-[320px] bg-white z-[8901] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100 shrink-0">
                <Image
                  src="/images/LOGO.png"
                  alt="Jeko"
                  width={64}
                  height={22}
                  className="h-5 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <nav className="flex-1 py-2 overflow-y-auto">
                {isPartnerNav ? (
                  <p className="px-4 pt-2 pb-1 text-[10px] font-black tracking-[0.14em] text-[#1E4AD1]">
                    商品分類
                  </p>
                ) : null}
                {isPartnerNav ? (
                  <Link
                    href={`${homeHref}#plans`}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 text-[14px] font-black text-[#1E4AD1] hover:bg-slate-50"
                  >
                    全部方案
                  </Link>
                ) : null}
                {navItems.map((item) => (
                  <div key={item.key}>
                    <div
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                      onClick={() =>
                        item.mega
                          ? setMobileExpanded(
                              mobileExpanded === item.key ? null : item.key,
                            )
                          : setMobileOpen(false)
                      }
                    >
                      <Link
                        href={item.href}
                        onClick={(e) => item.mega && e.preventDefault()}
                        className="text-[14px] text-slate-800 font-medium"
                      >
                        {item.label}
                      </Link>
                      {item.mega &&
                        (mobileExpanded === item.key ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ))}
                    </div>
                    {item.mega && mobileExpanded === item.key && (
                      <div className="bg-slate-50 px-5 py-2 border-y border-slate-100 space-y-0.5">
                        {item.mega.sections.flatMap((sec) =>
                          sec.children
                            ? sec.children.map((c) => (
                                <Link
                                  key={c.href}
                                  href={c.href}
                                  onClick={() => setMobileOpen(false)}
                                  className="block py-1.5 text-[13px] text-slate-500 hover:text-slate-900"
                                >
                                  {c.label}
                                </Link>
                              ))
                            : [
                                <Link
                                  key={sec.href || sec.key}
                                  href={sec.href || "#"}
                                  onClick={() => setMobileOpen(false)}
                                  className="block py-1.5 text-[13px] text-slate-500 hover:text-slate-900"
                                >
                                  {sec.label}
                                </Link>,
                              ],
                        )}
                        <Link
                          href={item.mega.shopAllHref}
                          onClick={() => setMobileOpen(false)}
                          className="block mt-2 text-center text-[12px] font-bold bg-black text-white py-2"
                        >
                          {item.mega.shopAllLabel}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  {isPartnerNav ? (
                    <p className="px-4 pt-1 pb-1 text-[10px] font-black tracking-[0.14em] text-slate-400">
                      本店服務
                    </p>
                  ) : null}
                  {secondaryItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="block px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </nav>
              <div className="shrink-0 px-4 py-4 border-t border-slate-100 space-y-2">
                {isLoggedIn && isPartnerNav ? (
                  <>
                    <Link
                      href={loginHref}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-black text-white text-sm font-bold justify-center"
                    >
                      <MemberAvatarIcon
                        size={20}
                        isLoggedIn={isLoggedIn}
                        userImage={userImage}
                        userName={userName}
                      />
                      會員後台
                    </Link>
                    <Link
                      href={partnerAdminHref}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 border border-slate-200 text-slate-800 text-sm font-bold justify-center hover:bg-slate-50"
                    >
                      <LayoutDashboard className="size-5" />
                      商店後台
                    </Link>
                  </>
                ) : (
                  <Link
                    href={loginHref}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 bg-black text-white text-sm font-bold justify-center"
                  >
                    <MemberAvatarIcon
                      size={20}
                      isLoggedIn={isLoggedIn}
                      userImage={userImage}
                      userName={userName}
                    />
                    {isLoggedIn ? "會員中心" : "登入 / 註冊"}
                  </Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
