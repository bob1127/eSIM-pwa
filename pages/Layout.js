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
import AiChatWidget from "../components/AiChatWidget";
import EsimBottomSheet from "../components/EsimBottomSheet";

export default function RootLayout({ children, seo: seoOverride = {}, hideNavbar = false }) {
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
              {/* ✅ 提早包住所有元件 */}
              {!hideNavbar && <Navbar />}
              <Sidebar sidebarProduct={sidebarProduct} onAddToCart={handleAddToCart} />
              
              {children}
              
              <SmartWizardFloat />
              <AiChatWidget />
              {/* 手機版全域上拉選單：我的 eSIM（/shop 路徑內不顯示） */}
              <EsimBottomSheet />
              <Footer
                forceShow={
                  router.pathname === "/shop" ||
                  router.pathname?.startsWith("/shop/")
                }
              />
            </UserProvider>
          </NextThemesProvider>
        </NextUIProvider>

        <Banner />
      </div>
    </>
  );
}