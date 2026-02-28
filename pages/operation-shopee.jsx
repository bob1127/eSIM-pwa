"use client";

import { useState } from "react";
import Layout from "./Layout.js";
import Image from "next/image";
import Carousel from "../components/ThreeHorizontalSlider.jsx";

export default function Home() {
  const [isSpecOpen, setIsSpecOpen] = useState(false);

  return (
    <Layout>
      {/* <Carousel /> */}
      <div className="main pt-20">
        <section className="operation-step flex flex-col md:flex-row">
          {/* 左側 01 標示：手機在上方，桌機在左邊垂直欄位 */}
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>

          {/* 中間預留空白：桌機用，手機隱藏 */}
          <div className="hidden lg:block lg:w-[11%]" />

          {/* 右側主要內容卡片 */}
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 bg-white">
            {/* TOP TITLE */}
            <div className="border-b border-gray-200 px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold">
                OPERATION
              </h1>
              <span className="mt-2 text-sm md:text-base">eSIM安裝啟用</span>
            </div>

            <div className="flex flex-col  lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              {/* LEFT VERTICAL TITLE */}
              <div className="lg:w-[10%]">
                {/* 手機版：橫向文字 */}
                <div className="mb-4 lg:hidden">
                  <b className="text-base">基本安裝</b>
                </div>

                {/* 桌機版：直書 + sticky */}
                <div className="hidden lg:block">
                  <div className="sticky w-full top-4 h-auto">
                    <div className="border w-full flex flex-col">
                      <b className="text-[22px]  ">購買流程</b>
                      <div className="tracking-widest hover:font-bold duration-300 transition-all">
                        官網購買
                      </div>
                      <div className="tracking-widest hover:font-bold duration-300 transition-all">
                        蝦皮購買
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

                {/* STEP CARD 1 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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

                {/* STEP CARD 2 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                {/* END STEP CARDS */}
              </div>
            </div>
          </div>
        </section>

        <section className="operation-step flex flex-col md:flex-row">
          {/* 左側 01 標示：手機在上方，桌機在左邊垂直欄位 */}
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>

          {/* 中間預留空白：桌機用，手機隱藏 */}
          <div className="hidden lg:block lg:w-[11%]" />

          {/* 右側主要內容卡片 */}
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 bg-white">
            {/* TOP TITLE */}
            <div className="border-b border-gray-200 px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold">
                OPERATION
              </h1>
              <span className="mt-2 text-sm md:text-base">eSIM安裝啟用</span>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              {/* LEFT VERTICAL TITLE */}
              <div className="lg:w-[10%]">
                {/* 手機版：橫向文字 */}
                <div className="mb-4 lg:hidden">
                  <b className="text-base">基本安裝</b>
                </div>

                {/* 桌機版：直書 + sticky */}
                <div className="hidden lg:block">
                  <div className="sticky top-4 h-auto">
                    <b className="text-[22px] [writing-mode:vertical-rl] [text-orientation:upright]">
                      基本安裝
                    </b>
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

                {/* STEP CARD 1 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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

                {/* STEP CARD 2 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                {/* END STEP CARDS */}
              </div>
            </div>
          </div>
        </section>

        <section className="operation-step flex flex-col md:flex-row">
          {/* 左側 01 標示：手機在上方，桌機在左側窄欄位 */}
          <div className="md:w-[4%] border border-gray-200 flex items-center justify-center md:justify-start px-4 py-3 md:py-0">
            <p className="text-sm md:text-base tracking-[0.3em]">01</p>
          </div>

          {/* 中間預留空白：桌機用，手機隱藏 */}
          <div className="hidden lg:block lg:w-[11%]" />

          {/* 右側主要內容卡片 */}
          <div className="w-full md:flex-1 lg:w-[90%] border border-gray-200 bg-white">
            {/* TOP TITLE */}
            <div className="border-b border-gray-200 px-6 md:px-16 lg:px-20 py-8 md:py-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold">
                SHOPEE
              </h1>
              <span className="mt-2 text-sm md:text-base">
                蝦皮兌換碼兌換QRcode
              </span>
            </div>

            <div className="flex flex-col lg:flex-row px-6 md:px-16 lg:px-20 py-10 gap-8">
              {/* LEFT VERTICAL TITLE */}
              <div className="lg:w-[10%]">
                {/* 手機版：橫向文字 */}
                <div className="mb-4 lg:hidden">
                  <b className="text-base">兌換教學</b>
                </div>

                {/* 桌機版：直書 + sticky */}
                <div className="hidden lg:block">
                  <div className="sticky top-4 h-auto">
                    <b className="text-[22px] [writing-mode:vertical-rl] [text-orientation:upright]">
                      兌換教學
                    </b>
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

                {/* STEP CARD 1 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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

                {/* STEP CARD 2 */}
                <div className="content my-4">
                  <div className="border border-gray-800 rounded-2xl flex flex-col md:flex-row overflow-hidden">
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                    {/* STEP LABEL */}
                    <div className="steap w-full md:w-1/5 p-6 md:p-8 flex flex-col justify-center items-center bg-gray-50">
                      <b className="text-lg md:text-xl">STEP-01</b>
                      <p className="text-xs md:text-[14px] mt-2">
                        確認手機規格型號
                      </p>
                    </div>

                    {/* DESCRIPTION + BUTTON */}
                    <div className="w-full md:w-4/5 flex flex-col md:flex-row justify-center border-t md:border-t-0 md:border-l border-gray-200 p-6 md:p-8 gap-6">
                      <div className="md:w-1/2 flex justify-center items-center">
                        <div>
                          <p className="text-sm leading-relaxed text-gray-700">
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
                {/* END STEP CARDS */}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* --------------------------------------- */}
      {/* 🔹 POPUP：支援機型與規格表 */}
      {/* --------------------------------------- */}
      {isSpecOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            {/* HEADER */}
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

            {/* TABLE */}
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

            {/* NOTES */}
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
