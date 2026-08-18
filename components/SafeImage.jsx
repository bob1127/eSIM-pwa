import { useCallback, useState } from "react";
// 不可 import 'next/image'：webpack 會 alias 回這個檔案，造成循環
import NextImage from "next/dist/shared/lib/image-external";
import cfImageLoader, {
  isCfImagesEnabled,
  shouldSkipCfImage,
} from "../lib/cfImageLoader";

const Image = NextImage.default || NextImage;

function pickWidth(props) {
  const w = Number(props.width);
  if (Number.isFinite(w) && w > 0) return w;
  return 1280;
}

/**
 * 與 next/image 相同介面；webpack 已把 next/image 指到這裡，整站 Image 都會走 Cloudflare。
 *
 * - 正式站／Vercel：絕不走 /_next/image（會吃 Vercel Image Optimization 額度 → 402）
 * - 正式站：src 改寫成 /cdn-cgi/image/...（format=auto → WebP/AVIF）
 * - 本機 next dev：走 Next Image Optimization（含遠端 R2／正式站圖）
 * - 失敗 onError 回退原圖（寧可原圖，也不要空白）
 */
function isOnVercelRuntime() {
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
  const onVercel = isOnVercelRuntime();

  const handleError = useCallback(
    (event) => {
      setUseOriginal(true);
      onError?.(event);
    },
    [onError],
  );

  if (!src) return null;

  const skipCf = shouldSkipCfImage(typeof src === "string" ? src : "");

  // 本機 next dev：本地＋遠端都走 Next optimizer，才會轉成 WebP
  const useNextOptimizer =
    !useOriginal &&
    !onVercel &&
    process.env.NODE_ENV === "development" &&
    unoptimizedProp !== true &&
    !skipCf;

  const useCf = !useOriginal && cfOn && !useNextOptimizer && !skipCf;

  let resolvedSrc = src;
  let unoptimized = true;

  if (useNextOptimizer) {
    resolvedSrc = src;
    unoptimized = false;
  } else if (useCf && typeof src === "string") {
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

export { unstable_getImgProps } from "next/dist/shared/lib/image-external";
