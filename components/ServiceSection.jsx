"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* ========== 共用：滾動進場（大距離、超柔順；與 page.jsx 同步） ========== */
function FadeUp({
  children,
  className = "",
  delay = 0,
  distance = 96,
  amount = 0.3,
}) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance, filter: "blur(6px)" }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { ease: [0.16, 1, 0.3, 1], duration: 1.05, delay },
      }}
      viewport={{ once: true, amount, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </motion.div>
  );
}

/* ========== 小元件：Tag / Pill ========== */
const TAG = ({ children, color = "#2E4457", bg = "#EEF5FA" }) => (
  <span
    className="inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold tracking-wide mr-2 mb-2"
    style={{ color, backgroundColor: bg }}
  >
    {children}
  </span>
);

const LabelPill = ({ text, color = "#2E4457" }) => (
  <span
    className="inline-flex items-center rounded-md px-3 py-1 text-[12px] font-bold mr-2"
    style={{ color: "#ffffff", backgroundColor: color }}
  >
    {text}
  </span>
);
const ArrowIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    className="transition-transform group-hover:translate-x-[2px]"
  >
    <path
      d="M8 5l8 7-8 7"
      stroke="#fff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
/* ========== 卡片（已套用 FadeUp） ========== */
function JobCard({ title, desc, pills = [], tags = [], delay = 0 }) {
  return (
    <FadeUp delay={delay} amount={0.25}>
      <div className="relative overflow-hidden rounded-[24px] bg-white border border-[#E6EFF6] shadow-sm h-full">
        {/* 右下裝飾 */}
        <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-tl-full bg-[#0BAFD7]/85" />

        <div className="p-6 md:p-7 flex flex-col h-full">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {pills.map((p, i) => (
              <LabelPill key={i} text={p.text} color={p.color} />
            ))}
          </div>

          <h3 className="text-[22px] leading-[1.5] font-extrabold text-[#2C5164] mb-3">
            {title}
          </h3>
          <p className="text-[14px] leading-relaxed text-[#5B7382] mb-6 flex-grow">
            {desc}
          </p>
          <div className="flex flex-wrap mt-auto">
            {tags.map((t, i) => (
              <TAG key={i} bg="#34414D" color="#ffffff">
                #{t}
              </TAG>
            ))}
          </div>
        </div>
      </div>
    </FadeUp>
  );
}

/* ========== 主元件 ========== */
export default function PickUpJobsSection() {
  const TABS = [
    { key: "japan", label: "日本 Japan", dot: true },
    { key: "korea", label: "韓國 Korea" },
    { key: "sea", label: "東南亞 SE Asia" },
  ];
  const [active, setActive] = useState("japan");

  /* eSIM 產品資料 */
  const DATA = useMemo(
    () => ({
      japan: [
        {
          pills: [
            { text: "Hot", color: "#FF5252" },
            { text: "吃到飽", color: "#3BC7A8" },
          ],
          title: "日本 Docomo/Softbank 雙網",
          desc: "採用日本最大電信商線路，東京、大阪、北海道等地訊號全覆蓋。真正的無限流量吃到飽，不降速。",
          tags: ["高速上網", "雙電信切換", "5G"],
        },
        {
          pills: [
            { text: "Value", color: "#2E4457" },
            { text: "總量型", color: "#3BC7A8" },
          ],
          title: "小資輕旅 5GB/10GB 方案",
          desc: "適合短期旅遊或預算有限的旅客。流量用完後降速不斷網，地圖導航、傳訊依舊順暢。",
          tags: ["高CP值", "小資首選", "LINE暢通"],
        },
        {
          pills: [
            { text: "New", color: "#0BAFD7" },
            { text: "長天期", color: "#3BC7A8" },
          ],
          title: "30天留學/出差長效卡",
          desc: "專為長期滯留設計。免簽合約、免開漫遊，一次購買使用30天，隨時可加購流量。",
          tags: ["商務出差", "遊學打工", "免換卡"],
        },
      ],
      korea: [
        {
          pills: [
            { text: "Speed", color: "#2E4457" },
            { text: "SKT獨家", color: "#3BC7A8" },
          ],
          title: "韓國 SKT 原生線路",
          desc: "與韓國當地人使用相同網路，享受超低延遲與極速飆網體驗。追星搶票、直播視訊完全不卡頓。",
          tags: ["韓國第一", "低延遲", "原生IP"],
        },
        {
          pills: [
            { text: "Daily", color: "#2E4457" },
            { text: "每日制", color: "#3BC7A8" },
          ],
          title: "每日 1GB/2GB/3GB 自由選",
          desc: "依據您的使用習慣選擇每日高速流量，隔日自動重置。彈性天數 3~30 天任您搭配。",
          tags: ["彈性天數", "流量重置", "首爾必備"],
        },
        {
          pills: [
            { text: "Voice", color: "#FF9800" },
            { text: "含號碼", color: "#3BC7A8" },
          ],
          title: "含通話 / 簡訊收發功能",
          desc: "附帶韓國 +82 手機號碼，可註冊外送 App、預約餐廳排隊或接收認證碼。",
          tags: ["可通話", "外送預約", "實名認證"],
        },
      ],
      sea: [
        {
          pills: [
            { text: "Multi", color: "#2E4457" },
            { text: "雙國通", color: "#3BC7A8" },
          ],
          title: "新馬跨國通用 eSIM",
          desc: "一張卡暢遊新加坡與馬來西亞。過海關自動切換當地最佳訊號，省去更換卡片的麻煩。",
          tags: ["跨國漫遊", "自動切換", "新馬旅遊"],
        },
        {
          pills: [
            { text: "Travel", color: "#2E4457" },
            { text: "周遊券", color: "#3BC7A8" },
          ],
          title: "東南亞 6 國通用方案",
          desc: "包含泰國、越南、印尼、柬埔寨等熱門國家。背包客最愛的省錢方案，一次搞定多國網路。",
          tags: ["背包客", "多國通", "高覆蓋率"],
        },
        {
          pills: [
            { text: "Biz", color: "#2E4457" },
            { text: "越南專用", color: "#3BC7A8" },
          ],
          title: "越南 Viettel 高速網卡",
          desc: "覆蓋越南全境，包含下龍灣、富國島等觀光區。網速穩定，是前往越南旅遊的最佳選擇。",
          tags: ["Viettel", "全境覆蓋", "富國島"],
        },
      ],
    }),
    [],
  );

  const cards = DATA[active];

  return (
    <section className="py-20 md:py-24">
      <div className="mx-auto w-[92%] max-w-[1500px]">
        {/* 背景角丸層 */}
        <div className="relative rounded-[40px] bg-[#dfe9fb] px-5 py-10 md:px-10 md:py-14">
          {/* Header */}
          <header
            className="mb-8 md:mb-10 text-center"
            data-aos="fadeup-smooth"
          >
            <h2 className="inline-flex items-center gap-3 text-[32px] md:text-[48px] leading-none font-extrabold text-[#2C5164]">
              為您提供最優質的連線方案
              <span className="inline-grid h-9 w-9 place-items-center rounded-md bg-white/70 border border-[#CAE6F1]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    stroke="#2C5164"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </h2>

            {/* Tabs */}
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-4 md:gap-7 text-[15px] md:text-[16px] font-semibold text-[#5B7382]"
              aria-label="方案地區切換"
            >
              {TABS.map((t) => {
                const activeTab = t.key === active;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActive(t.key)}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      activeTab
                        ? "bg-white text-[#1491C9] shadow-sm"
                        : "hover:bg-white/50 text-[#5B7382]"
                    }`}
                    aria-current={activeTab ? "page" : undefined}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full inline-block transition-colors ${
                        activeTab ? "bg-[#1491C9]" : "bg-[#9ECFE1]"
                      }`}
                    />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </nav>
          </header>

          {/* Cards */}
          <AnimatePresence mode="wait">
            <div key={active} className="grid gap-6 md:grid-cols-3">
              {cards.map((c, i) => (
                <JobCard
                  key={`${active}-${i}`}
                  title={c.title}
                  desc={c.desc}
                  pills={c.pills}
                  tags={c.tags}
                  delay={i * 0.06}
                />
              ))}
            </div>
          </AnimatePresence>

          {/* 注意文 */}
          <FadeUp delay={0.06}>
            <p
              className="mt-10 text-center text-[13px] text-[#6F8896]"
              style={{ lineHeight: "1.8" }}
            >
              致力於提供全球最穩定的旅遊網路體驗
              <br className="hidden md:block" />
              即買即收 QR Code，免換卡、零漫遊費，讓您的旅程隨時在線
            </p>
          </FadeUp>

          {/* CTA */}
          <FadeUp delay={0.12}>
            <div className="mt-8 flex items-center justify-center">
              {/* 外層容器：設定 group 以便控制內部所有動畫 */}
              <a
                href="/category/all-product/"
                className="group relative inline-flex items-center justify-center"
              >
                {/* 動畫效果 3 (背景影子層)：
            這層固定在底部，當上方按鈕移動時，這層會露出來形成「殘影」或「立體厚度」。
            顏色設定為比主色稍深的 Cyan (#0891b2) 
          */}
                <div className="absolute inset-0 h-full w-full rounded-full bg-[#0891b2] opacity-0 transition-all duration-300 group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:opacity-100" />

                {/* 主按鈕層 (Button 1 的樣式基礎)：
            包含背景色 #0BAFD7、陰影、圓角。
            Hover 時會向左上方移動 (-translate)，配合下方的影子層創造立體感。
          */}
                <div className="relative z-10 inline-flex items-center justify-center overflow-hidden rounded-full bg-[#0BAFD7] px-8 py-3.5 font-bold text-white shadow-lg shadow-[#0BAFD7]/30 transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[#099EC3]/40">
                  {/* 動畫效果 2 (文字傾斜滑動)：
              包含兩組完全相同的內容 (文字+Icon)。
            */}
                  <span className="relative inline-flex overflow-hidden">
                    {/* 第一組內容：原本顯示的。Hover 時向右滑出並傾斜 (+150%, skew) */}
                    <div className="flex items-center gap-3 transition-transform duration-500 group-hover:translate-x-[150%] group-hover:skew-x-12">
                      查看所有方案
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                        <ArrowIcon />
                      </span>
                    </div>

                    {/* 第二組內容：原本隱藏在左側。Hover 時歸位並取消傾斜 (0%, no skew) */}
                    <div className="absolute inset-0 flex items-center gap-3 transition-transform duration-500 -translate-x-[150%] skew-x-12 group-hover:translate-x-0 group-hover:skew-x-0">
                      查看所有方案
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                        <ArrowIcon />
                      </span>
                    </div>
                  </span>
                </div>
              </a>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
