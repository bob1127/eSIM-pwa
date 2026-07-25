import { useCallback, useState } from "react";
import Image from "next/image";

/**
 * 與 next/image 相同介面；優化失敗（含 CF 免費額 9422）時改載原圖，避免破圖。
 * 不改 className / fill / sizes，排版不變。
 */
export default function SafeImage({
  src,
  onError,
  unoptimized,
  alt = "",
  ...props
}) {
  const [useOriginal, setUseOriginal] = useState(false);

  const handleError = useCallback(
    (event) => {
      setUseOriginal(true);
      onError?.(event);
    },
    [onError],
  );

  if (!src) return null;

  return (
    <Image
      {...props}
      alt={alt}
      src={src}
      unoptimized={Boolean(unoptimized || useOriginal)}
      onError={handleError}
    />
  );
}
