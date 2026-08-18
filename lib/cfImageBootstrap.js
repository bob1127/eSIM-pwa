/**
 * 在 HTML 解析前掛 MutationObserver，把原生 <img> 改成 /cdn-cgi/image/...
 * 必須放在 _document <Head>，才能趕在 body 圖片開始下載前改寫。
 *
 * next/image（已 alias 到 SafeImage）SSR 就會輸出 CF URL，這裡主要補：
 * - 手寫 <img>
 * - WP / CMS HTML
 * - client-side 導頁後新插入的圖
 */
export const CF_IMG_BOOTSTRAP = `(function () {
  try {
    var host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;

    function skip(src) {
      if (!src) return true;
      if (src.indexOf("data:") === 0 || src.indexOf("blob:") === 0) return true;
      if (src.indexOf("/cdn-cgi/image/") !== -1) return true;
      if (/\\.svg(\\?|#|$)/i.test(src)) return true;
      if (/\\.(mp4|webm|mov|m4v|gif|ico)(\\?|#|$)/i.test(src)) return true;
      if (/favicon|apple-touch-icon|qrcode|qr-code|\\/qr\\/|barcode/i.test(src)) return true;
      return false;
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
          if (new URL(src).host === location.host) {
            var u = new URL(src);
            return "/cdn-cgi/image/" + opts + encodePath(u.pathname) + u.search;
          }
        } catch (e) {}
        return "/cdn-cgi/image/" + opts + "/" + src;
      }
      var path = src.charAt(0) === "/" ? src : "/" + src;
      return "/cdn-cgi/image/" + opts + encodePath(path);
    }

    function rewrite(img) {
      if (!img || img.nodeType !== 1 || img.tagName !== "IMG") return;
      if (img.getAttribute("data-cf-img") === "1") return;
      var src = img.getAttribute("src");
      if (skip(src)) return;
      var w = parseInt(img.getAttribute("width"), 10) || 0;
      if (!w && img.clientWidth) w = img.clientWidth;
      if (!w && typeof window !== "undefined") w = Math.min(1280, window.innerWidth || 960);
      var next = toCf(src, w || 960);
      if (next === src) return;
      img.setAttribute("data-cf-img", "1");
      img.setAttribute("src", next);
      if (img.getAttribute("srcset")) img.removeAttribute("srcset");
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
