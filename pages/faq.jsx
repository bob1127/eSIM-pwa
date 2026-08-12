import { useEffect } from "react";
import { useRouter } from "next/router";

/** 舊連結／會員中心常用 /faq → 導向正式 FAQ 頁 /qa */
export default function FaqRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/qa");
  }, [router]);
  return null;
}
