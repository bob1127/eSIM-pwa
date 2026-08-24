import { getPublicSiteUrl } from "./siteUrl";

/** LINE Flex：日常推播（Boss / admin 廣播用） */
export function buildLineBroadcastMessages({ title, body, url }) {
  const siteUrl = getPublicSiteUrl().replace(/\/$/, "");
  const link = String(url || "/").startsWith("http")
    ? url
    : `${siteUrl}${String(url || "/").startsWith("/") ? url : `/${url}`}`;

  const t = String(title || "Jeko eSIM").trim();
  const b = String(body || "").trim();

  return [
    {
      type: "flex",
      altText: `${t} ${b}`.slice(0, 400),
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: t,
              weight: "bold",
              size: "md",
              wrap: true,
              color: "#111827",
            },
            {
              type: "text",
              text: b,
              size: "sm",
              wrap: true,
              margin: "md",
              color: "#374151",
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#3768C7",
              action: {
                type: "uri",
                label: "查看詳情",
                uri: link,
              },
            },
          ],
        },
      },
    },
  ];
}
