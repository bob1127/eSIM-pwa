import { useEffect } from "react";
import { useRouter } from "next/router";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

/** 相容舊連結 /compatibility → /support */
export default function CompatibilityAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/support/");
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <LoadingIndicator label="前往相容機型查詢…" />
    </div>
  );
}
