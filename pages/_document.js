import { Html, Head, Main, NextScript } from "next/document";
import { SITE_FAVICON } from "../lib/pwaConfig";

export default function Document() {
  return (
    <Html lang="zh-TW">
      <Head>
        <link rel="icon" href={SITE_FAVICON} sizes="any" />
        <link rel="shortcut icon" href={SITE_FAVICON} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700;900&family=Roboto:wght@300;400;500;700;900&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
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
