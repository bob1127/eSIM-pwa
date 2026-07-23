"use client";

import Layout from "./Layout";
import MemberOffersPage from "@/components/member-offers/MemberOffersPage";

export default function MemberOffersRoute() {
  return (
    <Layout
      seo={{
        title: "會員優惠｜新會員折扣、介紹好朋友、LINE 專屬優惠",
        description:
          "Jeko eSIM 會員優惠規劃：新會員首購折扣、介紹好朋友雙邊回饋、官方 LINE 優先領獎，以及回購、連假季、多人購等 eSIM 旅遊優惠藍圖。",
      }}
    >
      <MemberOffersPage />
    </Layout>
  );
}
