import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "./Layout.js";

const CvsMapReturnPage = () => {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storeData = {
        StoreID: router.query.CVSStoreID,
        StoreName: router.query.CVSStoreName,
        StoreAddress: router.query.CVSAddress,
        StoreTel: router.query.CVSTelephone,
      };
      localStorage.setItem("ecpay_cvs_store", JSON.stringify(storeData));
      router.replace("/checkout");
    }
  }, [router]);

  return <p>正在處理門市選擇，請稍後...</p>;
};

export default CvsMapReturnPage;
