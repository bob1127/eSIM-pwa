"use client";

import { useUser } from "../../components/context/UserContext";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import MenuToggle from "../../components/Header/index";
import { useRouter } from "next/router";

export const SlideTabsExample = () => {
  const router = useRouter();

  // Mobile 選單與滾動狀態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuActive, setIsMenuActive] = useState(false);
  const [isScrollingUp, setIsScrollingUp] = useState(true);
  const lastScrollY = useRef(0);

  // 直接從 Context 拿狀態（新版 UserContext 會首幀就帶入 localStorage 值）
  const { userInfo, isHydrated, logout } = useUser();

  const navLinks = [
    { label: "日本", href: "/product/japan/" },
    { label: "韓國", href: "/category/korea/" },
    { label: "中國", href: "/category/china/" },
    { label: "東南亞", href: "/category/malaysia/" },
    { label: "歐美", href: "/category/america/" },
    { label: "兌換QRcode", href: "/shopee-qrcode" },
    { label: "旅遊精選", href: "/blog" },
  ];

  // 監聽滾動方向（顯示/隱藏導覽）
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 0) return;
      if (currentY > lastScrollY.current && currentY > 50) {
        setIsScrollingUp(false);
      } else {
        setIsScrollingUp(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 登出（交給 Context 處理清理 & 同步），再導回首頁
  const handleLogout = () => {
    logout?.();
    router.push("/");
  };

  return (
    <>
      {/* ✅ 手機選單背景遮罩 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 z-[900] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full h-full bg-white/30 backdrop-blur-md pointer-events-auto" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Navbar：滾動時淡出/淡入 */}
      <AnimatePresence mode="wait">
        {!isMenuActive && (
          <motion.div
            key="navbar"
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: isScrollingUp ? 1 : 0,
              y: isScrollingUp ? 0 : -20,
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="fixed left-0 w-full top-6 z-[1200]"
          >
            <div className="flex justify-between items-center px-5 !rounded-[8px] bg-white py-[9.5px] mx-auto w-[96.5%] md:py-[9.5px]">
              {/* Logo */}
              <div className="w-[20%] pl-5">
                <Link href="/">
                  <div className="w-[40px]">
                    <Image
                      src="/images/logo/logo.svg"
                      alt="ESIM Logo"
                      width={120}
                      height={40}
                      priority
                    />
                  </div>
                </Link>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex w-[60%] justify-center gap-6 items-center">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group hover:bg-[#4badf4] relative h-10 rounded-full bg-transparent px-4 text-neutral-950"
                  >
                    <span className="relative inline-flex overflow-hidden">
                      <div className="translate-y-0 mt-2 text-slate-500 transition duration-500 group-hover:-translate-y-[150%] group-hover:skew-y-12">
                        {link.label}
                      </div>
                      <div className="absolute translate-y-[110%] mt-2 group-hover:text-white transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                        {link.label}
                      </div>
                    </span>
                  </Link>
                ))}
              </div>

              {/* Right Side Icons */}
              <div className="w-[80%] md:w-[20%]">
                <div className="flex items-center justify-center gap-4">
                  {/* Cart */}
                  <Link href="/Cart" className="hidden md:flex">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Cart</span>
                      <img
                        src="https://isetan.mistore.jp/on/demandware.static/-/Sites-eGift-Library/ja_JP/dw97e3b6f2/assets/images/common/icon-cart.svg"
                        alt="cart-icon"
                        className="w-[24px] h-[24px]"
                      />
                    </div>
                  </Link>

                  {/* Desktop User Info（以 Context + isHydrated 為準） */}
                  <div className="hidden md:flex items-center gap-3">
                    {!isHydrated ? (
                      <div className="w-[140px] h-[24px] rounded bg-black/5 animate-pulse" />
                    ) : userInfo ? (
                      <>
                        <Link
                          href="/account"
                          className="flex items-center gap-2"
                        >
                          <span className="text-sm">
                            Hello, {userInfo.name}
                          </span>
                          <img
                            src="/images/250721.jpg"
                            alt="account-icon"
                            className="w-[24px] h-[24px]"
                          />
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="hover:opacity-80 transition"
                          title="登出"
                        >
                          <img
                            src="/images/Nav/Logout--Streamline-Outlined-Material-Symbols.svg"
                            alt="logout-icon"
                            className="w-[24px] h-[24px]"
                          />
                        </button>
                      </>
                    ) : (
                      <Link href="/login" className="flex items-center gap-2">
                        <span className="text-sm">登入 / Account</span>
                        <img
                          src="/images/0721_0.jpg"
                          alt="account-icon"
                          className="w-[24px] h-[24px]"
                        />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-[20%] md:hidden"></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ MenuToggle 固定右上角 → 僅手機顯示，避免覆蓋桌機按鈕 */}
      <div className="fixed top-4 right-4 z-[1100] md:hidden">
        <MenuToggle isActive={isMenuActive} setIsActive={setIsMenuActive} />
      </div>

      {/* ✅ Mobile 漢堡選單內容（選單開關 isMenuOpen 你自己的事件要記得觸發 setIsMenuOpen） */}
      <AnimatePresence>
        {isHydrated && isMenuOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="md:hidden overflow-hidden px-4 pb-4 fixed top-[64px] left-0 right-0 z-[950] bg-[#3b57ff] text-white shadow-lg py-6 rounded-b-lg"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="py-2 border-b border-white/20"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {userInfo ? (
                <>
                  <span className="text-sm text-slate-200">
                    Hello, {userInfo.name}
                  </span>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="px-3 py-1 bg-white text-[#3b57ff] rounded hover:bg-gray-100 transition"
                  >
                    登出
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-3 py-1 bg-white text-[#3b57ff] rounded hover:bg-gray-100 transition"
                  onClick={() => setIsMenuOpen(false)}
                >
                  登入
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
