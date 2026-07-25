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
 * 啟用 NEXT_PUBLIC_CF_IMAGES=1 時走 Cloudflare loader。
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

  const forceOriginal = Boolean(unoptimized || useOriginal);

  return (
    <Image
      {...props}
      alt={alt}
      src={src}
      loader={cfOn && !forceOriginal ? cfImageLoader : undefined}
      unoptimized={forceOriginal || (!cfOn && Boolean(unoptimized))}
      onError={handleError}
    />
  );
}
