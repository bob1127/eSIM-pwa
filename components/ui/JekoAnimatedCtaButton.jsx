"use client";

import ButtonAnimatedGradient from "@/components/ui/button-animated-gradient";

export const JEKO_SHOP_CATALOG_HREF = "/shop/";
export const JEKO_SHOP_CATALOG_LABEL = "查看 Jeko Shop 全部商品";

/**
 * 可重用漸層 CTA（夥伴賣場「查看 Jeko Shop」同款）
 */
export default function JekoAnimatedCtaButton({
  href,
  children,
  className,
  nested = false,
  showArrow = true,
  external = false,
  surfaceClassName,
}) {
  return (
    <ButtonAnimatedGradient
      href={href}
      className={className}
      nested={nested}
      showArrow={showArrow}
      external={external}
      surfaceClassName={surfaceClassName}
    >
      {children}
    </ButtonAnimatedGradient>
  );
}

/** 查看 Jeko Shop 全部商品 */
export function JekoShopCatalogButton({
  href = JEKO_SHOP_CATALOG_HREF,
  label = JEKO_SHOP_CATALOG_LABEL,
  className,
  nested = false,
}) {
  return (
    <JekoAnimatedCtaButton
      href={href}
      className={className}
      nested={nested}
    >
      {label}
    </JekoAnimatedCtaButton>
  );
}
