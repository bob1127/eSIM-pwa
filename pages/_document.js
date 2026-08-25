import { Html, Head, Main, NextScript } from "next/document";
import {
  SITE_FAVICON,
  SITE_FAVICON_16,
  SITE_APPLE_TOUCH_ICON,
  PWA_LOGO,
} from "../lib/pwaConfig";
import { CF_IMG_BOOTSTRAP } from "../lib/cfImageBootstrap";
import { isCfImagesEnabled } from "../lib/cfImageLoader";

export default function Document() {
  return (
    <Html lang="zh-TW">
      <Head>
        {isCfImagesEnabled() ? (
          <script dangerouslySetInnerHTML={{ __html: CF_IMG_BOOTSTRAP }} />
        ) : null}
        <link rel="icon" href={SITE_FAVICON} type="image/png" sizes="32x32" />
        <link rel="icon" href={SITE_FAVICON_16} type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href={SITE_APPLE_TOUCH_ICON} sizes="180x180" />
        <link rel="apple-touch-icon" href={PWA_LOGO} sizes="192x192" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Roboto:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
        {/* display=block：字型未就緒時先空白，避免出現 install_mobile 等代號文字 */}
        <link
          rel="preload"
          as="style"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function r(){document.documentElement.classList.add("material-icons-ready")}if(document.fonts&&document.fonts.load){document.fonts.load('24px "Material Symbols Outlined"').then(r).catch(r)}else{r()}setTimeout(r,2500)})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        {process.env.NODE_ENV === "production" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if ('serviceWorker' in navigator) {
                    window.addEventListener('load', function () {
                      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
                    });
                  }
                  window.addEventListener('beforeinstallprompt', function (e) {
                    try { e.preventDefault(); } catch (_) {}
                    window.__pwaDeferredPrompt = e;
                    window.__pwaInstallAvailable = true;
                    window.dispatchEvent(new Event('pwa-install-available'));
                  });
                  window.addEventListener('appinstalled', function () {
                    window.__pwaDeferredPrompt = null;
                    window.__pwaInstallAvailable = false;
                  });
                })();
              `,
            }}
          />
        )}
      </body>
    </Html>
  );
}
