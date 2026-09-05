"use client";

import { useEffect, useMemo, useState } from "react";
import { getItineraryProps, flattenStops } from "@/lib/partnerBlogItinerary";
import WpPhotoWall from "@/components/Blog/WpPhotoWall";
import ItineraryAffiliateCards from "@/components/Shop/ItineraryAffiliateCards";

function stopAnchor(id) {
  return `stop-${id}`;
}

function DaysAccordion({ days, activeId, onJump }) {
  const activeDayId = days.find((d) =>
    (d.stops || []).some((s) => s.id === activeId),
  )?.id;
  const [openId, setOpenId] = useState(activeDayId || days[0]?.id);

  useEffect(() => {
    if (activeDayId) setOpenId(activeDayId);
  }, [activeDayId]);

  if (!days?.length) return null;

  return (
    <div className="border border-slate-200 bg-white">
      <p className="px-3 pt-3 pb-2 text-[12px] font-bold text-slate-500">
        行程天數
      </p>
      {days.map((day) => {
        const open = day.id === openId;
        return (
          <div key={day.id} className="border-t border-slate-200">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : day.id)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="text-[13px] font-bold text-slate-800">
                {day.title}
              </span>
              <span
                className={`text-[11px] text-slate-400 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {open ? (
              <ul className="pb-2 px-1">
                {(day.stops || []).map((stop) => {
                  const on = stop.id === activeId;
                  return (
                    <li key={stop.id}>
                      <button
                        type="button"
                        onClick={() => onJump(stop.id)}
                        className={`w-full text-left px-3 py-1.5 text-[12px] leading-snug ${
                          on
                            ? "font-bold text-[#e2498e] bg-[#F0F1F3]"
                            : "text-slate-600 hover:bg-[#F0F1F3]"
                        }`}
                      >
                        {stop.name}
                        {stop.duration ? (
                          <span className="block text-[10px] font-medium text-slate-400">
                            {stop.duration}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function useItineraryDayNav(days) {
  const flat = useMemo(() => flattenStops(days), [days]);
  const [activeId, setActiveId] = useState(flat[0]?.stop?.id || null);

  useEffect(() => {
    if (!flat.length) return undefined;
    const els = flat
      .map((row) => document.getElementById(stopAnchor(row.stop.id)))
      .filter(Boolean);
    if (!els.length) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis?.target?.id) {
          setActiveId(vis.target.id.replace(/^stop-/, ""));
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [flat]);

  const jump = (stopId) => {
    const el = document.getElementById(stopAnchor(stopId));
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(stopId);
  };

  return { activeId, jump };
}

/** 右側欄行程天數（直接渲染，不依賴 portal） */
export function ItineraryDaysNav({ blocks }) {
  const { days } = getItineraryProps(blocks);
  const { activeId, jump } = useItineraryDayNav(days);
  return <DaysAccordion days={days} activeId={activeId} onJump={jump} />;
}

export default function PartnerBlogItineraryView({
  blocks,
  category = "",
  title = "",
  tags = [],
}) {
  const { intro, days, destinations = [] } = getItineraryProps(blocks);
  const { activeId, jump } = useItineraryDayNav(days);

  if (!days.length) return null;

  return (
    <div>
      <div className="lg:hidden mb-6">
        <DaysAccordion days={days} activeId={activeId} onJump={jump} />
      </div>

      {intro ? (
        <div
          className="mb-10 text-[15px] leading-[1.9] text-slate-700 [&_p]:mb-4"
          dangerouslySetInnerHTML={{ __html: intro }}
        />
      ) : null}

      {days.map((day) => (
        <section key={day.id} className="mb-12">
          <h2 className="text-[13px] font-bold tracking-[0.18em] uppercase text-slate-400 mb-6">
            {day.title}
          </h2>
          {(day.stops || []).map((stop) => (
            <article
              key={stop.id}
              id={stopAnchor(stop.id)}
              className="scroll-mt-24 mb-14 pb-10 border-b border-slate-100 last:border-0"
            >
              <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
                <h3 className="text-xl sm:text-[24px] font-bold text-slate-900">
                  {stop.name}
                </h3>
                {stop.duration ? (
                  <span className="text-[12px] font-bold text-slate-500">
                    {stop.duration}
                  </span>
                ) : null}
              </div>
              {stop.photos?.length ? (
                <div className="mb-5">
                  <WpPhotoWall
                    images={stop.photos.map((src) => ({
                      src,
                      href: src,
                      alt: stop.name,
                    }))}
                    size="md"
                    align="left"
                    layout="mosaic"
                  />
                </div>
              ) : null}
              {stop.body ? (
                <div
                  className="text-[15px] leading-[1.9] text-slate-700 [&_p]:mb-4 [&_a]:text-[#0A6CD0]"
                  dangerouslySetInnerHTML={{ __html: stop.body }}
                />
              ) : null}
              {stop.map ? (
                <iframe
                  title={stop.name}
                  className="mt-5 w-full h-56 rounded-lg border-0"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    stop.map,
                  )}&output=embed`}
                />
              ) : null}
              <ItineraryAffiliateCards
                destinations={destinations}
                dayDestinations={day.destinations}
                category={category}
                title={title}
                tags={tags}
                stopName={stop.name}
                stopMap={stop.map}
                stopBody={stop.body}
                dayTitle={day.title}
              />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
