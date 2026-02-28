// pages/_app.js
import '../src/globals.css'; // 確保路徑正確
import Head from 'next/head'; 
import { NextUIProvider } from '@nextui-org/react'; 
import { SessionProvider } from "next-auth/react"; // 🌟 引入 NextAuth 的 SessionProvider

// 如果你原本的 UserProvider 和 AuthProvider 還有綁定其他 Supabase 邏輯，可以先保留
import { AuthProvider } from '../components/AuthProvider';
import { CartProvider } from "../components/context/CartContext"; 
import { UserProvider } from "../components/context/UserContext"; 

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no" />
        <meta name="theme-color" content="#147AD7" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </Head>

      {/* 🌟 用 SessionProvider 包覆全站，讓所有組件都能抓到 LINE 登入狀態 */}
      <SessionProvider session={session}>
        <UserProvider>
          <AuthProvider>
            <NextUIProvider>
              <CartProvider>
                <Component {...pageProps} />
              </CartProvider>
            </NextUIProvider>
          </AuthProvider>
        </UserProvider>
      </SessionProvider>
    </>
  );
}

export default MyApp;