import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import AOS from "aos";
import "aos/dist/aos.css";
import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import Navbar from "@/components/Navbar/Navbar.tsx";
import Banner from "@/components/banner";
import Footer from "@/components/ui/footer.jsx";
import SeoHead from "@/components/SeoHead";
import { resolvePageSeo } from "@/lib/seo.config";
import SmartWizardFloat from "@/components/SmartWizardFloat"; // 引入新元件 ✅
import Sidebar from "@/components/Sidebar.js"; // 引入側邊欄組件
import { UserProvider } from "../components/context/UserContext";
import EsimBottomSheet from "../components/EsimBottomSheet";

export default function RootLayout({
  children,
  seo: seoOverride = {},
  hideNavbar = false,
  /** 全幅 hero 等需貼頂時關閉預設頂部留白 */
  flushTop = false,
  hideFooter = false,
}) {
  const router = useRouter();
  const seo = useMemo(
    () => resolvePageSeo(router.pathname, router.asPath, seoOverride),
    [router.pathname, router.asPath, seoOverride],
  );
  const [sidebarProduct, setSidebarProduct] = useState(null); // 儲存購物車資料

  // handleAddToCart 用於更新 sidebarProduct
  const handleAddToCart = (product, quantity, selectedAttributes) => {
    const totalPrice = product.price * quantity; // 計算總價
    const variantId = getVariantId(selectedAttributes); // 根據選擇的屬性獲取變體 ID

    // 更新 sidebarProduct 狀態
    setSidebarProduct({
      name: product.name,
      price: product.price,
      quantity,
      totalPrice,
      variant: selectedAttributes,
      variantId,
    });
    
    // 顯示購物車側邊欄（根據需求控制顯示）
    // setIsSidebarOpen(true); // 注意：這裡原本的 code 有這行，但未定義 setIsSidebarOpen，請確認您的 Context 或 State
  };

  useEffect(() => {
    AOS.init({
      once: true,
      disable: "phone",
      duration: 700,
      easing: "ease-out-cubic",
    });
  }, []);

  return (
    <>
      <SeoHead {...seo} />

      <div className="w-full ">
        <NextUIProvider>
          <NextThemesProvider attribute="class" defaultTheme="light">
            <UserProvider>
              <a href="#main-content" className="skip-link">
                跳到主要內容
              </a>
              {/* ✅ 提早包住所有元件 */}
              {!hideNavbar && <Navbar />}
              <Sidebar sidebarProduct={sidebarProduct} onAddToCart={handleAddToCart} />

              {/* 浮動 Navbar 佔高：padding 加在第一層內容上，頁面底色才能貼頂、不露出白邊 */}
              <main
                id="main-content"
                tabIndex={-1}
                className={
                  !hideNavbar && !flushTop ? "layout-below-nav" : undefined
                }
              >
                {children}
              </main>

              <SmartWizardFloat />
              {/* AiChatWidget 已移至 _app，避免換頁卸載中斷請求 */}
              {!hideFooter ? (
                <Footer
                  forceShow={
                    router.pathname === "/shop" ||
                    router.pathname?.startsWith("/shop/")
                  }
                />
              ) : null}
              {/* 固定底欄：必須在 Footer 之後，勿再插入 in-flow 佔位（會在 footer 上方留白） */}
              <EsimBottomSheet />
            </UserProvider>
          </NextThemesProvider>
        </NextUIProvider>

        <Banner />
      </div>
    </>
  );
}