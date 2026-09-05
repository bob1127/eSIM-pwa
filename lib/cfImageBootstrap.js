/**
 * 在 HTML 解析前掛 MutationObserver，把原生 <img> 改成 /cdn-cgi/image/...
 * 必須放在 _document <Head>，才能趕在 body 圖片開始下載前改寫。
 *
 * next/image（已 alias 到 SafeImage）SSR 就會輸出 CF URL，這裡主要補：
 * - 手寫 <img>
 * - WP / CMS HTML
 * - client-side 導頁後新插入的圖
 *
 * 外域原圖（WP／Photon／未 allowlist 的 R2）不改寫，避免 CF 9401 破圖。
 */
export function buildCfImgBootstrap({ remoteOrigins = [] } = {}) {
  const allowJson = JSON.stringify(
    (remoteOrigins || []).map((h) => String(h).toLowerCase()).filter(Boolean),
  );

  return `(function () {
  try {
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    var remoteAllow = ${allowJson};

    function skip(src) {
      if (!src) return true;
      if (src.indexOf("data:") === 0 || src.indexOf("blob:") === 0) return true;
      if (src.indexOf("/cdn-cgi/image/") !== -1) return true;
      if (/\\.svg(\\?|#|$)/i.test(src)) return true;
      if (/\\.(mp4|webm|mov|m4v|gif|ico)(\\?|#|$)/i.test(src)) return true;
      if (/favicon|apple-touch-icon|qrcode|qr-code|\\/qr\\/|barcode/i.test(src)) return true;
      return false;
    }

    function unwrapCf(src) {
      if (!src || src.indexOf("/cdn-cgi/image/") === -1) return src;
      var marker = "/cdn-cgi/image/";
      var idx = src.indexOf(marker);
      var rest = src.slice(idx + marker.length);
      var slash = rest.indexOf("/");
      if (slash === -1) return src;
      rest = rest.slice(slash + 1);
      if (/^https?:\\/\\//i.test(rest)) return rest;
      if (rest.charAt(0) === "/") return rest;
      return "/" + rest;
    }

    function bucket(n) {
      n = Number(n) || 960;
      if (n <= 360) return 360;
      if (n <= 640) return 640;
      if (n <= 960) return 960;
      return 1280;
    }

    function encodePath(pathname) {
      return String(pathname || "").split("/").map(function (seg) {
        if (!seg) return seg;
        try { return encodeURIComponent(decodeURIComponent(seg)); }
        catch (e) { return encodeURIComponent(seg); }
      }).join("/");
    }

    function toCf(src, width) {
      if (skip(src)) return src;
      var opts = "width=" + bucket(width) + ",quality=75,format=auto,fit=scale-down,onerror=redirect";
      if (/^https?:\\/\\//i.test(src)) {
        try {
          var u = new URL(src);
          if (u.host === location.host) {
            return "/cdn-cgi/image/" + opts + encodePath(u.pathname) + u.search;
          }
          if (remoteAllow.indexOf(u.host.toLowerCase()) === -1) {
            return src;
          }
        } catch (e) {
          return src;
        }
        return "/cdn-cgi/image/" + opts + "/" + src;
      }
      var path = src.charAt(0) === "/" ? src : "/" + src;
      return "/cdn-cgi/image/" + opts + encodePath(path);
    }

    function attachFallback(img, orig) {
      if (!img || img.getAttribute("data-cf-onerror")) return;
      img.setAttribute("data-cf-onerror", "1");
      if (orig) img.setAttribute("data-cf-orig", orig);
      img.addEventListener("error", function onCfFail() {
        var fallback = img.getAttribute("data-cf-orig") || unwrapCf(img.getAttribute("src"));
        if (!fallback || img.getAttribute("src") === fallback) return;
        img.setAttribute("src", fallback);
      }, { once: true });
    }

    function rewrite(img) {
      if (!img || img.nodeType !== 1 || img.tagName !== "IMG") return;
      var src = img.getAttribute("src");
      if (!src) return;

      // 已是 CF URL（SSR 輸出）：不重寫，但掛回退，避免 9401 死圖
      if (src.indexOf("/cdn-cgi/image/") !== -1) {
        attachFallback(img, unwrapCf(src));
        return;
      }

      if (img.getAttribute("data-cf-img") === "1") return;
      if (skip(src)) return;
      var w = parseInt(img.getAttribute("width"), 10) || 0;
      if (!w && img.clientWidth) w = img.clientWidth;
      if (!w && typeof window !== "undefined") w = Math.min(1280, window.innerWidth || 960);
      var next = toCf(src, w || 960);
      if (next === src) return;
      img.setAttribute("data-cf-img", "1");
      img.setAttribute("src", next);
      if (img.getAttribute("srcset")) img.removeAttribute("srcset");
      attachFallback(img, src);
    }

    function scan(root) {
      if (!root) return;
      if (root.tagName === "IMG") rewrite(root);
      if (root.querySelectorAll) {
        var list = root.querySelectorAll("img");
        for (var i = 0; i < list.length; i++) rewrite(list[i]);
      }
    }

    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) scan(nodes[j]);
        if (muts[i].type === "attributes" && muts[i].target) rewrite(muts[i].target);
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    scan(document);
  } catch (e) {}
})();`;
}

/** @deprecated 請用 buildCfImgBootstrap；保留給舊 import */
export const CF_IMG_BOOTSTRAP = buildCfImgBootstrap();
