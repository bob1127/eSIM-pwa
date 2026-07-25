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

// Vercel Image Optimization 超額會回 402（OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED）
// 未啟用 Cloudflare Image Transformations 時一律直出原圖，避免整站破圖
const cfImagesOn =
  process.env.NEXT_PUBLIC_CF_IMAGES === "1" ||
  process.env.NEXT_PUBLIC_CF_IMAGES === "true";

const nextConfig = {
  reactStrictMode: true, 
  trailingSlash: true,
  // NextAuth OAuth callback 不可被 308 改成尾斜線，否則 state 失效會變成 error=undefined
  skipTrailingSlashRedirect: true,

  images: {
    // CF 開啟：走 lib/cfImageLoader.js；關閉：unoptimized 直出，不經 /_next/image
    ...(cfImagesOn
      ? { loader: "custom", loaderFile: "./lib/cfImageLoader.js" }
      : { unoptimized: true }),
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

  async headers() {
    const storefront =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const medusaAdmin =
      process.env.MEDUSA_ADMIN_ORIGIN ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "http://localhost:9000";

    return [
      {
        source: "/admin-boss",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${medusaAdmin} ${storefront};`,
          },
        ],
      },
    ];
  },

  webpack(config) {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"], 
    });
    return config;
  },
};

module.exports = withPWA(nextConfig);