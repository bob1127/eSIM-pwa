/**
 * 各國 eSIM 產品頁：電信商涵蓋／熱點圖參考
 */
import MaterialIcon from "../MaterialIcon";
import {
  NETWORK_COVERAGE_ACCENT as ACCENT,
} from "@/lib/networkCoverageCountries";

export {
  isJapanEsimProduct,
  resolveCoverageCountry,
} from "@/lib/networkCoverageCountries";

function HeatmapPreview({ config }) {
  const nperfUrl = config.nperfUrl;
  const imgSrc = config.heatmapImage
    ? encodeURI(config.heatmapImage)
    : null;

  if (imgSrc) {
    return (
      <figure className="m-0">
        <p className="text-xs font-bold tracking-wider text-gray-500 mb-3 uppercase">
          收訊熱點範例
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-slate-50">
          <a
            href={nperfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A6CD0]"
            aria-label={`開啟 nPerf ${config.nameZh}收訊熱點圖（新分頁）`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={`${config.nameZh}收訊熱點範例圖：都會區覆蓋較密，偏遠與山區較稀疏`}
              className="w-full h-auto block transition group-hover:opacity-95"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#0A6CD0] px-3 py-1.5 text-[11px] font-bold text-white shadow-md opacity-95 group-hover:opacity-100">
              開啟互動熱點圖
              <MaterialIcon name="open_in_new" size={14} />
            </span>
          </a>
        </div>
        <figcaption className="mt-2.5 text-[12px] text-gray-500 leading-relaxed">
          點擊上方範例圖可開啟{" "}
          <a
            href={nperfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline"
            style={{ color: ACCENT }}
          >
            nPerf {config.nameZh}收訊熱點圖
          </a>
          。色塊愈密代表該區實測／涵蓋愈完整；空白或稀疏處多為偏遠、山區等收訊較弱地帶。下方電信商卡片會直接開啟對應業者熱點圖，請以本商品標示的電信商為準。
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="m-0">
      <p className="text-xs font-bold tracking-wider text-gray-500 mb-3 uppercase">
        收訊熱點圖
      </p>
      <a
        href={nperfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex min-h-[160px] flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-gray-200 px-6 py-10 text-center transition hover:border-[#0A6CD0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A6CD0]"
        style={{
          background:
            "linear-gradient(145deg, #eef5fc 0%, #ffffff 55%, #f8fafc 100%)",
        }}
        aria-label={`開啟 nPerf ${config.nameZh}收訊熱點圖（新分頁）`}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "rgba(10, 108, 208, 0.12)", color: ACCENT }}
        >
          <MaterialIcon name="signal_cellular_alt" size={28} />
        </span>
        <p className="text-[15px] font-bold text-slate-900 group-hover:text-[#0A6CD0]">
          開啟 {config.nameZh} nPerf 互動熱點圖
        </p>
        <p className="max-w-md text-[12px] text-gray-500 leading-relaxed">
          群眾實測覆蓋密度：都會通常較密，偏遠／山區較稀疏。點此於新分頁查看並可切換電信商。
        </p>
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-white"
          style={{ background: ACCENT }}
        >
          開啟地圖
          <MaterialIcon name="open_in_new" size={14} />
        </span>
      </a>
    </figure>
  );
}

/**
 * @param {{ country: import("@/lib/networkCoverageCountries").CoverageCountryConfig, continuePurchase?: object|null }} props
 */
export default function NetworkCoverageSection({
  country,
  continuePurchase = null,
}) {
  if (!country) return null;

  const carriersTitle =
    country.carriers.length >= 3
      ? "三大電信商速覽"
      : "主要電信商速覽";

  return (
    <section
      id="network-coverage"
      className="mt-10 mb-4 scroll-mt-28 border border-gray-200 rounded-2xl bg-white overflow-hidden"
      aria-labelledby="network-coverage-heading"
    >
      <div className="px-5 py-4 md:px-6 md:py-5" style={{ background: ACCENT }}>
        <h2
          id="network-coverage-heading"
          className="text-lg md:text-xl font-bold text-white tracking-wide"
        >
          {country.nameZh}網路涵蓋參考
        </h2>
        <p className="mt-1.5 text-[13px] md:text-sm text-white/80 leading-relaxed max-w-3xl">
          {country.intro}
        </p>
      </div>

      {continuePurchase ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 md:px-6 border-b border-[#0A6CD0]/20 bg-[#eef5fc]">
          <p className="flex-1 text-[13px] text-slate-700 font-medium leading-snug">
            看完涵蓋後可繼續完成購買
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={continuePurchase.onDismiss}
              className="h-10 px-3 rounded-lg text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition"
            >
              稍後再說
            </button>
            <button
              type="button"
              onClick={continuePurchase.onContinue}
              className="h-10 px-4 rounded-lg text-[13px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: ACCENT }}
            >
              {continuePurchase.action === "buy"
                ? "繼續立即購買"
                : "繼續加入購物車"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="px-5 py-5 md:px-6 md:py-6 space-y-6">
        <HeatmapPreview config={country} />

        <div>
          <p className="text-xs font-bold tracking-wider text-gray-500 mb-3 uppercase">
            {carriersTitle}
          </p>
          <p className="text-[12px] text-gray-500 mb-3 -mt-1">
            點擊卡片會直接開啟該電信商的 nPerf 熱點圖（無需再手動選電信）
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {country.carriers.map((c) => (
              <li key={c.id}>
                <a
                  href={c.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group h-full rounded-xl border border-gray-200 bg-white p-4 flex flex-col shadow-sm transition-all hover:border-[#0A6CD0] hover:shadow-md hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A6CD0]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-slate-900 text-[15px] group-hover:text-[#0A6CD0] transition-colors">
                      {c.name}
                    </p>
                    <MaterialIcon
                      name="open_in_new"
                      size={16}
                      className="text-gray-300 group-hover:text-[#0A6CD0] shrink-0 mt-0.5 transition-colors"
                    />
                  </div>
                  <p
                    className="mt-1 text-[13px] font-semibold"
                    style={{ color: ACCENT }}
                  >
                    {c.strength}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed flex-1">
                    {c.note}
                  </p>
                  <span
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold text-white transition-opacity group-hover:opacity-90"
                    style={{ background: ACCENT }}
                  >
                    {c.mapLabel || "查看涵蓋圖"}
                    <MaterialIcon name="arrow_forward" size={16} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {country.compareLinks?.length ? (
          <div>
            <p className="text-xs font-bold tracking-wider text-gray-500 mb-3 uppercase">
              比較與熱點圖
            </p>
            <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
              {country.compareLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#eef5fc]/80 transition-colors group"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{
                        background: "rgba(10, 108, 208, 0.12)",
                        color: ACCENT,
                      }}
                    >
                      <MaterialIcon
                        name={
                          link.id === "nperf"
                            ? "signal_cellular_alt"
                            : "analytics"
                        }
                        size={18}
                      />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 group-hover:text-[#0A6CD0]">
                        {link.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {link.desc}
                      </p>
                    </div>
                    <MaterialIcon
                      name="chevron_right"
                      size={18}
                      className="text-gray-300 shrink-0"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-[11px] text-gray-400 leading-relaxed">
          地圖由各電信商／第三方提供，內容與更新時點以其官網為準；本頁僅供旅遊選購參考，不保證特定地點速度或滿格訊號。eSIM
          實際連線的電信商以商品規格標示為準。
        </p>
      </div>
    </section>
  );
}
