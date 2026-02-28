"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Layout from "./Layout.js";
import Image from "next/image";
import AccordionItem from "../components/AccordionItem";

export default function ContactPage() {
  return (
    <Layout>
      <div className=" bg-[#f0f1f2] flex-col flex justify-center items-center py-[200px] ">
        <section className="contact-form   max-w-[1920px] flex flex-col md:flex-row mx-auto w-[80%]">
          <div className="left w-full md:w-1/2">
            <span className="bg-white rounded-full py-2 px-4  text-[#2a4ff4] text-[16px] w-[90px] text-center">
              CONTACT
            </span>
            <div className="">
              <h1 className="text-[55px] font-normal">立即聯絡</h1>
              <p>
                Lorem ipsum, dolor sit amet consectetur adipisicing elit. Sequi
                recusandae tenetur quas ea corrupti earum! Dolor dolore ad culpa
                perspiciatis.
              </p>
            </div>
          </div>
          <div className="right w-full md:w-1/2">
            <form className="flex rounded-2xl bg-white p-5 max-w-[550px] mx-auto flex-col gap-4">
              <div className="title py-2 flex justify-start items-center">
                <Image
                  src="/images/sim-card.png"
                  className="w-[40px]"
                  width={300}
                  height={300}
                  placeholder="empty"
                  loading="lazy"
                ></Image>
                <p className="ml-2">汪喵通SIM</p>
              </div>
              <input
                type="text"
                name="username"
                className="mt-1 block rounded-[13px] w-full border border-gray-300 p-2 bg-gray-200 focus:ring-2 focus:ring-gray-600 focus:outline-none"
                required
                placeholder="名字"
              />
              <input
                type="password"
                name="password"
                placeholder="Email"
                className="mt-1 block w-full border border-gray-300 rounded-[13px] p-2 bg-gray-200 focus:ring-2 focus:ring-gray-600 focus:outline-none"
                required
              />
              <textarea
                name="message"
                placeholder="留言內容"
                rows={5}
                className="mt-1 block w-full border border-gray-300 rounded-[13px] p-2 bg-[#f7f7f7] focus:ring-2 focus:ring-gray-600 focus:outline-none"
                required
              />

              <button
                type="submit"
                className="bg-[#1757FF] text-white py-2 w-[220px] mx-auto rounded-[10px] hover:bg-[#2a3ebb] transition"
              >
                登入
              </button>
            </form>
          </div>
        </section>
        <section className="section_qa w-full flex flex-col justify-center items-center py-20">
          <span className="bg-white rounded-full mt-[200px] py-2 px-4 text-[#2a4ff4] text-[16px] w-[90px] text-center">
            Q&A
          </span>

          <h2 className="mt-5 text-center px-4">
            你可能想知道的問題，{" "}
            <span className="text-[34px] text-[#2c56ff] font-bold">
              汪喵通SIM{" "}
            </span>{" "}
            告知你
          </h2>

          <div className=" max-w-[800px] w-full px-4 mx-auto space-y-4">
            <AccordionItem
              items={[
                {
                  question: "什麼是 eSIM？它和傳統實體 SIM 卡有什麼差別？",
                  answer: (
                    <>
                      <p>
                        eSIM（Embedded SIM）是一種內建於手機或裝置中的數位 SIM
                        卡，取代傳統插卡的方式。它不需要實體卡片、不用開卡槽、不怕遺失或損壞。
                      </p>
                      <p className="mt-2">
                        和傳統 SIM 卡不同，eSIM 透過掃描 QR Code
                        或輸入設定碼的方式來啟用，設定簡單快速。對於經常出國旅遊或出差的人來說，eSIM
                        能讓你免去換卡麻煩，只要下載對應的 eSIM
                        方案就能立即連上網路。
                      </p>
                      <p className="mt-2">
                        因為是數位化的，所以 eSIM
                        也有助於環保，減少實體卡片製造與運輸所產生的浪費。
                      </p>
                    </>
                  ),
                },
                {
                  question: "如何知道我的手機是否支援 eSIM？哪些機型可以用？",
                  answer: (
                    <>
                      <p>
                        大多數 2018 年以後推出的中高階手機都支援 eSIM
                        功能，像是：
                      </p>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>
                          iPhone XS、XR、11、12、13、14、15 系列（含 Pro/Max）
                        </li>
                        <li>Google Pixel 3 以上系列（部分地區除外）</li>
                        <li>
                          Samsung Galaxy S20、S21、S22、S23 系列以上部分機型
                        </li>
                      </ul>
                      <p className="mt-2">
                        要確認自己的手機是否支援，可以到「設定 &gt;
                        行動服務」中查看是否有「加入行動方案」或「新增
                        eSIM」的選項。
                      </p>
                      <p className="mt-2">
                        若是雙卡手機，eSIM
                        通常可以和實體卡同時使用，非常適合出國上網。
                      </p>
                    </>
                  ),
                },
                {
                  question: "eSIM 怎麼使用？購買後要怎麼安裝和啟用？",
                  answer: (
                    <>
                      <p>
                        購買 eSIM 後，我們會提供一組專屬的 QR
                        Code，您只需開啟手機相機或前往手機設定中的 eSIM
                        加入介面掃描 QR Code，即可快速安裝。
                      </p>
                      <p className="mt-2">
                        安裝過程大約 1～3 分鐘，完成後即可在設定中切換為使用該
                        eSIM 上網。大多數裝置不需要下載額外
                        App，也不需要重新開機。
                      </p>
                      <p className="mt-2">
                        請注意：部分方案會在掃碼後立即啟用（天數開始計算），建議在抵達當地或準備使用時再掃描。
                      </p>
                    </>
                  ),
                },
                {
                  question: "出國可以同時保留台灣門號並使用 eSIM 上網嗎？",
                  answer: (
                    <>
                      <p>
                        可以。這是 eSIM
                        的最大優勢之一。您可以保留台灣原本的門號（實體 SIM
                        卡），並在 eSIM 裝入我們提供的國外上網方案。
                      </p>
                      <p className="mt-2">
                        開啟雙卡模式後，可設定 eSIM
                        為上網用途，保留原本門號收簡訊、接聽來電（若漫遊開啟），兩者互不影響。
                      </p>
                      <p className="mt-2">
                        這讓你在國外也能同時上網、接收銀行驗證碼、與家人保持聯繫，非常方便。
                      </p>
                    </>
                  ),
                },
                {
                  question: "eSIM 的網速快嗎？可以用來看影片或導航嗎？",
                  answer: (
                    <>
                      <p>
                        我們提供的 eSIM 是與當地大型電信商合作，支援高速 4G 或
                        5G 網路，網速表現穩定可靠。
                      </p>
                      <p className="mt-2">
                        無論你在城市、機場、高鐵或熱門景點，都能順利使用 Google
                        地圖導航、觀看 YouTube 或進行視訊通話。
                      </p>
                      <p className="mt-2">
                        我們也會根據你選擇的國家自動安排最佳網路方案，確保訊號穩定不卡頓。
                      </p>
                    </>
                  ),
                },
                {
                  question: "eSIM 什麼時候開通最好？可以提前掃描嗎？",
                  answer: (
                    <>
                      <p>
                        建議在「抵達當地」或「出發前 1 小時內」再掃描 QR Code
                        開通 eSIM。
                      </p>
                      <p className="mt-2">
                        大部分的 eSIM
                        方案一經掃描就會開始計算使用天數，若提前掃描容易導致使用效期提前結束。
                      </p>
                      <p className="mt-2">
                        若你購買的是「有效期限內啟用」類型的方案，也請務必在方案期限內完成安裝並啟用。
                      </p>
                    </>
                  ),
                },
              ]}
            />
          </div>
        </section>
      </div>
    </Layout>
  );
}
