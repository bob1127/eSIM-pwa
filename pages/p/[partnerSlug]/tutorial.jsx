"use client";

import { useState } from "react";
import Layout from "@/components/PartnerLayout";
import Image from "next/image";
// 🌟 確保引入 supabase
import { supabase } from "@/lib/supabaseClient";
import { getSupabaseAdminServer } from "@/lib/supabaseAdminServer";

// 🌟 1. 接收從 getServerSideProps 傳來的 store
export default function Home({ store }) {
  const [isSpecOpen, setIsSpecOpen] = useState(false);
  const [isStep1Expanded, setIsStep1Expanded] = useState(false);

  return (
    // 🌟 2. 將 store 傳遞給 Layout
    <Layout store={store} title="安裝教學">
      <div className="main pt-20">
        <section className="operation-step flex flex-col md:flex-row">
          {/* 左側 01 標示 */}
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>

          <div className="hidden lg:block lg:w-[11%]" />

          {/* 右側主要內容卡片 */}
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 bg-white">
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

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              {/* LEFT VERTICAL TITLE */}
              <div className="lg:w-[10%]">
                <div className="mb-4 lg:hidden">
                  <b className="text-base">基本安裝</b>
                </div>
                <div className="hidden lg:block">
                  <div className="sticky  w-full top-4 h-auto">
                    <div className="border w-full flex flex-col">
                      <b className="text-[22px]  ">手機檢查</b>
                      <div className="tracking-widest hover:font-bold duration-300 transition-all">
                        確認是否已解鎖
                      </div>
                      <div className="tracking-widest hover:font-bold duration-300 transition-all">
                        eSIM 相容性
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT CONTENT */}
              <div className="lg:w-[90%] lg:pr-8">
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
                      <b className="text-lg md:text-xl text-white">STEP-01</b>
                      <p className="text-xs md:text-[14px] text-gray-100 mt-2">
                        確認手機規格型號
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
                            <div className="more-info">
                              <p className="font-extrabold mb-6 text-xl">
                                請確認您的手機同時具備 eSIM 相容性 以及
                                電信商解鎖（無鎖機）
                              </p>
                              <div className="img-wrap">
                                <p className="border-b-1 mt-5 border-black text-stone-800 font-bold text-lg px-3 py-2 ">
                                  方法一：
                                </p>
                                <Image
                                  width={1000}
                                  height={800}
                                  className="max-w-[880px]"
                                  src="/images/教學/您的裝置是否支援eSIM/是否支援-eSIM-的方式01.png"
                                  alt="方法一"
                                />
                                <b className="block mt-4">
                                  前往「行動服務」。看到「新增
                                  eSIM」或「加入流動數據計劃」，則代表您的裝置支援
                                  eSIM。
                                </b>
                              </div>
                              <div className="img-wrap mt-8">
                                <p className="border-b-1 border-black text-stone-800 font-bold text-lg px-3 py-2 ">
                                  方法二：
                                </p>
                                <Image
                                  width={1000}
                                  height={800}
                                  className="max-w-[880px]"
                                  src="/images/教學/您的裝置是否支援eSIM/是否支援-eSIM-的方式02.png"
                                  alt="方法二"
                                />
                                <b className="block mt-4">
                                  撥打 *#06# 並按下通話鍵，若顯示 EID
                                  號碼，即表示您的裝置支援 eSIM。
                                </b>
                              </div>
                            </div>

                            <div className="more-info mt-8 border-t border-gray-100 pt-8 pb-4">
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
                      <b className="text-lg md:text-xl">STEP-01</b>
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

                {/* STEP CARD 3 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

        {/* -------------------- 以下保持原樣 -------------------- */}

        <section className="operation-step flex flex-col md:flex-row">
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>
          <div className="hidden lg:block lg:w-[11%]" />
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 ">
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

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              <div className="lg:w-[10%]">
                <div className="mb-4 lg:hidden">
                  <b className="text-base">基本安裝</b>
                </div>
                <div className="hidden lg:block">
                  <div className="sticky top-4 h-auto">
                    <b className="text-[22px] [writing-mode:vertical-rl] [text-orientation:upright]">
                      基本安裝
                    </b>
                  </div>
                </div>
              </div>

              <div className="lg:w-[90%] lg:pr-8">
                <div className="title pb-4 md:py-5">
                  <p className="text-sm md:text-base tracking-wider">
                    簡單安裝 eSIM 至您的手機裡，並快速啟用服務
                  </p>
                </div>

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

        <section className="operation-step flex flex-col md:flex-row">
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>
          <div className="hidden lg:block lg:w-[11%]" />
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold">
                SHOPEE
              </h1>
              <span className="mt-2 text-sm md:text-base">
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
                  <p className="text-sm md:text-base tracking-wider">
                    簡單安裝 eSIM 至您的手機裡，並快速啟用服務
                  </p>
                </div>

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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

                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
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
      </div>

      {/* --------------------------------------- */}
      {/* 🔹 POPUP：支援機型與規格表 */}
      {/* --------------------------------------- */}
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

// 🌟 3. 在檔案最下方加入 getServerSideProps 抓取分店資料
export async function getServerSideProps(context) {
  const { partnerSlug } = context.params;

  // 使用 Supabase 根據網址上的 partnerSlug 尋找對應的店鋪資料
  const db = getSupabaseAdminServer();
  const { data: store, error } = await db
    .from("stores")
    .select("*")
    .eq("domain", partnerSlug)
    .eq("status", "active")
    .single();

  // 如果找不到店鋪或是店鋪已被停權，就顯示 404 頁面
  if (error || !store) {
    return { notFound: true };
  }

  // 成功找到店鋪，將資料作為 props 傳給上方的 Home 元件
  return {
    props: {
      store,
    },
  };
}
