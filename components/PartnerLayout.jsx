import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/context/CartContext";
import {
  ShoppingBagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { SITE_FAVICON } from "@/lib/pwaConfig";

// 註冊 GSAP 插件
if (typeof window !== "undefined") {
  gsap.registerPlugin(SplitText);
}

export default function PartnerLayout({ store, children, title, description }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const [user, setUser] = useState(null);

  // 從 CartContext 取得購物車資料 (不再需要 setIsCartOpen)
  const { esimCount } = useCart();

  const cartItemCount = esimCount || 0;

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await import("@/lib/supabaseClient").then((m) =>
        m.supabase.auth.getUser(),
      );
      if (data?.user) {
        setUser({
          name:
            data.user.user_metadata?.full_name ||
            data.user.email?.split("@")[0],
          image: data.user.user_metadata?.avatar_url,
          email: data.user.email,
        });
      } else if (session?.user) {
        setUser(session.user);
      }
    };
    fetchUser();
  }, [session]);

  // --- GSAP Overlay Menu ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef(null);
  const tlRef = useRef(null);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      new SplitText(".nav-items a", { type: "lines", linesClass: "line" });
      gsap.set(".line", { y: "100%" });

      tlRef.current = gsap.timeline({
        paused: true,
        onComplete: () => {
          isAnimatingRef.current = false;
        },
        onReverseComplete: () => {
          gsap.set(".line", { y: "100%" });
          isAnimatingRef.current = false;
        },
      });

      tlRef.current.to(".nav-bg", {
        scaleY: 1,
        duration: 0.75,
        stagger: 0.1,
        ease: "power3.inOut",
      });
      tlRef.current.to(
        ".nav-items",
        {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
          duration: 0.75,
          ease: "power3.inOut",
        },
        "-=0.6",
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const toggleMenu = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    if (!isMenuOpen) {
      setIsMenuOpen(true);
      tlRef.current.play();
      gsap.to(
        [
          ".nav-socials .line",
          ".nav-legal .line",
          ".nav-primary-links .line",
          ".nav-secondary-links .line",
        ],
        {
          y: "0%",
          duration: 0.75,
          stagger: 0.05,
          ease: "power3.out",
          delay: 0.85,
        },
      );
    } else {
      setIsMenuOpen(false);
      tlRef.current.reverse();
    }
  };

  const defaultDesc = `探索世界，網路無縫連接。購買 ${store?.store_name} 精選 eSIM 方案。`;

  if (!store)
    return (
      <div className="min-h-screen flex items-center justify-center text-blue-600 font-bold">
        載入中...
      </div>
    );

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-white text-[#1c1e21] font-sans selection:bg-blue-600 selection:text-white flex flex-col"
    >
      <Head>
        <title>
          {title
            ? `${title} | ${store.store_name}`
            : `${store.store_name} | 官方授權專屬商城`}
        </title>
        <meta
          name="description"
          content={description || store.description || defaultDesc}
        />
        <meta name="author" content="JEKO eSIM 極客數位企業社" />
        <meta property="og:site_name" content="JEKO eSIM" />
        <link
          rel="canonical"
          href={`https://www.jekoesim.com/p/${store.domain}`}
        />
        <link rel="icon" href={SITE_FAVICON} />
      </Head>

      {/* --- 全域樣式 (GSAP Menu) --- */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .nav-toggler { background: none; border: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px; cursor: pointer; width: 30px; height: 30px; }
        .nav-toggler span { width: 24px; height: 2px; background-color: #1c1e21; transition: all 0.4s ease; }
        .nav-content { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; pointer-events: none; z-index: 100; }
        .nav-content.active { pointer-events: auto; }
        .nav-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: scaleY(0); transform-origin: top; will-change: transform; }
        .nav-bg:nth-child(1) { background-color: #e0f2fe; z-index: 101; } 
        .nav-bg:nth-child(2) { background-color: #1e3a8a; z-index: 102; } 
        .nav-bg:nth-child(3) { background-color: #1d4ed8; z-index: 103; } 
        .nav-bg:nth-child(4) { background-color: #1e3a8a; z-index: 104; } 
        .nav-items { position: absolute; inset: 0; display: flex; gap: 4rem; padding: 8rem 6rem; background-color: #1e3a8a; clip-path: polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%); will-change: clip-path; z-index: 105; }
        .nav-items-col:nth-child(1) { flex: 2; display: flex; flex-direction: column; justify-content: flex-start; gap: 3rem; }
        .nav-items-col:nth-child(2) { flex: 4; display: flex; gap: 5rem; justify-content: space-between; }
        .nav-items a { text-decoration: none; color: #fff; display: block; line-height: 1.2; margin-bottom: 0.5rem; overflow: hidden; font-weight: 300; }
        .nav-socials a { font-size: 1.25rem; font-weight: 300; }
        .nav-legal a { font-size: 0.9rem; color: #93c5fd; font-weight: 300; }
        .nav-primary-links a { font-size: 3.5rem; font-weight: 300; transition: color 0.3s; }
        .nav-primary-links a:hover { color: #e0f2fe; } 
        .nav-secondary-links a { font-size: 1.5rem; font-weight: 300; margin-bottom: 1rem; }
        .nav-content a .line { position: relative; will-change: transform; }
        @media (max-width: 768px) {
          .nav-items { flex-direction: column; padding: 6rem 2rem; justify-content: center; }
          .nav-items-col:nth-child(1) { display: none; }
          .nav-items-col:nth-child(2) { flex-direction: column; gap: 3rem; }
          .nav-primary-links a { font-size: 2.25rem; }
        }
      `,
        }}
      />

      {/* --- Overlay Menu --- */}
      <div className={`nav-content ${isMenuOpen ? "active" : ""}`}>
        <div className="nav-bg"></div>
        <div className="nav-bg"></div>
        <div className="nav-bg"></div>
        <div className="nav-bg"></div>
        <div className="nav-items relative overflow-hidden">
          <button
            onClick={toggleMenu}
            className="absolute top-8 left-8 md:top-12 md:left-12 z-[110] flex items-center gap-3 text-white hover:text-blue-200 transition group cursor-pointer bg-transparent border-none outline-none"
          >
            <div className="w-8 h-[2px] bg-white group-hover:w-4 transition-all duration-300"></div>
            <span className="font-medium tracking-widest uppercase text-sm">
              Close
            </span>
          </button>

          <div className="nav-items-col mt-4 md:mt-0">
            <div className="brand-info text-white/70">
              <p className="text-xl font-bold mb-1 text-white">
                關於 {store.store_name}
              </p>
              <p className="text-sm">
                您的官方認證 eSIM
                通訊服務合作夥伴，提供最穩定、快速的全球網路方案。
              </p>
            </div>
            <div className="nav-socials">
              <a href="#">關於我們</a>
              <a href="#">最新動態</a>
              <a href="https://line.me/" target="_blank" rel="noreferrer">
                LINE 官方客服
              </a>
            </div>
            <div className="nav-legal pt-4 border-t border-blue-400">
              <a href="#">Cookie 政策</a>
              <a href="#">輔助功能</a>
            </div>
          </div>
          <div className="nav-items-col mt-4 md:mt-0">
            <div className="nav-primary-links">
              <Link href={`/p/${store.domain}`} onClick={toggleMenu}>
                首頁
              </Link>
              <Link href={`/p/${store.domain}#shop`} onClick={toggleMenu}>
                所有方案
              </Link>
              <Link href="/tutorial" onClick={toggleMenu}>
                安裝教學
              </Link>
            </div>
            <div className="nav-secondary-links w-full md:w-auto md:text-right">
              <p className="text-sm font-bold text-blue-200 uppercase mb-4 tracking-widest">
                快速連結
              </p>
              <Link href={`/p/${store.domain}/cart`} onClick={toggleMenu}>
                購物車
              </Link>
              <Link href={`/p/${store.domain}/account`} onClick={toggleMenu}>
                訂單查詢
              </Link>
              <Link href={`/p/${store.domain}/account`} onClick={toggleMenu}>
                會員中心
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="top-nav bg-[#2374d6] flex justify-center py-3 relative z-40">
        <p className="text-xs text-white mx-auto">
          全站限時優惠！購買任一方案享回饋。
        </p>
      </div>

      {/* --- Navbar --- */}
      <nav className="flex justify-between items-center px-6 py-4 bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="flex items-center gap-8">
          <Link href={`/p/${store.domain}`} className="flex items-center gap-2">
            {store.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={store.store_name}
                className="h-6 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-xl font-bold tracking-tight text-[#1c1e21]">
                {store.store_name}
              </span>
            )}
          </Link>
          <div className="hidden md:flex items-center space-x-6 font-semibold text-sm text-[#1c1e21]">
            <Link
              href={`/p/${store.domain}`}
              className="hover:text-blue-600 transition"
            >
              首頁
            </Link>
            <Link
              href={`/p/${store.domain}#shop`}
              className="hover:text-blue-600 transition"
            >
              精選方案
            </Link>
            <Link
              href={`/p/${store.domain}/tutorial`}
              className="hover:text-blue-600 transition"
            >
              使用教學
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-5 text-[#1c1e21]">
          <span className="hidden md:block text-[10px] font-bold text-gray-400 tracking-widest uppercase mr-2 mt-0.5">
            Powered by JEKO
          </span>

          {/* 🌟 核心修改：將按鈕改為直接導向 /cart 的 Link */}
          <Link
            href={`/p/${store.domain}/cart`}
            className="hover:text-blue-600 transition relative flex items-center justify-center"
          >
            <ShoppingBagIcon className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                {cartItemCount}
              </span>
            )}
          </Link>

          {/* 🌟 會員下拉選單 */}
          <div className="relative ml-1">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              onBlur={() => setTimeout(() => setIsUserMenuOpen(false), 200)} // 點擊其他地方自動收起
              className="hover:text-blue-600 transition flex items-center justify-center focus:outline-none"
            >
              {user ? (
                user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-6 h-6 bg-[#0064e0] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                )
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </button>

            {/* 下拉選單內容 */}
            <div
              className={`absolute right-0 mt-3 w-40 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden transition-all duration-200 origin-top-right ${
                isUserMenuOpen
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              {user ? (
                <div className="py-2">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-xs text-gray-400">登入為</p>
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {user.name}
                    </p>
                  </div>
                  <Link
                    href={`/p/${store.domain}/account`}
                    className="block px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-[#0064e0] transition-colors"
                  >
                    會員中心
                  </Link>
                </div>
              ) : (
                <div className="py-2">
                  <Link
                    href={`/p/${store.domain}/login`}
                    className="block px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-blue-50 hover:text-[#0064e0] transition-colors"
                  >
                    登入 / 註冊
                  </Link>
                </div>
              )}
            </div>
          </div>
          <button
            className="nav-toggler ml-2 relative"
            onClick={toggleMenu}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
          </button>
        </div>
      </nav>

      {/* --- 🌟 頁面主要內容會被塞在這裡 --- */}
      <main className="flex-grow">{children}</main>

      {/* --- Footer --- */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8 px-6 text-[13px] text-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              {store.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logo_url}
                  alt={store.store_name}
                  className="h-5 grayscale opacity-70"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-lg font-bold tracking-tight text-[#1c1e21]">
                  {store.store_name}
                </span>
              )}
            </div>
            <p className="mb-4 font-light">
              官方授權經銷商店。
              <br />
              提供最穩定的全球數位通訊服務。
            </p>
          </div>
          <div>
            <h4 className="font-bold text-[#1c1e21] mb-4">線上商店</h4>
            <ul className="space-y-3 font-light">
              <li>
                <Link
                  href={`/p/${store.domain}#shop`}
                  className="hover:text-[#0064e0] transition"
                >
                  所有方案
                </Link>
              </li>
              <li>
                <Link
                  href="/tutorial"
                  className="hover:text-[#0064e0] transition"
                >
                  安裝教學
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#1c1e21] mb-4">會員服務</h4>
            <ul className="space-y-3 font-light">
              <li>
                <Link
                  href={`/p/${store.domain}/account`}
                  className="hover:text-[#0064e0] transition"
                >
                  會員中心 / 訂單查詢
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-[#1c1e21] mb-4">技術支援</h4>
            <ul className="space-y-3 font-light">
              <li>
                <button
                  onClick={() => window.open("https://line.me/", "_blank")}
                  className="hover:text-[#0064e0] transition"
                >
                  LINE 官方客服
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex justify-between items-center pt-6 border-t border-gray-100 font-light text-xs">
          <p>
            © {new Date().getFullYear()} {store.store_name}. Powered by JEKO
            eSIM.
          </p>
        </div>
      </footer>
    </div>
  );
}
