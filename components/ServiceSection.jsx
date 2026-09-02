"use client";
import React, { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import MobileCardCarousel from "./MobileCardCarousel";
import {
  PRODUCT_ZONE_DEFS,
  zoneCountryToServiceCard,
} from "@/lib/productZoneCategories";

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
    aria-hidden="true"
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

/* ========== 卡片（已套用 FadeUp 且改為 Link） ========== */
function JobCard({
  title,
  desc,
  pills = [],
  tags = [],
  link = "#",
  delay = 0,
  noAnimation = false,
  hotSale = false,
}) {
  const card = (
    <Link
      href={link}
      className="group relative block overflow-hidden rounded-[24px] bg-white border border-[#E6EFF6] shadow-sm h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#0BAFD7]/10 hover:border-[#0BAFD7]/30"
    >
      {hotSale ? (
        <img
          src="/images/hot-sale-tag.png"
          alt="熱門推薦 Hot Sale"
          className="pointer-events-none absolute top-1 right-1 z-20 w-[68px] md:w-[76px] h-auto select-none drop-shadow-md transition-transform duration-300 group-hover:scale-105 origin-top-right"
        />
      ) : null}

      <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-tl-full bg-[#0BAFD7]/85 transition-transform duration-500 group-hover:scale-110" />

      <div className="relative z-10 p-6 md:p-7 flex flex-col h-full">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {pills.map((p, i) => (
            <LabelPill key={i} text={p.text} color={p.color} />
          ))}
        </div>

        <h3 className="text-[22px] leading-[1.5] font-extrabold text-[#2C5164] mb-3 transition-colors duration-300 group-hover:text-[#07819F]">
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
    </Link>
  );

  if (noAnimation) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <FadeUp delay={delay} amount={0.25} className="h-full">
      {card}
    </FadeUp>
  );
}

/* ========== 主元件 ========== */
export default function PickUpJobsSection() {
  const TABS = [
    { key: "native", label: "原生卡專區-本地IP" },
    { key: "unlimited", label: "真．不限速eSIM" },
    { key: "student", label: "留學生專區" },
    { key: "business", label: "出差辦公專區" },
    { key: "japan", label: "日本 Japan" },
    { key: "korea", label: "韓國 Korea" },
    { key: "china", label: "中國 China" },
    { key: "sea", label: "東南亞 SE Asia" },
    { key: "west", label: "歐美 Europe / US" },
    { key: "multi", label: "多國 Multi" },
  ];
  const [active, setActive] = useState("native");

  /* 🌟 eSIM 產品資料 (已全數加上 link 屬性) */
  const DATA = useMemo(
    () => ({
      // 留學生／出差：共用 lib/productZoneCategories（各國分開；變體稍後再加）
      student: PRODUCT_ZONE_DEFS.find((z) => z.key === "student").countries.map(
        (c) => zoneCountryToServiceCard(c, "留學"),
      ),
      business: PRODUCT_ZONE_DEFS.find((z) => z.key === "business").countries.map(
        (c) => zoneCountryToServiceCard(c, "出差"),
      ),
      // 來源：/esim-selection 原生 IP 規則（日／韓／泰／越）；產品尚未上架，先放國家入口卡
      native: [
        {
          hotSale: true,
          pills: [
            { text: "Native", color: "#2E4457" },
            { text: "日本本地IP", color: "#17806A" },
          ],
          title: "日本原生卡",
          desc: "採用 Docomo／KDDI／IIJ 等當地電信線路，日本本地 IP、低延遲，適合訂餐廳、電子支付與多數日本限定服務。",
          tags: ["日本IP", "低延遲", "原生線路"],
          link: "/product/japan/japan-unlimited-esim-nolimit?telecom=au-kddi&days=5&data_amount=unlimited",
        },
        {
          hotSale: true,
          pills: [
            { text: "Native", color: "#2E4457" },
            { text: "韓國本地IP", color: "#17806A" },
          ],
          title: "韓國原生卡",
          desc: "走 SKT／KT／LGU+ 當地網路，韓國本地 IP，追星搶票、直播視訊與本地 App 體驗更接近在地用戶。",
          tags: ["韓國IP", "極速飆網", "原生線路"],
          link: "/product/korea/korea-unlimited-esim?telecom=sk-native&days=5&data_amount=unlimited",
        },
        {
          hotSale: true,
          pills: [
            { text: "Native", color: "#2E4457" },
            { text: "泰國本地IP", color: "#17806A" },
          ],
          title: "泰國原生卡",
          desc: "對應 Truemove H 當地號碼／True 電信本地線路，泰國本地 IP，曼谷、清邁、普吉等熱門旅遊地訊號覆蓋更穩定。",
          tags: ["泰國IP", "本地電信", "原生線路"],
          link: "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8&data_amount=unlimited",
        },
        {
          hotSale: true,
          pills: [
            { text: "Native", color: "#2E4457" },
            { text: "越南本地IP", color: "#17806A" },
          ],
          title: "越南原生卡",
          desc: "採用 Viettel／Vinaphone／Mobifone 當地網路，越南本地 IP，下龍灣、富國島等觀光區連線更穩。",
          tags: ["越南IP", "全境覆蓋", "原生線路"],
          link: "/product/vietnam",
        },
      ],
      unlimited: [
        {
          hotSale: true,
          pills: [
            { text: "真．不限速", color: "#FF5252" },
            { text: "AU(KDDI)", color: "#17806A" },
          ],
          title: "日本 AU(KDDI)",
          desc: "走日本三大電信 AU（KDDI）當地網路與日本本地 IP，高速數據吃到飽、真．不限速，適合整天導航、視訊與熱點分享。",
          tags: ["日本IP", "真．不限速", "5G"],
          link: "/product/japan/japan-unlimited-esim-nolimit?telecom=au-kddi",
        },
        {
          hotSale: true,
          pills: [
            { text: "真．不限速", color: "#FF5252" },
            { text: "含當地門號", color: "#17806A" },
          ],
          title: "韓國 SK電信（含門號）",
          desc: "SKT 原生韓國 IP、真．不限速吃到飽。完成線上實名後可接聽來電與收簡訊，適合外送 App、預約餐廳與認證碼。",
          tags: ["韓國IP", "含門號", "真．不限速"],
          link: "/product/korea/korea-unlimited-esim?telecom=sk-native",
        },
        {
          hotSale: true,
          pills: [
            { text: "真．不限速", color: "#FF5252" },
            { text: "8／15天", color: "#17806A" },
          ],
          title: "泰國 Truemove 8／15天",
          desc: "Truemove H 當地號碼，僅 8 天與 15 天兩檔，真．不限速高速上網，並可免費接聽來電與收簡訊。",
          tags: ["泰國IP", "當地號碼", "8／15天"],
          link: "/product/thailand/thailand-unlimited-esim?telecom=truemove&days=8",
        },
      ],
      japan: [
        {
          pills: [
            { text: "熱門主推", color: "#FF5252" },
            { text: "原生 AU(KDDI)", color: "#17806A" },
          ],
          title: "日本 AU(KDDI) 原生卡",
          desc: "走日本三大電信之一 AU（KDDI）當地網路與日本本地 IP，東京、大阪、京都與各大旅遊城市覆蓋穩定，適合導航、電子支付與熱點分享。",
          tags: ["電信業者：AU(KDDI)", "日本ＩＰ", "熱點功能", "4G / LTE / 5G"],
          link: "/product/japan/japan-unlimited-esim?telecom=au-kddi-10m&days=5",
        },
        {
          pills: [
            { text: "Value", color: "#2E4457" },
            { text: "總量型", color: "#17806A" },
          ],
          title: "小資輕旅 5GB/10GB 方案",
          desc: "適合短期旅遊或預算有限的旅客。流量用完後降速不斷網，地圖導航、傳訊依舊順暢。",
          tags: ["高CP值", "小資首選", "LINE暢通"],
          link: "/product/japan-value", // 🔗 請替換成真實的產品網址
        },
        {
          pills: [
            { text: "New", color: "#07819F" },
            { text: "長天期", color: "#17806A" },
          ],
          title: "30天留學/出差長效卡",
          desc: "專為長期滯留設計。免簽合約、免開漫遊，一次購買使用30天，隨時可加購流量。",
          tags: ["商務出差", "遊學打工", "免換卡"],
          link: "/product/japan-30days", // 🔗 請替換成真實的產品網址
        },
      ],
      korea: [
        {
          hotSale: true,
          pills: [
            { text: "真．不限速", color: "#FF5252" },
            { text: "SK電信・韓國IP", color: "#17806A" },
          ],
          title: "韓國 SK電信 原生吃到飽",
          desc: "SKT 原生韓國 IP、真．不限速高速吃到飽。適合導航、直播、搶票與整天大量使用；2 天以上方案完成線上實名後可收來電／簡訊。",
          tags: ["韓國IP", "真．不限速", "原生線路"],
          link: "/product/korea/korea-unlimited-esim?telecom=sk-native&days=5&data_amount=unlimited",
        },
        {
          pills: [
            { text: "高CP值", color: "#2E4457" },
            { text: "LG U+ / SK", color: "#17806A" },
          ],
          title: "LG U+ / SK 流量吃到飽",
          desc: "新加坡 IP 漫遊：每日 1GB 高速，用完後維持約 10Mbps 吃到飽；LG U+／SK 雙電信覆蓋，適合一般旅遊上網。",
          tags: ["新加坡IP", "每日1GB", "10Mbps吃到飽"],
          link: "/product/korea/korea-unlimited-esim?telecom=lg-sk&days=5&data_amount=unlimited",
        },
        {
          pills: [
            { text: "每日／總量", color: "#07819F" },
            { text: "5G 雙切換", color: "#17806A" },
          ],
          title: "韓國每日型・總量型",
          desc: "可選每日高速額度或總量 GB 方案，LG U+／SK 5G 雙切換找訊號。短天數輕旅或長天期控流量都適合。",
          tags: ["每日型", "總量型", "雙電信"],
          link: "/product/korea/korea-daily-esim?telecom=lg-skt-dual",
        },
      ],
      sea: [
        {
          hotSale: true,
          pills: [
            { text: "MY", color: "#2E4457" },
            { text: "馬來西亞", color: "#17806A" },
          ],
          title: "馬來西亞 eSIM",
          desc: "吉隆坡、檳城、蘭卡威與各大旅遊城市覆蓋，適合自駕、逛街與熱點分享。",
          tags: ["馬來西亞", "UMobile", "熱門旅遊"],
          link: "/product/malaysia",
        },
        {
          pills: [
            { text: "SG", color: "#2E4457" },
            { text: "新加坡", color: "#17806A" },
          ],
          title: "新加坡 eSIM",
          desc: "市區 4G／5G 覆蓋穩定，適合樟宜過境、市區觀光與跨國轉機停留。",
          tags: ["新加坡", "高速上網", "市區覆蓋"],
          link: "/product/singapore",
        },
        {
          hotSale: true,
          pills: [
            { text: "TH", color: "#2E4457" },
            { text: "泰國", color: "#17806A" },
          ],
          title: "泰國 eSIM",
          desc: "曼谷、清邁、普吉、蘇梅等熱門城市可選 Truemove／TRUE 當地線路。",
          tags: ["泰國", "當地號碼", "真．不限速"],
          link: "/product/thailand",
        },
        {
          pills: [
            { text: "PH", color: "#2E4457" },
            { text: "菲律賓", color: "#17806A" },
          ],
          title: "菲律賓 eSIM",
          desc: "馬尼拉、宿霧、長灘島等熱門旅遊地上網，導航與外送 App 更順手。",
          tags: ["菲律賓", "宿霧", "長灘島"],
          link: "/product/philippines",
        },
        {
          pills: [
            { text: "ID", color: "#2E4457" },
            { text: "印尼", color: "#17806A" },
          ],
          title: "印尼 eSIM",
          desc: "雅加達、峇里島、日惹等熱門行程適用，海島與市區移動都有網。",
          tags: ["印尼", "峇里島", "熱點分享"],
          link: "/product/indonesia/indonesia-unlimited-esim",
        },
        {
          hotSale: true,
          pills: [
            { text: "VN", color: "#2E4457" },
            { text: "越南", color: "#17806A" },
          ],
          title: "越南 eSIM",
          desc: "Viettel／Vinaphone／Mobifone 當地網路，下龍灣、富國島等觀光區連線更穩。",
          tags: ["越南", "Viettel", "當地IP"],
          link: "/product/vietnam",
        },
      ],
      china: [
        {
          hotSale: true,
          pills: [
            { text: "吃到飽", color: "#FF5252" },
            { text: "中國移動", color: "#17806A" },
          ],
          title: "中國吃到飽 eSIM",
          desc: "中國移動 50–70Mbps 吃到飽，北京、上海、深圳與熱門旅遊城市覆蓋穩定，適合導航與社群。",
          tags: ["吃到飽", "中國移動", "50-70Mbps"],
          link: "/product/china/china-unlimited-esim?telecom=cmcc-70",
        },
        {
          pills: [
            { text: "社群", color: "#07819F" },
            { text: "ChatGPT", color: "#17806A" },
          ],
          title: "中國聯通 GPT + TikTok",
          desc: "中國聯通線路，支援 ChatGPT 與 TikTok，出國玩大陸社群與 AI 工具更方便。",
          tags: ["ChatGPT", "TikTok", "中國聯通"],
          link: "/product/china/china-unlimited-esim?telecom=cucc-gpt",
        },
        {
          pills: [
            { text: "Value", color: "#2E4457" },
            { text: "總量型", color: "#17806A" },
          ],
          title: "中國總量型 eSIM",
          desc: "固定總流量、天數彈性，適合行程明確、用量可預估的短期旅客。",
          tags: ["總量型", "高CP值", "中國大陸"],
          link: "/product/china/china-total-esim",
        },
      ],
      multi: [
        {
          pills: [
            { text: "雙國", color: "#2E4457" },
            { text: "美加", color: "#17806A" },
          ],
          title: "美加（美國＋加拿大）",
          desc: "一張 eSIM 暢遊美國與加拿大，不含墨西哥。適合美加自駕、滑雪與商務來回。",
          tags: ["美國", "加拿大", "跨國漫遊"],
          link: "/product/us-canada/us-canada-unlimited-esim",
        },
        {
          hotSale: true,
          pills: [
            { text: "三國", color: "#2E4457" },
            { text: "美加墨", color: "#17806A" },
          ],
          title: "北美美加墨",
          desc: "美國、加拿大、墨西哥一卡通行。AT&T 美國號碼方案可含通話與當地門號。",
          tags: ["美加墨", "AT&T", "含門號"],
          link: "/product/north-america/north-america-att-unlimited-esim",
        },
        {
          pills: [
            { text: "三地", color: "#2E4457" },
            { text: "免VPN", color: "#17806A" },
          ],
          title: "中港澳",
          desc: "中國、香港、澳門一張卡。出網香港／新加坡 IP，一般可免 VPN 使用 LINE、IG、FB。",
          tags: ["中國", "香港", "澳門"],
          link: "/product/kongkong/cnhkmo-unlimited-esim",
        },
      ],
      west: [
        {
          hotSale: true,
          pills: [
            { text: "US", color: "#2E4457" },
            { text: "美國", color: "#17806A" },
          ],
          title: "美國 eSIM",
          desc: "美國本土吃到飽與總量／每日型，出差、自駕與城市觀光免換實體卡。",
          tags: ["美國", "吃到飽", "即買即用"],
          link: "/product/usa",
        },
        {
          pills: [
            { text: "CA", color: "#2E4457" },
            { text: "加拿大", color: "#17806A" },
          ],
          title: "加拿大 eSIM",
          desc: "TELUS／Bell 總量、每日與吃到飽，溫哥華、多倫多與洛磯山行程適用。",
          tags: ["加拿大", "TELUS", "Bell"],
          link: "/product/canada",
        },
        {
          pills: [
            { text: "GB", color: "#2E4457" },
            { text: "英國", color: "#17806A" },
          ],
          title: "英國 eSIM",
          desc: "EE／Three 吃到飽、總量與每日型，倫敦、愛丁堡與歐陸轉機適用。",
          tags: ["英國", "EE", "Three"],
          link: "/product/uk",
        },
        {
          hotSale: true,
          pills: [
            { text: "FR", color: "#2E4457" },
            { text: "法國", color: "#17806A" },
          ],
          title: "法國 eSIM",
          desc: "Orange／Bouygues 吃到飽、總量與每日型，巴黎、南法與歐陸行程適用。",
          tags: ["法國", "Orange", "吃到飽"],
          link: "/product/france",
        },
        {
          pills: [
            { text: "IT", color: "#2E4457" },
            { text: "義大利", color: "#17806A" },
          ],
          title: "義大利 eSIM",
          desc: "Iliad／TIM／WindTre 方案，羅馬、米蘭、佛羅倫斯與威尼斯覆蓋穩定。",
          tags: ["義大利", "TIM", "Vodafone"],
          link: "/product/italy",
        },
        {
          pills: [
            { text: "ES", color: "#2E4457" },
            { text: "西班牙", color: "#17806A" },
          ],
          title: "西班牙 eSIM",
          desc: "Movistar／Orange 吃到飽與總量型，馬德里、巴塞隆納與安達魯西亞適用。",
          tags: ["西班牙", "Movistar", "Orange"],
          link: "/product/spain",
        },
        {
          pills: [
            { text: "CH", color: "#2E4457" },
            { text: "瑞士", color: "#17806A" },
          ],
          title: "瑞士 eSIM",
          desc: "Swisscom／Sunrise／Salt 吃到飽、總量與每日型，蘇黎世、日內瓦與阿爾卑斯行程適用。",
          tags: ["瑞士", "Swisscom", "Sunrise"],
          link: "/product/switzerland",
        },
        {
          pills: [
            { text: "AT", color: "#2E4457" },
            { text: "奧地利", color: "#17806A" },
          ],
          title: "奧地利 eSIM",
          desc: "A1／Drei／Three 吃到飽與總量型，維也納、薩爾斯堡與滑雪行程適用。",
          tags: ["奧地利", "A1", "Drei"],
          link: "/product/austria",
        },
        {
          pills: [
            { text: "TR", color: "#2E4457" },
            { text: "土耳其", color: "#17806A" },
          ],
          title: "土耳其 eSIM",
          desc: "Avea／Vodafone 吃到飽、總量與每日型，伊斯坦堡、卡帕多奇亞與安塔利亞適用。",
          tags: ["土耳其", "Vodafone", "吃到飽"],
          link: "/product/turkey",
        },
      ],
    }),
    [],
  );

  const cards = DATA[active] || [];
  const desktopGridClass =
    active === "native"
      ? "hidden md:grid gap-6 md:grid-cols-2 xl:grid-cols-4"
      : cards.length > 3
        ? "hidden md:grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        : "hidden md:grid gap-6 md:grid-cols-3";

  return (
    <section className="pt-5">
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
              <span className="inline-grid h-9 w-9 place-items-center rounded-md bg-white/70 border border-[#CAE6F1]" aria-hidden="true">
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
            <div
              role="tablist"
              aria-label="方案地區切換"
              className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-5 text-[14px] md:text-[16px] font-semibold text-[#4A6270]"
            >
              {TABS.map((t) => {
                const activeTab = t.key === active;
                return (
                  <button
                    key={t.key}
                    type="button"
                    id={`plan-tab-${t.key}`}
                    role="tab"
                    aria-selected={activeTab}
                    aria-controls={`plan-tabpanel-${t.key}`}
                    tabIndex={activeTab ? 0 : -1}
                    onClick={() => setActive(t.key)}
                    onKeyDown={(e) => {
                      const keys = TABS.map((tab) => tab.key);
                      const i = keys.indexOf(t.key);
                      let next = null;
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        next = keys[(i + 1) % keys.length];
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        next = keys[(i - 1 + keys.length) % keys.length];
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        next = keys[0];
                      } else if (e.key === "End") {
                        e.preventDefault();
                        next = keys[keys.length - 1];
                      }
                      if (!next) return;
                      setActive(next);
                      requestAnimationFrame(() => {
                        document.getElementById(`plan-tab-${next}`)?.focus();
                      });
                    }}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                      activeTab
                        ? "bg-white text-[#0D7AAF] shadow-sm"
                        : "hover:bg-white/50 text-[#4A6270]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 rounded-full inline-block transition-colors ${
                        activeTab ? "bg-[#0D7AAF]" : "bg-[#4E849C]"
                      }`}
                    />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </header>

          <div
            role="tabpanel"
            id={`plan-tabpanel-${active}`}
            aria-labelledby={`plan-tab-${active}`}
          >
          {/* 手機版輪播 */}
          <AnimatePresence mode="wait">
            <div key={`mobile-${active}`} className="md:hidden -mx-4">
              <MobileCardCarousel
                align="center"
                slideClassName="min-w-0 flex-[0_0_76%]"
                autoplayDelay={4500}
                label="連線方案卡片輪播"
              >
                {cards.map((c, i) => (
                  <JobCard
                    key={`${active}-m-${i}`}
                    title={c.title}
                    desc={c.desc}
                    pills={c.pills}
                    tags={c.tags}
                    link={c.link}
                    hotSale={!!c.hotSale}
                    noAnimation
                  />
                ))}
              </MobileCardCarousel>
            </div>
          </AnimatePresence>

          {/* 桌面版網格 */}
          <AnimatePresence mode="wait">
            <div key={`desktop-${active}`} className={desktopGridClass}>
              {cards.map((c, i) => (
                <JobCard
                  key={`${active}-d-${i}`}
                  title={c.title}
                  desc={c.desc}
                  pills={c.pills}
                  tags={c.tags}
                  link={c.link}
                  hotSale={!!c.hotSale}
                  delay={i * 0.06}
                />
              ))}
            </div>
          </AnimatePresence>
          </div>

          {/* 注意文 */}
          <FadeUp delay={0.06}>
            <p
              className="mt-10 text-center text-[13px] text-[#4A6270]"
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
              <Link
                href="/product"
                className="group relative inline-flex items-center justify-center"
              >
                <div className="absolute inset-0 h-full w-full rounded-full bg-[#056E88] opacity-0 transition-all duration-300 group-hover:translate-x-1.5 group-hover:translate-y-1.5 group-hover:opacity-100" />

                <div className="relative z-10 inline-flex items-center justify-center overflow-hidden rounded-full bg-[#07819F] px-8 py-3.5 font-bold text-white shadow-lg shadow-[#07819F]/30 transition-all duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[#056E88]/40">
                  <span className="relative inline-flex overflow-hidden">
                    <div className="flex items-center gap-3 transition-transform duration-500 group-hover:translate-x-[150%] group-hover:skew-x-12">
                      查看所有方案
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                        <ArrowIcon />
                      </span>
                    </div>

                    <div className="absolute inset-0 flex items-center gap-3 transition-transform duration-500 -translate-x-[150%] skew-x-12 group-hover:translate-x-0 group-hover:skew-x-0" aria-hidden="true">
                      查看所有方案
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                        <ArrowIcon />
                      </span>
                    </div>
                  </span>
                </div>
              </Link>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
