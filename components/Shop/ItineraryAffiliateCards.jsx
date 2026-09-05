"use client";

import { useState } from "react";
import { matchItineraryAffiliates } from "@/lib/itineraryAffiliate";
import MobileCardCarousel from "@/components/MobileCardCarousel";

function brandMark(partner) {
  if (partner === "kkday") {
    return (
      <span className="inline-flex h-5 items-center rounded bg-[#FFD43A] px-1.5 text-[9px] font-bold text-slate-800">
        KKday
      </span>
    );
  }
  return (
    <span className="inline-flex h-5 items-center rounded bg-[#ff5722] px-1.5 text-[9px] font-bold text-white">
      Klook
    </span>
  );
}

function AffiliateCardImage({ item }) {
  const initial = item.images?.[0] || "";
  const [src, setSrc] = useState(initial);
  const [failed, setFailed] = useState(!initial);

  if (failed) {
    return <div className="absolute inset-0 bg-slate-100" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="absolute inset-0 w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function AffiliateCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group flex flex-col w-full h-full bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-md hover:border-slate-200 transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        <AffiliateCardImage item={item} />
        <span className="absolute top-1.5 left-1.5">
          {brandMark(item.partner)}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-[12px] font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.4em]">
          {item.title}
        </p>
        {item.priceLabel ? (
          <p className="mt-1 text-[12px] font-bold text-slate-800">
            {item.priceLabel}
          </p>
        ) : null}
      </div>
    </a>
  );
}

export default function ItineraryAffiliateCards({
  destinations,
  dayDestinations,
  category,
  title,
  tags,
  stopName,
  stopMap,
  stopBody,
  dayTitle,
}) {
  const items = matchItineraryAffiliates({
    destinations,
    dayDestinations,
    category,
    title,
    tags,
    stopName,
    stopMap,
    stopBody,
    dayTitle,
    limit: 8,
  });
  if (!items.length) return null;

  return (
    <div className="mt-8">
      <p className="text-[13px] font-bold text-slate-900 mb-3">推薦體驗</p>
      <div className="sm:hidden">
        <MobileCardCarousel
          slideClassName="min-w-0 flex-[0_0_92%]"
          gap={8}
          autoplay={items.length > 1}
          autoplayDelay={4200}
          loop={items.length > 1}
          showArrows={false}
        >
          {items.map((item) => (
            <AffiliateCard key={item.id || item.url} item={item} />
          ))}
        </MobileCardCarousel>
      </div>
      <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {items.map((item) => (
          <AffiliateCard key={item.id || item.url} item={item} />
        ))}
      </div>
    </div>
  );
}
