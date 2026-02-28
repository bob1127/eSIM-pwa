import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative z-50 overflow-hidden text-gray-800">
      {/* ===== 背景圖片層 ===== */}
      <div className="absolute inset-0 -z-20">
        <Image
          src="/images/footer/footer.png"
          alt="Footer Background"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* ===== 白色透明毛玻璃遮罩 ===== */}
      <div className="absolute inset-0 -z-10 bg-white/65 backdrop-blur-xl"></div>

      {/* ===== 你原本的內容 ===== */}
      <div className="max-w-[1200px] mx-auto px-6 pt-16 pb-10 text-center md:text-left relative z-10">
        {/* LOGO & 主選單 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 border-b border-gray-200 pb-8">
          <Link href="/" className="flex justify-center md:justify-start">
            <Image
              src="/images/logo/logo.png"
              alt="Jeko Logo"
              width={160}
              height={60}
              className="h-auto w-[100px]"
            />
          </Link>

          <nav className="flex flex-wrap justify-center gap-6 text-sm font-medium">
            {[
              { href: "/esim/all", label: "所有 eSIM 方案" },
              { href: "/guide", label: "安裝教學" },
              { href: "/support", label: "常見問題" },
              { href: "/company", label: "關於我們" },
              { href: "/contact", label: "聯絡客服" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="
        group
        relative
        flex items-center gap-2
        text-sm font-medium
        transition-colors
        hover:text-sky-500
      "
              >
                {/* 左側 icon（hover 才出現） */}
                <span className="relative w-8 h-8 overflow-hidden">
                  <Image
                    src="/images/logo/esim-icon.svg"
                    alt=""
                    fill
                    className="
            object-contain
            opacity-0
            -translate-x-2
            transition-all duration-300 ease-out
            group-hover:opacity-100
            group-hover:translate-x-0
          "
                  />
                </span>

                {/* 文字 */}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* 地址與認證 */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-10 gap-6 text-sm">
          <div className="text-gray-600 leading-relaxed text-center md:text-left">
            <p>極客eSIM數位漫遊科技股份有限公司</p>
            <p> (營運中心)</p>
            <p className="mt-1">客服信箱：support@re-media.com</p>
          </div>

          <div className="flex items-center gap-4">
            <Image
              src="/images/sgs.png"
              alt="Secure Payment"
              width={60}
              height={60}
              className="object-contain opacity-80 hover:opacity-100 transition"
            />
            <Image
              src="/images/isms.png"
              alt="Data Privacy"
              width={60}
              height={60}
              className="object-contain opacity-80 hover:opacity-100 transition"
            />
          </div>
        </div>

        {/* Scroll Top */}
        <div className="mt-10 flex justify-center md:justify-end">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 text-sky-500 text-sm hover:underline group"
          >
            返回頂部
            <span className="inline-block w-6 h-6 bg-sky-500 text-white rounded-full flex items-center justify-center group-hover:-translate-y-1 transition-transform">
              ↑
            </span>
          </button>
        </div>

        {/* 底部資訊 */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-gray-700">
              隱私權政策
            </Link>
            <Link href="/terms" className="hover:text-gray-700">
              服務條款
            </Link>
            <Link href="/refund-policy" className="hover:text-gray-700">
              退換貨政策
            </Link>
          </div>
          <div>© 2025 Re.MEDIA Inc. All Rights Reserved.</div>
        </div>
      </div>
    </footer>
  );
}
