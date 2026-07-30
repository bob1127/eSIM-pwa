import { useCallback, useState } from "react";
import Image from "next/image";
import cfImageLoader from "../lib/cfImageLoader";

function isCfImagesEnabled() {
  if (process.env.NODE_ENV === "development") return false;
  const flag = process.env.NEXT_PUBLIC_CF_IMAGES;
  return flag === "1" || flag === "true";
}

function pickWidth(props) {
  const w = Number(props.width);
  if (Number.isFinite(w) && w > 0) return w;
  // fill / 未指定寬度：用最大 deviceSize bucket
  return 1280;
}

/**
 * 與 next/image 相同介面。
 * 全域 images.unoptimized=true（避開 Vercel Image Optimization）。
 * CF 開啟時把 src 改寫成 /cdn-cgi/image/...；失敗則回退原圖。
 */
export default function SafeImage({
  src,
  onError,
  unoptimized,
  alt = "",
  width,
  sizes,
  fill,
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

  const forceOriginal = Boolean(unoptimized || useOriginal || !cfOn);
  const resolvedSrc = forceOriginal
    ? src
    : cfImageLoader({ src, width: pickWidth({ width, fill }) });

  return (
    <Image
      {...props}
      alt={alt}
      src={resolvedSrc}
      width={width}
      sizes={sizes}
      fill={fill}
      unoptimized
      onError={handleError}
    />
  );
}
