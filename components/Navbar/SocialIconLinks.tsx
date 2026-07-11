"use client";

import { cn } from "@/lib/utils";
import {
  BrandSocialIconLinks,
  BrandSocialIconLinksMobile,
} from "@/components/social/SocialBrandIcons";

type SocialIconLinksProps = {
  className?: string;
  size?: "sm" | "md";
  variant?: "light" | "dark";
  linkClassName?: string;
  onNavigate?: () => void;
};

export default function SocialIconLinks({
  className,
  size = "md",
  linkClassName,
  onNavigate,
}: SocialIconLinksProps) {
  return (
    <BrandSocialIconLinks
      className={className}
      size={size}
      linkClassName={linkClassName}
      onNavigate={onNavigate}
    />
  );
}

export function SocialIconLinksMobile({ onNavigate }: { onNavigate?: () => void }) {
  return <BrandSocialIconLinksMobile onNavigate={onNavigate} />;
}
