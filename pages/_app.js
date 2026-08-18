// pages/_app.js
import '../src/globals.css'; // 確保路徑正確
import Head from 'next/head'; 
import { NextUIProvider } from '@nextui-org/react'; 
import { SessionProvider } from "next-auth/react"; // 🌟 引入 NextAuth 的 SessionProvider
import { CartProvider } from "../components/context/CartContext"; 
import { UserProvider } from "../components/context/UserContext"; 
import { PWA_LOGO, PWA_APP_NAME, SITE_FAVICON, SITE_APPLE_TOUCH_ICON } from "../lib/pwaConfig";
import PartnerRecoveryRedirect from "../components/PartnerRecoveryRedirect";
import SupabaseOAuthRedirect from "../components/SupabaseOAuthRedirect";
import PWARegister from "../components/PWARegister";
import ReferralCapture from "../components/ReferralCapture";
import WelcomeGiftPopup from "../components/WelcomeGiftPopup";
import LineInviteGuestPopup from "../components/LineInviteGuestPopup";

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#147AD7" />
        <link rel="icon" href={SITE_FAVICON} type="image/png" sizes="32x32" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href={SITE_APPLE_TOUCH_ICON} />
        <link rel="apple-touch-icon" href={PWA_LOGO} sizes="192x192" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content={PWA_APP_NAME} />
        <meta name="apple-mobile-web-app-title" content={PWA_APP_NAME} />
      </Head>

      {/* 🌟 用 SessionProvider 包覆全站，讓所有組件都能抓到 LINE 登入狀態 */}
      <SessionProvider session={session}>
        <UserProvider>
          <NextUIProvider>
            <CartProvider>
              <PWARegister />
              <ReferralCapture />
              <PartnerRecoveryRedirect />
              <SupabaseOAuthRedirect />
              <LineInviteGuestPopup />
              <WelcomeGiftPopup />
              <Component {...pageProps} />
            </CartProvider>
          </NextUIProvider>
        </UserProvider>
      </SessionProvider>
    </>
  );
}

export default MyApp;