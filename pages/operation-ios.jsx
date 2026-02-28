"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SwiperEsim from "../components/EmblaCarousel01/index";
// import Liquid from "../components/LiquidGlassHome.jsx";
import Country from "../components/Country/ImageTextSlider.jsx";
import Image from "next/image";
import IntroIos from "../components/IntroHeroIos.tsx";
import IntroHero from "../components/IntroHero";
import Link from "next/link";
import PageTransition from "../components/PageTransition.tsx";
import Layout from "./Layout";
import Marquee from "react-marquee-slider";
import ProductSlider from "../components/SwiperCarousel/SwiperCardTravel.jsx";
import { useRouter } from "next/router"; // ✅ 新增

export default function Home() {
  const [showIos, setShowIos] = useState(false);
  const router = useRouter(); // ✅ 新增
  const countries = [
    { name: "Japan", src: "/flags/japan.png" },
    { name: "Korea", src: "/flags/korea.png" },
    { name: "USA", src: "/flags/usa.png" },
    // 你可以繼續加更多...
  ];

  return (
    <Layout>
      <PageTransition>
        {/* <Liquid /> */}

        <div className="pt-[280px] px-5 relative">
          <div className="flex w-screen justify-center fixed z-50 bottom-3 gap-4">
            <div className="w-full flex justify-center">
              <button
                onClick={() => setShowIos(false)}
                className={`px-4 py-2 rounded-[10px] mx-2 border ${
                  !showIos ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                Android
              </button>
              <button
                onClick={() => setShowIos(true)}
                className={`px-4 py-2 rounded-[10px] mx-2 border ${
                  showIos ? "bg-black text-white" : "bg-white text-black"
                }`}
              >
                IOS
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {showIos ? (
              <motion.div
                key="ios"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
              >
                <IntroIos />
              </motion.div>
            ) : (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.4 }}
              >
                <IntroHero />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <section className="relative overflow-hidden h-screen">
          <div className="txt w-full md:w-1/2 absolute z-50 left-[5%] top-1/2 -translate-y-1/2 p-4">
            <h2 className="text-white text-[32px] md:text-[45px] font-normal text-left">
              彈性資費
            </h2>
            <p className="text-white text-[18px] md:text-[24px] font-normal">
              按天 / 按流量彈性選擇，沒有合約束縛
            </p>
          </div>

          <div className="mask w-full h-full bg-black opacity-15 absolute z-10 left-0 top-0 pointer-events-none" />

          <div className="sim-card w-[120px] md:w-[140px] h-[170px] md:h-[200px] absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-white/20 backdrop-blur-md bg-white/10 shadow-xl overflow-hidden">
            <div className="sim-card-wrap border relative w-full h-full">
              <Image
                src="/images/sim-card.png"
                alt="sim-card"
                placeholder="empty"
                loading="lazy"
                fill
                className="object-contain p-4"
              />
            </div>
            <div
              className="absolute top-0 right-0 w-[60px] h-[60px] md:w-[80px] md:h-[80px] bg-white/20 backdrop-blur-md"
              style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }}
            ></div>
          </div>

          <Image
            src="/images/banner04.png"
            alt="banner-img"
            placeholder="empty"
            loading="lazy"
            width={2000}
            height={1000}
            className="object-cover w-full h-full"
          />
        </section>

        <Country />
        <section className="section-product my-[100px]">
          <title className="flex flex-col px-4 justify-center items-center">
            <h1 className="text-black leading-[50px] text-center text-[2.4rem]">
              您的跨國上網專家，輕鬆暢遊全球
            </h1>
            <h2 className="text-gray-900 mt-4 text-[18px]">
              出國上網最聰明的選擇<br></br>eSIM 一掃即用
            </h2>
          </title>
          <div className="mt-5">
            <Marquee velocity={30} scatterRandomly={false}>
              {countries.map((country, index) => (
                <Image
                  key={index}
                  src={country.src}
                  alt={country.name}
                  width={80}
                  height={50}
                  className="mx-4"
                />
              ))}
            </Marquee>
          </div>
          <ProductSlider />
        </section>

        <section className="section-product-intro bg-[#1757ff] px-4 sm:px-[60px] xl:px-[200px] py-[100px] mx-auto">
          <div className="title flex flex-col lg:flex-row justify-between gap-10 px-4">
            <div className="flex flex-col items-center md:items-start text-center lg:text-left">
              <h2 className="text-white text-[2rem] md:text-[3.4rem] font-bold">
                一鍵啟用全球上網
              </h2>
              <h3 className="text-white leading-snug text-[1rem] md:text-[1.25rem]">
                即買即用．免拆SIM卡．支援全球上網服務
                <br />
                跨國旅遊、出差、短租專用的 eSIM 解決方案
              </h3>
            </div>
            <div className="flex flex-col items-center lg:items-end">
              <p className="text-white text-[22px] md:text-[24px] lg:text-[50px] font-normal">
                Hot Sale eSIM
              </p>
              <div className="relative inline-block text-left mt-6">
                <select
                  className="appearance-none w-[200px] h-12 px-4 pr-10 rounded-full border border-neutral-200 bg-white text-neutral-950 font-medium focus:outline-none transition-all duration-300 shadow-sm hover:border-[#1757ff] focus:border-[#1757ff]"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      router.push(value);
                    }
                  }}
                >
                  <option disabled selected value="">
                    請選擇旅遊國家
                  </option>
                  <option value="/product/japan/">日本 Japan</option>
                  <option value="/category/korea/">韓國 Korea</option>
                  <option value="/category/malaysia/">馬來西亞 Malaysia</option>
                  <option value="/category/thailand/">泰國 Thailand</option>
                  <option value="/category/american/">美國 USA</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-500">
                  ▼
                </div>
              </div>
            </div>
          </div>
          <SwiperEsim />
        </section>

        {/* 其餘原始區塊保持不變 */}
        <section className="section-blog"></section>
        {/* ...更多區塊 */}
      </PageTransition>
    </Layout>
  );
}
