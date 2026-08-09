import { useCallback, useState } from "react";
import Image from "next/image";
import cfImageLoader from "../lib/cfImageLoader";

function isCfImagesEnabled() {
  const flag = process.env.NEXT_PUBLIC_CF_IMAGES;
  return flag === "1" || flag === "true";
}

function isAppLocalSrc(src) {
  return (
    typeof src === "string" &&
    src.startsWith("/") &&
    !src.startsWith("//") &&
    !src.startsWith("/_next/")
  );
}

function pickWidth(props) {
  const w = Number(props.width);
  if (Number.isFinite(w) && w > 0) return w;
  // fill / 未指定寬度：用最大 deviceSize bucket
  return 1280;
}

/**
 * 與 next/image 相同介面。
 *
 * - 正式站／Vercel：絕不走 /_next/image（會吃 Vercel Image Optimization 額度 → 402）
 * - 正式站 + CF：src 改寫成 /cdn-cgi/image/...（format=auto → WebP/AVIF）
 * - 僅本機 next dev：/public 圖可用 Next Image Optimization
 * - 失敗 onError 回退原圖（寧可原圖，也不要空白）
 */
function isOnVercelRuntime() {
  // NEXT_PUBLIC_ 才能進瀏覽器 bundle；建置時 VERCEL=1 也會進 server
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.VERCEL_ENV) ||
    Boolean(process.env.NEXT_PUBLIC_VERCEL_ENV)
  );
}

export default function SafeImage({
  src,
  onError,
  unoptimized: unoptimizedProp,
  alt = "",
  width,
  sizes,
  fill,
  ...props
}) {
  const [useOriginal, setUseOriginal] = useState(false);
  const cfOn = isCfImagesEnabled();
  const localSrc = isAppLocalSrc(src);
  const onVercel = isOnVercelRuntime();

  const handleError = useCallback(
    (event) => {
      setUseOriginal(true);
      onError?.(event);
    },
    [onError],
  );

  if (!src) return null;

  // 僅本機 next dev + /public：可用 Next optimizer。Vercel／正式站一律禁用。
  const useNextOptimizer =
    !useOriginal &&
    localSrc &&
    !onVercel &&
    process.env.NODE_ENV === "development" &&
    unoptimizedProp !== true;

  // 正式站／遠端：CF format=auto；本機 local 已走 Next 時不再繞 CF
  const useCf = !useOriginal && cfOn && !useNextOptimizer;

  let resolvedSrc = src;
  let unoptimized = true;

  if (useNextOptimizer) {
    resolvedSrc = src;
    unoptimized = false;
  } else if (useCf) {
    resolvedSrc = cfImageLoader({
      src,
      width: pickWidth({ width, fill }),
    });
    unoptimized = true;
  } else {
    resolvedSrc = src;
    unoptimized = true;
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={resolvedSrc}
      width={width}
      sizes={sizes}
      fill={fill}
      unoptimized={unoptimized}
      onError={handleError}
    />
  );
}
