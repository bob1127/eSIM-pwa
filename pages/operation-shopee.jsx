"use client";

import { useEffect, useState } from "react";
import Layout from "./Layout.js";
import Image from "next/image";
import Carousel from "../components/ThreeHorizontalSlider.jsx";

const SECTION_ANCHORS = [
  { id: "prep", label: "事前準備" },
  { id: "install", label: "安裝eSIM" },
  { id: "shopee", label: "蝦皮兌換教學" },
];

const CHECK_ESIM_SUPPORT_STEPS = [
  {
    title: "方法一：撥號 *#06#",
    desc: "在撥號畫面輸入 *#06#，若顯示 EID、IMEI 與 IMEI2，代表裝置支援 eSIM。",
    image: "/images/check-esim-support/support-01.png",
  },
  {
    title: "方法二：行動服務設定裡查看",
    desc: "前往「行動服務」，看到「新增 eSIM」或「加入流動數據計劃」，即代表支援 eSIM。",
    image: "/images/check-esim-support/support-02.png",
  },
  {
    title: "方法三：確認是否已解鎖",
    desc: "設定 > 一般 > 關於本機，查看「電信業者鎖定」。顯示「沒有 SIM 卡限制」即為已解鎖。",
    image: "/images/check-esim-support/support-03.png",
  },
];

const ESIM_INSTALL_METHODS = [
  {
    title: "使用行動條碼掃描",
    desc: "前往「設定」>「行動服務」>「加入 eSIM」，選擇「使用行動條碼」，掃描 Jeko 寄給您的 QR Code 即可完成安裝。",
    image: "/images/how-to-install-esim/使用行動條碼掃描.png",
  },
  {
    title: "使用相機掃描 QR Code",
    desc: "開啟 iPhone 相機對準 QR Code，點擊畫面上方出現的「行動方案」通知，依指示加入 eSIM。",
    image: "/images/how-to-install-esim/使用相機掃描qrcode.png",
  },
  {
    title: "長按 QR Code 啟用",
    desc: "在郵件、LINE 或訂單頁長按 QR Code 圖片，選擇「加入行動方案」或「加入 eSIM」，即可開始安裝。",
    image: "/images/how-to-install-esim/長按qrcode啟用.png",
  },
  {
    title: "手動安裝",
    desc: "若無法掃描 QR Code，請選擇「手動輸入詳細資料」，輸入 SM-DP+ 位址與啟用碼（訂單信內提供）完成安裝。",
    image: "/images/how-to-install-esim/手動安裝.png",
  },
];

const INSTALL_ACCORDIONS = [
  {
    id: 1,
    label: "STEP-01",
    title: "安裝 eSIM",
    summary:
      "可透過以下四種方式安裝 Jeko eSIM，請選擇最順手的一種完成設定。",
    steps: ESIM_INSTALL_METHODS,
  },
  {
    id: 2,
    label: "STEP-02",
    title: "確認裝置支援與解鎖",
    summary:
      "安裝前請先確認手機支援 eSIM，且為電信商解鎖機。可依下列三種方式檢查。",
    steps: CHECK_ESIM_SUPPORT_STEPS,
  },
  {
    id: 3,
    label: "STEP-03",
    title: "設置 eSIM 標籤",
    summary:
      "啟用 eSIM 後會進入行動服務頁面。新增的 eSIM 通常出現在清單底部，可自訂標籤（例如「jeko eSIM」）方便之後辨識。",
    image: "/images/esim-setting/設置eSIM標籤.png",
    imageCaption: "在行動服務中為旅遊 eSIM 設定自訂標籤",
  },
];

function InstallAccordionCard({ item, expanded, onToggle }) {
  return (
    <div id={`install-step-${item.id}`} className="content my-4 scroll-mt-32">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className={`border duration-300 rounded-2xl flex flex-col md:flex-row overflow-hidden cursor-pointer select-none ${
          expanded
            ? "border-gray-900"
            : "border-gray-400 hover:border-gray-900"
        }`}
      >
        <div
          className={`steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center text-left md:text-center transition-colors ${
            expanded ? "bg-[#1A5AD1] text-white" : "bg-gray-50 text-stone-900"
          }`}
        >
          <b className="text-lg md:text-xl">{item.label}</b>
          <p
            className={`text-xs md:text-[14px] mt-2 ${
              expanded ? "text-gray-100" : "text-stone-600"
            }`}
          >
            {item.title}
          </p>
          <span
            className={`mt-3 inline-flex text-xs tracking-widest uppercase ${
              expanded ? "text-blue-100" : "text-stone-400"
            }`}
          >
            {expanded ? "收合範例 ↑" : "展開範例 ↓"}
          </span>
        </div>

        <div className="w-full md:w-4/5 border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8">
          <p className="text-sm leading-relaxed text-stone-900">{item.summary}</p>

          <div
            className={`grid transition-[grid-template-rows,margin] duration-500 ease-in-out ${
              expanded ? "grid-rows-[1fr] mt-8" : "grid-rows-[0fr] mt-0"
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={`transform transition-all ease-out ${
                  expanded
                    ? "opacity-100 translate-y-0 duration-700 delay-100"
                    : "opacity-0 translate-y-6 duration-300"
                }`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {item.steps?.length > 0 && (
                  <div className="grid grid-cols-1 gap-8">
                    {item.steps.map((step) => (
                      <div key={step.image} className="img-wrap">
                        <p className="border-b border-black text-stone-800 font-bold text-lg px-1 py-2 mb-3">
                          {step.title}
                        </p>
                        <p className="text-sm text-stone-600 leading-relaxed mb-4">
                          {step.desc}
                        </p>
                        <Image
                          width={1000}
                          height={800}
                          className="w-full max-w-[880px] h-auto rounded-lg border border-gray-100"
                          src={step.image}
                          alt={step.title}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {item.image && (
                  <div className="img-wrap">
                    {item.imageCaption ? (
                      <p className="border-b border-black text-stone-800 font-bold text-lg px-1 py-2 mb-3">
                        {item.imageCaption}
                      </p>
                    ) : null}
                    <Image
                      width={1000}
                      height={800}
                      className="w-full max-w-[560px] h-auto rounded-lg border border-gray-100"
                      src={item.image}
                      alt={item.title}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isStep1Expanded, setIsStep1Expanded] = useState(false);
  const [openInstallSteps, setOpenInstallSteps] = useState({});
  const [isShopeeComingSoonOpen, setIsShopeeComingSoonOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTION_ANCHORS[0].id);

  const toggleInstallStep = (id) => {
    setOpenInstallSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openInstallStep = (id) => {
    setOpenInstallSteps((prev) => ({ ...prev, [id]: true }));
    requestAnimationFrame(() => {
      document
        .getElementById(`install-step-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveSection(id);
  };

  useEffect(() => {
    const sections = SECTION_ANCHORS.map((a) =>
      document.getElementById(a.id),
    ).filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25, 0.5] },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <Layout>
      {/* <Carousel /> */}
      <div className="main pt-20">
        {/* 手機：頂部橫向錨點 */}
        <nav className="md:hidden sticky top-[64px] z-40 border-b border-gray-200 bg-white/95 backdrop-blur px-3 py-2">
          <ul className="flex gap-1 overflow-x-auto">
            {SECTION_ANCHORS.map((item) => (
              <li key={item.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-wide transition ${
                    activeSection === item.id
                      ? "bg-[#1a5ad1] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col md:flex-row">
          {/* 桌面：最左側 sticky 錨點 */}
          <aside className="hidden md:block md:w-[72px] lg:w-[96px] shrink-0 border-r border-gray-200 bg-white">
            <nav className="sticky top-28 flex flex-col items-center gap-8 py-10 px-2">
              {SECTION_ANCHORS.map((item, index) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => scrollToSection(item.id)}
                    className={`group flex flex-col items-center gap-2 transition ${
                      isActive ? "text-[#1a5ad1]" : "text-stone-400 hover:text-stone-700"
                    }`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span
                      className={`text-[11px] tracking-[0.35em] font-medium ${
                        isActive ? "text-[#1a5ad1]" : "text-stone-300"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`[writing-mode:vertical-rl] [text-orientation:upright] text-sm lg:text-base font-bold tracking-[0.35em] leading-none py-1 border-l-2 pl-2 ${
                        isActive
                          ? "border-[#1a5ad1]"
                          : "border-transparent group-hover:border-stone-300"
                      }`}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
        <section
          id="prep"
          className="operation-step scroll-mt-28 border-b border-gray-200"
        >
          {/* 右側主要內容卡片 */}
          <div className="w-full border border-gray-200 border-l-0 bg-white">
            {/* TOP TITLE */}
            <div className="border-b border-gray-200 bg-[#1a5ad1] px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h2 className="text-3xl md:text-5xl text-stone-50 lg:text-6xl font-bold">
                STEP-01
              </h2>
              <h3 className="text-stone-200 text-xl">事前準備</h3>

              <b className="mt-2 text-stone-400 text-sm md:text-base">
                Preparations
              </b>
              <button className="group mt-4 relative  max-w-[200px] inline-flex h-12 items-center justify-center overflow-hidden rounded-full border border-[#1a5ad1] bg-white text-[#1a5ad1] px-6 font-medium duration-500">
                <div className="translate-x-0 opacity-100 transition group-hover:-translate-x-[150%] group-hover:opacity-0">
                  觀看操作影片
                </div>
                <div className="absolute translate-x-[150%] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                  >
                    <path
                      d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8 items-start">
              {/* LEFT：手機檢查錨點 */}
              <div className="lg:w-[14%] lg:shrink-0 w-full">
                <div className="mb-4 lg:hidden">
                  <b className="text-base">手機檢查</b>
                </div>
                <div className="hidden lg:block sticky top-28 z-10 self-start w-full">
                  <nav className="flex w-full flex-col gap-2 py-1">
                    <b className="text-[22px] text-stone-900 mb-1">手機檢查</b>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStep1Expanded(true);
                        window.setTimeout(() => {
                          document
                            .getElementById("prep-unlock")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }, 320);
                      }}
                      className="text-left text-sm tracking-widest text-stone-600 hover:font-bold hover:text-stone-900 duration-300 transition-all"
                    >
                      確認是否已解鎖
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStep1Expanded(true);
                        window.setTimeout(() => {
                          document
                            .getElementById("prep-compat")
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        }, 320);
                      }}
                      className="text-left text-sm tracking-widest text-stone-600 hover:font-bold hover:text-stone-900 duration-300 transition-all"
                    >
                      eSIM 相容性
                    </button>
                  </nav>
                </div>
              </div>

              {/* RIGHT CONTENT */}
              <div className="lg:w-[86%] lg:pr-8 w-full min-w-0">
                <div className="title pb-4 md:py-5">
                  <p className="text-sm md:text-base tracking-wider">
                    簡單安裝 eSIM 至您的手機裡，並快速啟用服務
                  </p>
                </div>

                {/* 🌟 STEP CARD 1 (加入點擊展開功能與延遲 Fade-up) 🌟 */}
                <div className="content my-4">
                  <div
                    onClick={() => setIsStep1Expanded(!isStep1Expanded)}
                    className="border border-gray-400 hover:border-gray-900 duration-300 rounded-2xl flex flex-col md:flex-row overflow-hidden cursor-pointer"
                  >
                    {/* STEP LABEL */}
                    <div className="steap w-full bg-[#1A5AD1] md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center">
                      <b className="text-lg md:text-xl text-white">方法-01</b>
                      <p className="text-xs md:text-[14px] text-gray-100 mt-2">
                        確認手機是否支援eSIM
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8">
                      {/* 上半部：永遠顯示的內容 */}
                      <div className="w-full flex flex-col md:flex-row justify-center items-center gap-6">
                        <div className="w-full md:w-1/2">
                          <p className="text-sm leading-relaxed text-stone-900">
                            為了確保您能順利安裝與啟用
                            eSIM，請先確認您的手機是否支援 eSIM，
                            <br />
                            並符合最低系統版本與機型需求。您可以先查看以下的基本支援列表，
                            <br />
                            完成初步確認後，再前往商品頁輸入手機型號與資料庫進行最終比對。
                          </p>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSpecOpen(true);
                            }}
                            className="mt-5 max-w-[240px] inline-flex items-center rounded-full border border-gray-900 px-5 py-2 text-xs tracking-[0.25em] uppercase hover:bg-gray-900 hover:text-white transition"
                          >
                            查看支援機型與基本規格
                          </button>
                        </div>
                        <div className="w-full md:w-1/2 flex justify-center items-center mt-4 md:mt-0">
                          <img
                            src="/素材/形象/蝦皮-購買流程.png"
                            className="w-[80%] max-w-xs mx-auto"
                            alt=""
                          />
                        </div>
                      </div>

                      {/* 🌟 核心修改：高度漸變外層 + 延遲 Fade-up 內層 🌟 */}
                      <div
                        className={`grid transition-[grid-template-rows,margin] duration-500 ease-in-out ${
                          isStep1Expanded
                            ? "grid-rows-[1fr] mt-8"
                            : "grid-rows-[0fr] mt-0"
                        }`}
                      >
                        {/* 必須要有這個 overflow-hidden 包住，高度變化才不會跑版 */}
                        <div className="overflow-hidden">
                          {/* 內容本體：展開時延遲 150ms 淡入上滑，收合時瞬間淡出加速收起 */}
                          <div
                            className={`flex flex-col gap-6 transform transition-all ease-out ${
                              isStep1Expanded
                                ? "opacity-100 translate-y-0 duration-700 delay-150"
                                : "opacity-0 translate-y-8 duration-300 delay-0"
                            }`}
                          >
                            <div
                              id="prep-compat"
                              className="more-info scroll-mt-32"
                            >
                              <p className="font-extrabold mb-6 text-xl">
                                請確認您的手機同時具備 eSIM 相容性 以及
                                電信商解鎖（無鎖機）
                              </p>
                              <div className="img-wrap">
                                <Image
                                  width={1000}
                                  height={800}
                                  className="max-w-[880px]"
                                  src="/images/教學/您的裝置是否支援eSIM/是否支援-eSIM-的方式01.png"
                                  alt="確認裝置是否支援 eSIM"
                                />
                                <b className="block mt-4">
                                  前往「行動服務」。看到「新增
                                  eSIM」或「加入流動數據計劃」，則代表您的裝置支援
                                  eSIM。
                                </b>
                              </div>
                            </div>

                            <div
                              id="prep-unlock"
                              className="more-info mt-8 border-t border-gray-100 pt-8 pb-4 scroll-mt-32"
                            >
                              <p className="font-extrabold mb-6 text-xl">
                                如何確認我的 iPhone 是否已解鎖？
                              </p>
                              <div className="img-wrap">
                                <Image
                                  width={1000}
                                  height={800}
                                  className="max-w-[880px]"
                                  src="/images/教學/您的裝置是否支援eSIM/如何確認我的-iPhone-是否已解鎖.png"
                                  alt="確認解鎖"
                                />
                                <b className="block mt-6 leading-relaxed">
                                  1. 開啟 「設定 一般 關於本機」。<br></br>
                                  2. 向下滑動並查看 「電信業者鎖定」。若顯示
                                  「沒有 SIM 卡限制」，代表您的 iPhone 已解鎖。{" "}
                                  <br></br>
                                  <br></br>
                                  如何確認我的 Android 裝置是否已解鎖？{" "}
                                  <br></br>
                                  以下是兩種確認 Android
                                  裝置是否為電信解鎖機的方法。 <br></br>
                                  <br></br>
                                  1. 聯絡銷售商或電信業者<br></br>
                                  若您直接向製造商（如
                                  Samsung）購買，裝置通常已解鎖。若透過電信業者（如
                                  Orange、AT&T、Movistar）購買，可能僅能使用該業者網路。請聯絡電信業者確認裝置狀態，並詢問是否可協助解鎖。
                                  <br></br>
                                  <br></br>
                                  2. 使用其他 SIM 卡測試 <br></br>
                                  插入親友的 SIM
                                  卡進行測試。若可正常撥打電話或傳送簡訊，表示裝置已解鎖。若無法使用，代表裝置仍綁定原電信業者，且不支援
                                  eSIM。
                                </b>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Accordion 結束 */}
                    </div>
                  </div>
                </div>

                {/* STEP CARD 2 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">方法-02</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-stone-900">
                            為了確保您能順利安裝與啟用
                            eSIM，請先確認您的手機是否支援 eSIM，
                            <br />
                            並符合最低系統版本與機型需求。您可以先查看以下的基本支援列表，
                            <br />
                            完成初步確認後，再前往商品頁輸入手機型號與資料庫進行最終比對。
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsSpecOpen(true)}
                            className="mt-5 max-w-[240px] inline-flex items-center rounded-full border border-gray-900 px-5 py-2 text-xs tracking-[0.25em] uppercase hover:bg-gray-900 hover:text-white transition"
                          >
                            查看支援機型與基本規格
                          </button>
                        </div>
                      </div>
                      <div className="md:w-1/2 flex justify-center items-center mt-4 md:mt-0">
                        <img
                          src="/素材/形象/蝦皮-購買流程.png"
                          className="w-[80%] max-w-xs mx-auto"
                          alt=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------- INSTALL：eSIM 安裝啟用 -------------------- */}

        <section
          id="install"
          className="operation-step scroll-mt-28 border-b border-gray-200"
        >
          <div className="w-full border border-gray-200 border-l-0">
            <div className="border-b border-gray-200 bg-[#1a5ad1] px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl text-stone-50 lg:text-6xl font-bold">
                INSTALL
              </h1>
              <b className="mt-2 text-stone-400 text-sm md:text-base">
                eSIM安裝啟用
              </b>
              <button className="group mt-4 relative max-w-[200px] inline-flex h-12 items-center justify-center overflow-hidden rounded-md border border-[#1a5ad1] bg-white text-[#1a5ad1] px-6 font-medium duration-500">
                <div className="translate-x-0 opacity-100 transition group-hover:-translate-x-[150%] group-hover:opacity-0">
                  觀看操作影片
                </div>
                <div className="absolute translate-x-[150%] opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100">
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                  >
                    <path
                      d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </div>
              </button>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8 items-start">
              <div className="lg:w-[14%] lg:shrink-0 w-full">
                <div className="mb-4 lg:hidden">
                  <b className="text-base">基本安裝</b>
                </div>
                <div className="hidden lg:block sticky top-28 z-10 self-start w-full">
                  <nav className="flex w-full flex-col gap-2 py-1">
                    <b className="text-[22px] text-stone-900 mb-1">基本安裝</b>
                    {INSTALL_ACCORDIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openInstallStep(item.id)}
                        className={`text-left text-sm tracking-widest duration-300 transition-all ${
                          openInstallSteps[item.id]
                            ? "font-bold text-[#1a5ad1]"
                            : "text-stone-600 hover:font-bold hover:text-stone-900"
                        }`}
                      >
                        {item.title}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              <div className="lg:w-[86%] lg:pr-8 w-full min-w-0">
                <div className="title pb-4 md:py-5">
                  <p className="text-sm md:text-base tracking-wider">
                    依下列步驟安裝並啟用 eSIM，點擊卡片可展開操作範例圖
                  </p>
                </div>

                {INSTALL_ACCORDIONS.map((item) => (
                  <InstallAccordionCard
                    key={item.id}
                    item={item}
                    expanded={!!openInstallSteps[item.id]}
                    onToggle={() => toggleInstallStep(item.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="shopee"
          className="operation-step scroll-mt-28"
        >
          <div className="w-full border border-gray-200 border-l-0 bg-white">
            <div className="border-b border-gray-200 bg-[#1a5ad1] px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-stone-50">
                SHOPEE
              </h1>
              <span className="mt-2 text-sm md:text-base text-stone-200">
                蝦皮兌換碼兌換QRcode
              </span>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              <div className="lg:w-[10%]">
                <div className="mb-4 lg:hidden">
                  <b className="text-base">兌換教學</b>
                </div>
                <div className="hidden lg:block">
                  <div className="sticky top-4 h-auto">
                    <b className="text-[22px] [writing-mode:vertical-rl] [text-orientation:upright]">
                      兌換教學
                    </b>
                  </div>
                </div>
              </div>

              <div className="lg:w-[90%] lg:pr-8">
                <div className="title pb-4 md:py-5">
                  <p className="text-sm md:text-base tracking-wider text-stone-500">
                    蝦皮兌換功能建置中，點擊下方卡片了解狀態
                  </p>
                </div>

                <div className="content my-4">
                  <button
                    type="button"
                    onClick={() => setIsShopeeComingSoonOpen(true)}
                    className="w-full border border-gray-400 hover:border-gray-900 duration-300 rounded-2xl flex flex-col md:flex-row overflow-hidden text-left group"
                  >
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-orange-50 group-hover:bg-[#ee4d2d] transition-colors">
                      <b className="text-lg md:text-xl text-[#ee4d2d] group-hover:text-white transition-colors">
                        SHOPEE
                      </b>
                      <p className="text-xs md:text-[14px] mt-2 text-orange-700/80 group-hover:text-orange-50 transition-colors">
                        兌換碼 → QR Code
                      </p>
                    </div>
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row items-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2">
                        <p className="text-sm leading-relaxed text-stone-900">
                          於蝦皮購買後，可用兌換碼在此換取 eSIM QR
                          Code。功能即將上線，敬請期待。
                        </p>
                        <span className="mt-5 inline-flex items-center rounded-full border border-[#ee4d2d] px-5 py-2 text-xs tracking-[0.2em] text-[#ee4d2d] group-hover:bg-[#ee4d2d] group-hover:text-white transition">
                          點擊查看狀態
                        </span>
                      </div>
                      <div className="md:w-1/2 flex justify-center items-center">
                        <img
                          src="/素材/形象/蝦皮-購買流程.png"
                          className="w-[80%] max-w-xs mx-auto opacity-80"
                          alt="蝦皮兌換示意"
                        />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
          </div>
        </div>
      </div>

      {/* --------------------------------------- */}
      {/* 🔹 POPUP：支援機型與規格表 */}
      {/* --------------------------------------- */}
      {isShopeeComingSoonOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setIsShopeeComingSoonOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopee-coming-soon-title"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="shopee-coming-soon-title"
                className="text-lg font-semibold text-stone-900"
              >
                即將上線
              </h2>
              <button
                type="button"
                onClick={() => setIsShopeeComingSoonOpen(false)}
                className="text-sm text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>
            <p className="text-sm leading-relaxed text-stone-600">
              蝦皮兌換碼兌換 QR Code
              功能目前建置中，尚未開放使用。上線後即可在此輸入兌換碼取得
              eSIM，敬請期待。
            </p>
            <button
              type="button"
              onClick={() => setIsShopeeComingSoonOpen(false)}
              className="mt-6 w-full rounded-full bg-[#ee4d2d] py-2.5 text-sm font-medium text-white hover:bg-[#d73211] transition"
            >
              知道了
            </button>
          </div>
        </div>
      )}

      {isSpecOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                支援型號與基本規格（快速確認）
              </h2>
              <button
                type="button"
                onClick={() => setIsSpecOpen(false)}
                className="text-sm text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-xs text-gray-600">
              下列表格僅供初步確認。實際是否支援請以前往商品頁輸入您的手機型號後，
              與資料庫比對結果為準。
            </p>

            <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
              <div className="font-medium text-gray-500">品牌 / 機型</div>
              <div className="font-medium text-gray-500">系統版本</div>
              <div className="font-medium text-gray-500">eSIM 支援</div>

              <div>Apple iPhone XR 以上</div>
              <div>iOS 16 以上</div>
              <div>支援 eSIM</div>

              <div>Samsung Galaxy S20 以上</div>
              <div>Android 12 以上</div>
              <div>支援（部分機型）</div>

              <div>Google Pixel 4 以上</div>
              <div>Android 12 以上</div>
              <div>支援 eSIM</div>
            </div>

            <ul className="mb-3 list-disc space-y-1 pl-5 text-[11px] text-gray-500">
              <li>支援度會依國家 / 型號不同而有所差異。</li>
              <li>若未出現在列表中，仍可於商品頁輸入型號查詢。</li>
            </ul>

            <button
              type="button"
              onClick={() => setIsSpecOpen(false)}
              className="mt-2 w-full rounded-full border border-gray-900 py-2 text-xs font-medium hover:bg-gray-900 hover:text-white transition"
            >
              已了解，前往下一步
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
