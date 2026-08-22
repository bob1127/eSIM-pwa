/** @type {import('next').NextConfig} */
const path = require("path");

// ★★★ 引入 PWA 套件 ★★★
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: false, // 關閉可減少 SW 複雜度
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  register: false, // 由 PWARegister 元件在 _app 統一 register，與推播共用 /sw.js
  cacheStartUrl: false,

  fallbacks: {
    document: "/_offline",
  },

  // public/ 大量素材不應 precache（手機 SW install 會卡數十秒甚至失敗）
  publicExcludes: [
    "!noprecache/**/*",
    "!images/**",
    "!assets/**",
    "!fonts/**",
    "!videos/**",
    "!參考/**",
    "!nextImageExportOptimizer/**",
    "!static/**",
    "!Logo/**",
    "!Lottie/**",
    "!**/*.psd",
    "!**/*.ai",
    "!**/*.FBX",
    "!**/*.fbx",
    "!**/*.glb",
    "!**/*.mp4",
    "!**/*.ttc",
    "!**/*.TTC",
    "!**/*.TTF",
    "!AccuCities*",
    "!img*.jpg",
    "!img*.jpeg",
    "!trip*.jpg",
    "!lens-transformed.glb",
    "!shoe-draco.glb",
    "!index.html",
  ],

  workboxOptions: {
    disableDevLogs: true,
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024, // 2MB 上限，避免大檔拖垮 install
    exclude: [/index\.html$/, /\.(?:psd|ai|FBX|fbx|glb|mp4|ttc|TTC)$/i],
    manifestTransforms: [
      (entries) => ({
        manifest: entries.filter(({ url }) => {
          if (/index\.html$/i.test(url)) return false;
          if (/\.(?:psd|ai|FBX|fbx|glb|mp4|ttc|TTC|TTF)$/i.test(url)) return false;
          if (/^\/(?:images|videos|fonts|assets|參考|nextImageExportOptimizer|Logo|Lottie|static)\//.test(url)) {
            return false;
          }
          return true;
        }),
        warnings: [],
      }),
    ],
  },
});

// 圖片策略（避免再打爆 Vercel Image Optimization → 402、圖全掛）：
// - Vercel／正式站：一律 images.unoptimized，禁止走 /_next/image
// - webpack 把 next/image alias 到 SafeImage → Cloudflare /cdn-cgi/image（format=auto）
// - 原生 <img> 由 _document 的 bootstrap 改寫
// - 僅本機 `next dev` 開 Next Image Optimization（用量不計 Vercel）
// （Next 13.4 + next-pwa 下 images.loader:"custom" 在 SSG 常漏掛 → missing loader）
const disableVercelImageOptimization =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL === "1" ||
  Boolean(process.env.VERCEL_ENV);

const nextConfig = {
  reactStrictMode: true, 
  trailingSlash: true,
  // NextAuth OAuth callback 不可被 308 改成尾斜線，否則 state 失效會變成 error=undefined
  skipTrailingSlashRedirect: true,
  // 商品頁變體多／Medusa 慢時，預設 60s 易在 Vercel 觸發 page-data-collection-timeout
  staticPageGenerationTimeout: 180,

  images: {
    unoptimized: disableVercelImageOptimization,
    deviceSizes: [360, 640, 960, 1280],
    imageSizes: [64, 128, 256, 360],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  sassOptions: {
    includePaths: [path.join(__dirname, "styles")],
  },

  async rewrites() {
    return [
      {
        source: "/api/line/webhook",
        destination: "/api/line/webhook/",
      },
      {
        source: "/api/auth/callback/line/",
        destination: "/api/auth/callback/line",
      },
    ];
  },

  async redirects() {
    const countries = [
      "japan",
      "jp",
      "korea",
      "kr",
      "china",
      "cn",
      "thailand",
      "th",
      "vietnam",
      "vn",
      "malaysia",
      "my",
    ];
    return [
      // 舊帳號路徑 → 夥伴後台
      {
        source: "/account/catalog",
        destination: "/partner/catalog",
        permanent: false,
      },
      {
        source: "/account/catalog/",
        destination: "/partner/catalog/",
        permanent: false,
      },
      {
        source: "/account/partner",
        destination: "/partner/dashboard",
        permanent: false,
      },
      {
        source: "/account/partner/",
        destination: "/partner/dashboard/",
        permanent: false,
      },
      {
        source: "/account/my-products",
        destination: "/partner/products",
        permanent: false,
      },
      {
        source: "/account/my-products/",
        destination: "/partner/products/",
        permanent: false,
      },
      // 常見誤打：boss 後台在 /admin-boss，不是夥伴店 /p/boss
      { source: "/boss", destination: "/admin-boss/", permanent: false },
      { source: "/boss/", destination: "/admin-boss/", permanent: false },
      // 歷史拼字 tailand → 正規 thailand
      {
        source: "/product/tailand",
        destination: "/product/thailand",
        permanent: false,
      },
      {
        source: "/product/tailand/",
        destination: "/product/thailand/",
        permanent: false,
      },
      {
        source: "/product/tailand/:slug*",
        destination: "/product/thailand/:slug*",
        permanent: false,
      },
      {
        source: "/product/uk/uk-unlimited-10mbps-esim",
        destination: "/product/uk/uk-unlimited-esim/",
        permanent: false,
      },
      {
        source: "/product/uk/uk-unlimited-10mbps-esim/",
        destination: "/product/uk/uk-unlimited-esim/",
        permanent: false,
      },
      {
        source: "/promo",
        has: [{ type: "query", key: "tab", value: "missions" }],
        destination: "/missions",
        permanent: false,
      },
      ...countries.flatMap((slug) => [
        {
          source: `/${slug}`,
          destination: `/product/${slug}/`,
          permanent: false,
        },
        {
          source: `/${slug}/`,
          destination: `/product/${slug}/`,
          permanent: false,
        },
      ]),
    ];
  },

  async headers() {
    const storefront =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const medusaAdmin =
      process.env.MEDUSA_ADMIN_ORIGIN ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "http://localhost:9000";

    // 全站基本資安 Header。刻意不加全站 Content-Security-Policy（script-src 等）：
    // 站上有大量第三方嵌入（GTM/GA/Meta Pixel、LINE、Klook/KKday、地圖、聊天客服…），
    // 未經完整盤點就套用嚴格 CSP 很容易在正式站悄悄壞掉某個第三方功能。
    // /admin-boss 需被 Medusa 後台 iframe 嵌入：現代瀏覽器在 CSP frame-ancestors
    // 存在時會以它為準、忽略 X-Frame-Options，所以下面的全站 X-Frame-Options
    // 不會擋到 /admin-boss 的 CSP 設定。
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), usb=(), payment=(self)",
      },
      // 不加 includeSubDomains / preload：未確認所有子網域都已強制 HTTPS 前，
      // 這兩個選項一旦被瀏覽器記住就很難撤銷，先用保守設定。
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/admin-boss",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${medusaAdmin} ${storefront};`,
          },
        ],
      },
      // 內部工具（供應商成本／方案目錄）：不進索引、不被任何快取層留存
      ...["/esim-selection", "/esim-selection/:path*", "/admin/:path*"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "X-Robots-Tag",
              value: "noindex, nofollow, noarchive, nosnippet",
            },
            { key: "Cache-Control", value: "private, no-store, max-age=0" },
          ],
        }),
      ),
    ];
  },

  webpack(config) {
    // 整站 next/image → SafeImage（正式站走 Cloudflare /cdn-cgi/image）
    // 不設 images.loader:"custom"：Next 13.4 + next-pwa 的 SSG 常漏掛 loader
    const cfImage = path.join(__dirname, "components/SafeImage.jsx");
    if (Array.isArray(config.resolve.alias)) {
      config.resolve.alias.push(
        { name: "next/image", alias: cfImage },
        { name: "next/image.js", alias: cfImage },
      );
    } else {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "next/image": cfImage,
        "next/image.js": cfImage,
      };
    }
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"],
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);