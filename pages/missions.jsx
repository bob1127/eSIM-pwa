import Layout from "./Layout";
import MissionWallSection from "@/components/promo/MissionWallSection";

export default function MissionsPage() {
  return (
    <Layout
      seo={{
        title: "任務牆｜體驗實測・互惠曝光・分潤合作｜Jeko eSIM",
        description:
          "Jeko eSIM 任務牆：加入官方 LINE 即可申請體驗實測、互惠曝光、有酬合作與永久分潤任務。",
      }}
    >
      <MissionWallSection headingAs="h1" />
    </Layout>
  );
}
