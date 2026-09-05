"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import MaterialIcon from "@/components/MaterialIcon";
import PartnerButton from "@/components/partner/ui/PartnerButton";
import ButtonAnimatedGradient from "@/components/ui/button-animated-gradient";

const CONTAINER = "max-w-[1680px] mx-auto px-6 lg:px-10";

function CtaLink({ href, className, children }) {
  const h = href || "#plans";
  if (String(h).startsWith("#")) {
    return (
      <a href={h} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={h} className={className}>
      {children}
    </Link>
  );
}

function ClassicHero({ store, hero, domain }) {
  const heroBg = hero.background_image;
  return (
    <section
      className="relative w-full overflow-hidden"
      style={
        heroBg
          ? {
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      {!heroBg ? (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a3a7a] via-[#1a56db] to-[#3B9EFF]" />
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(255,212,58,.2), transparent 35%)",
            }}
          />
        </>
      ) : null}
      <div
        className={`${CONTAINER} relative py-16 sm:py-20 md:py-24 text-white`}
        style={
          heroBg
            ? {
                textShadow:
                  "0 1px 2px rgba(0,0,0,.55), 0 4px 18px rgba(0,0,0,.35)",
              }
            : undefined
        }
      >
        {store.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logo_url}
            alt={store.store_name}
            className="h-12 sm:h-14 w-auto object-contain mb-6 rounded-lg bg-black/25 p-1.5 backdrop-blur-[2px]"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <p
          className={`text-xs sm:text-sm font-bold tracking-[0.2em] uppercase mb-3 ${
            heroBg ? "text-white/90" : "text-white/70"
          }`}
        >
          {hero.eyebrow}
        </p>
        <h1 className="text-[28px] font-bold tracking-tight leading-[1.1] mb-4">
          {hero.displayTitle}
        </h1>
        <p
          className={`text-sm sm:text-base max-w-2xl leading-relaxed ${
            heroBg ? "text-white/95" : "text-white/85"
          }`}
        >
          {hero.displaySubtitle}
        </p>
        <div id="about" className="sr-only">
          {store.store_name} — {store.description || "官方授權專屬商城"}
        </div>
        <div className="mt-8 flex flex-wrap gap-3" style={{ textShadow: "none" }}>
          <CtaLink
            href={hero.cta1_href}
            className="inline-flex items-center bg-white text-[#0a3a7a] text-sm font-bold px-6 py-3 hover:bg-white/95 transition shadow-sm"
          >
            {hero.cta1_label}
          </CtaLink>
          <CtaLink
            href={hero.cta2_href || `/p/${domain}/blog/`}
            className={`inline-flex items-center border text-sm font-bold px-6 py-3 transition ${
              heroBg
                ? "border-white/80 bg-black/25 text-white hover:bg-black/40 backdrop-blur-[2px]"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            {hero.cta2_label}
          </CtaLink>
          <CtaLink
            href={hero.cta3_href || `/p/${domain}/tutorial/`}
            className={`inline-flex items-center border text-sm font-bold px-6 py-3 transition ${
              heroBg
                ? "border-white/80 bg-black/25 text-white hover:bg-black/40 backdrop-blur-[2px]"
                : "border-white/40 text-white hover:bg-white/10"
            }`}
          >
            {hero.cta3_label}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}

function SliderHero({ hero, editable, onEditCarousel }) {
  const slides = useMemo(
    () => (hero.slides || []).filter((s) => s?.image),
    [hero.slides],
  );
  const delay = hero.autoplay_ms || 5000;
  const autoplayOn = hero.autoplay !== false && slides.length > 1;

  const autoplayPlugin = useRef(
    Autoplay({
      delay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: slides.length > 1, align: "start", duration: 28 },
    autoplayOn ? [autoplayPlugin.current] : [],
  );
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect).on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!autoplayOn || !autoplayPlugin.current) return;
    autoplayPlugin.current.options = {
      ...autoplayPlugin.current.options,
      delay,
    };
    autoplayPlugin.current.reset?.();
  }, [delay, autoplayOn, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section className="relative w-full overflow-hidden bg-slate-200 group/hero">
      {editable ? (
        <PartnerButton
          type="button"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEditCarousel?.();
          }}
          className="absolute top-4 right-4 z-20 shadow-lg gap-1.5"
        >
          <MaterialIcon name="edit" size={16} />
          編輯輪播
        </PartnerButton>
      ) : null}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {slides.map((slide, i) => {
            const hasText = !!(slide.title || slide.subtitle || slide.cta_label);
            const body = (
              <>
                <Image
                  src={slide.image}
                  alt={slide.title || `Banner ${i + 1}`}
                  fill
                  priority={i === 0}
                  className="object-cover"
                  sizes="100vw"
                  unoptimized={String(slide.image).startsWith("http")}
                />
                {hasText ? (
                  <div className="absolute inset-0 flex flex-col justify-end sm:justify-center items-start px-6 sm:px-12 lg:px-16 pb-14 sm:pb-0">
                    <div
                      className="max-w-xl text-white"
                      style={{
                        textShadow:
                          "0 1px 2px rgba(0,0,0,.55), 0 6px 20px rgba(0,0,0,.35)",
                      }}
                    >
                      {slide.title ? (
                        <h2 className="text-[24px] md:text-[28px] font-bold tracking-tight leading-[1.1]">
                          {slide.title}
                        </h2>
                      ) : null}
                      {slide.subtitle ? (
                        <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/95 max-w-lg leading-relaxed">
                          {slide.subtitle}
                        </p>
                      ) : null}
                      {slide.cta_label ? (
                        <ButtonAnimatedGradient nested className="mt-5 shadow-sm">
                          {slide.cta_label}
                        </ButtonAnimatedGradient>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            );

            return (
              <div
                key={`${slide.image}-${i}`}
                className="relative min-w-0 flex-[0_0_100%] h-[clamp(220px,52vw,640px)]"
              >
                {slide.href && String(slide.href) !== "#" ? (
                  String(slide.href).startsWith("#") ? (
                    <a href={slide.href} className="absolute inset-0 block">
                      {body}
                    </a>
                  ) : (
                    <Link href={slide.href} className="absolute inset-0 block">
                      {body}
                    </Link>
                  )
                ) : (
                  <div className="absolute inset-0">{body}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="上一張"
            onClick={() => {
              autoplayPlugin.current?.reset?.();
              emblaApi?.scrollPrev();
            }}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm transition"
          >
            <MaterialIcon name="chevron_left" size={22} />
          </button>
          <button
            type="button"
            aria-label="下一張"
            onClick={() => {
              autoplayPlugin.current?.reset?.();
              emblaApi?.scrollNext();
            }}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/35 hover:bg-black/50 text-white backdrop-blur-sm transition"
          >
            <MaterialIcon name="chevron_right" size={22} />
          </button>
          <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`第 ${i + 1} 張`}
                onClick={() => {
                  autoplayPlugin.current?.reset?.();
                  emblaApi?.scrollTo(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

/**
 * 夥伴首頁 Hero：classic 文字主視覺 或 slider 全幅 Banner
 */
export default function PartnerHeroBanner({
  store,
  hero,
  domain,
  editable = false,
  onEditCarousel,
}) {
  if (hero?.layout === "slider") {
    return (
      <SliderHero
        hero={hero}
        editable={editable}
        onEditCarousel={onEditCarousel}
      />
    );
  }
  return <ClassicHero store={store} hero={hero} domain={domain} />;
}
