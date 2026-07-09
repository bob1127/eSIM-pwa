"use client";

/**
 * Google Maps 嵌入地圖（不需 API Key）— 精簡版
 */
export default function KlookLocationMap({ location, className = "" }) {
  if (!location?.lat || !location?.lng) return null;

  const { name, address, lat, lng } = location;
  const query = encodeURIComponent(`${name}, ${address}`);
  const embedSrc = `https://maps.google.com/maps?q=${lat},${lng}&hl=zh-TW&z=15&output=embed`;
  const openUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <div className={["rounded-lg overflow-hidden border border-gray-100", className].join(" ")}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50">
        <p className="text-xs text-gray-600 truncate flex-1">{address}</p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-bold text-[#00B259] hover:underline"
        >
          開啟地圖
        </a>
      </div>
      <div className="relative w-full h-24 bg-slate-100">
        <iframe
          title={`${name} 地圖`}
          src={embedSrc}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </div>
  );
}
