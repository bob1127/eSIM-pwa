import { useCallback, useState } from "react";
import Image from "next/image";
import cfImageLoader from "../lib/cfImageLoader";

function isCfImagesEnabled() {
  if (process.env.NODE_ENV === "development") return false;
  const flag = process.env.NEXT_PUBLIC_CF_IMAGES;
  return flag === "1" || flag === "true";
}

/**
 * 與 next/image 相同介面；優化失敗時回退原圖。
 * - NEXT_PUBLIC_CF_IMAGES=1：Cloudflare loader
 * - 未啟用 CF：unoptimized 直出（避開 Vercel /_next/image 402）
 */
export default function SafeImage({
  src,
  onError,
  unoptimized,
  alt = "",
  ...props
}) {
  const [useOriginal, setUseOriginal] = useState(false);
  const cfOn = isCfImagesEnabled();

  const handleError = useCallback(
    (event) => {
      setUseOriginal(true);
      onError?.(event);
    },
    [onError],
  );

  if (!src) return null;

  // CF 關閉或載入失敗 → 一律原圖，不走 Vercel Image Optimization
  const forceOriginal = Boolean(unoptimized || useOriginal || !cfOn);

  return (
    <Image
      {...props}
      alt={alt}
      src={src}
      loader={cfOn && !forceOriginal ? cfImageLoader : undefined}
      unoptimized={forceOriginal}
      onError={handleError}
    />
  );
}
