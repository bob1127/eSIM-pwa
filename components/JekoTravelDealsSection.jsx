"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import HomeSectionHeader from "./HomeSectionHeader";
import TransportTicketSection from "./TransportTicketSection";
import KKdayTicketSection from "./KKdayTicketSection";
import AccommodationRecommendSection from "./AccommodationRecommendSection";
import { kkdayAff } from "@/data/kkday/tickets";
import { klookHotelAff } from "@/data/klook/hotels";

const CATEGORIES = [
  {
    id: "transport",
    label: "交通票券",
    hint: "包車／船票／接駁",
    accent: "#0A6CD0",
    moreLabel: "查看更多交通票券",
  },
  {
    id: "tickets",
    label: "門票體驗",
    hint: "景點／體驗",
    accent: "#0A6CD0",
    moreLabel: "查看更多門票",
  },
  {
    id: "stay",
    label: "住宿推薦",
    hint: "Jeko × Klook",
    accent: "#00B259",
    moreLabel: "查看更多住宿",
  },
];

const COUNTRY_TABS = [
  { id: "japan", label: "日本 🇯🇵" },
  { id: "korea", label: "韓國 🇰🇷" },
  { id: "thailand", label: "泰國 🇹🇭" },
  { id: "china", label: "中國 🇨🇳" },
  { id: "hongkong", label: "港澳 🇭🇰" },
  { id: "vietnam", label: "越南 🇻🇳" },
];

function listingUrlFor(categoryId, countryId) {
  if (categoryId === "stay") {
    if (countryId === "thailand") {
      return klookHotelAff(
        "https://www.klook.com/zh-TW/hotels/city/4-bangkok-hotels/",
      );
    }
    if (countryId === "korea") {
      return klookHotelAff(
        "https://www.klook.com/zh-TW/hotels/city/2-seoul-hotels/",
      );
    }
    if (countryId === "china") {
      return klookHotelAff(
        "https://www.klook.com/zh-TW/hotels/city/23301-shenzhen-city-hotels/",
      );
    }
    if (countryId === "hongkong") {
      return klookHotelAff(
        "https://www.klook.com/zh-TW/hotels/city/2-hong-kong-hotels/",
      );
    }
    if (countryId === "vietnam") {
      return klookHotelAff(
        "https://www.klook.com/zh-TW/hotels/city/33-ho-chi-minh-city-hotels/",
      );
    }
    return klookHotelAff(
      "https://www.klook.com/zh-TW/hotels/city/29-tokyo-hotels/",
    );
  }

  const dest =
    countryId === "thailand"
      ? "th-thailand"
      : countryId === "korea"
        ? "kr-korea"
        : countryId === "china"
          ? "cn-china"
          : countryId === "hongkong"
            ? "hk-hong-kong"
            : countryId === "vietnam"
              ? "vn-vietnam"
              : "jp-japan";
  return kkdayAff(`https://www.kkday.com/zh-tw/destination/${dest}`);
}

/**
 * 首頁：交通／門票／住宿整合為單一區塊
 * — 上方類別 Tab、下方國家 Tab、內容共用一組輪播／網格
 */
export default function JekoTravelDealsSection() {
  const [categoryId, setCategoryId] = useState("tickets");
  const [countryId, setCountryId] = useState("japan");

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) || CATEGORIES[1],
    [categoryId],
  );

  const listingUrl = listingUrlFor(categoryId, countryId);

  const title =
    categoryId === "stay" ? (
      <>
        Jeko <span className="text-[#00B259]">×</span> Klook
      </>
    ) : categoryId === "transport" ? (
      "Jeko 交通票券"
    ) : (
      "Jeko 門票推薦"
    );

  return (
    <section
      id="jeko-travel-deals"
      className="w-full bg-white pb-12 lg:pb-16 pt-4 scroll-mt-28"
    >
      {/* 舊錨點相容（Slider / 手機捷徑） */}
      <span id="accommodation-recommend" className="block scroll-mt-28" />
      <span id="accommodation-section" className="block scroll-mt-28" />
      <span id="kkday-ticket-recommend" className="block scroll-mt-28" />
      <span id="kkday-section" className="block scroll-mt-28" />
      <span id="transport-ticket-recommend" className="block scroll-mt-28" />
      <span id="transport-section" className="block scroll-mt-28" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <HomeSectionHeader
          eyebrow="交通 · 門票 · 住宿"
          title={title}
          href={listingUrl}
          moreLabel={category.moreLabel}
          external
        />

        {/* 類別 Tab：白底區塊上用淺灰軌道區隔 */}
        <div
          className="mb-5 flex gap-1.5 rounded-2xl bg-[#f0f1f3] p-1.5 ring-1 ring-slate-200/70"
          role="tablist"
          aria-label="旅遊推薦類別"
        >
          {CATEGORIES.map((tab) => {
            const active = categoryId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryId(tab.id)}
                className={[
                  "relative min-w-0 flex-1 rounded-xl px-2 py-2.5 sm:px-3 sm:py-3 text-center transition-all",
                  active
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800",
                ].join(" ")}
              >
                <span
                  className="block text-[13px] sm:text-[15px] font-black tracking-tight"
                  style={active ? { color: tab.accent } : undefined}
                >
                  {tab.label}
                </span>
                <span
                  className={[
                    "mt-0.5 block text-[10px] sm:text-[11px] font-medium leading-tight",
                    active ? "text-slate-500" : "text-slate-400",
                  ].join(" ")}
                >
                  {tab.hint}
                </span>
              </button>
            );
          })}
        </div>

        {/* 國家 Tab：底線風格 */}
        <div
          className="flex gap-6 sm:gap-8 mb-8 border-b border-gray-200/80 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="目的地國家"
        >
          {COUNTRY_TABS.map((tab) => {
            const active = countryId === tab.id;
            const accent = category.accent;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCountryId(tab.id)}
                className={[
                  "relative shrink-0 pb-3 text-[15px] sm:text-base font-medium tracking-tight transition-colors",
                  active ? "" : "text-gray-500 hover:text-gray-800",
                ].join(" ")}
                style={active ? { color: accent } : undefined}
              >
                {tab.label}
                {active ? (
                  <span
                    className="absolute left-0 right-0 bottom-0 h-[3px] rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${categoryId}-${countryId}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {categoryId === "transport" ? (
              <TransportTicketSection
                embedded
                hideHeader
                hideCountryTabs
                countryId={countryId}
                onCountryChange={setCountryId}
              />
            ) : null}
            {categoryId === "tickets" ? (
              <KKdayTicketSection
                embedded
                hideHeader
                hideCountryTabs
                countryId={countryId}
                onCountryChange={setCountryId}
              />
            ) : null}
            {categoryId === "stay" ? (
              <AccommodationRecommendSection
                embedded
                hideHeader
                hideCountryTabs
                countryId={countryId}
                onCountryChange={setCountryId}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
