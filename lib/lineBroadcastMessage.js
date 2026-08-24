import { normalizeLineCardStyle, sanitizeLineCard, sanitizeLineCards } from "./lineBroadcastCard";
import { resolveLinePushImageUrl, resolveLinePushLink } from "./linePushImageUrl";

function clip(s, n) {
  return String(s || "").trim().slice(0, n);
}

function leadTextMessages(title, body) {
  const text = [clip(title, 200), clip(body, 4800)].filter(Boolean).join("\n");
  if (!text) return [];
  return [{ type: "text", text: text.slice(0, 5000) }];
}

function footerButton(link, label, style) {
  const btn = {
    type: "button",
    style: style.buttonStyle || "primary",
    action: {
      type: "uri",
      label: clip(label, 20) || "查看詳情",
      uri: link,
    },
  };
  if (style.buttonStyle !== "link") {
    btn.color = style.buttonColor;
  }
  return {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: [btn],
  };
}

function buildStyledBubble(card, style) {
  const c = sanitizeLineCard(card);
  const link = resolveLinePushLink(c.url);
  const image = resolveLinePushImageUrl(c.imageUrl);
  const bodyContents = [];

  if (style.showTitle && c.title) {
    bodyContents.push({
      type: "text",
      text: c.title,
      weight: "bold",
      size: "md",
      wrap: true,
      color: style.titleColor,
    });
  }
  if (style.showSubtitle && c.subtitle) {
    bodyContents.push({
      type: "text",
      text: c.subtitle,
      size: "sm",
      wrap: true,
      margin: bodyContents.length ? "sm" : "none",
      color: style.subtitleColor,
      weight: "bold",
    });
  }
  if (style.showBody && c.body) {
    bodyContents.push({
      type: "text",
      text: c.body,
      size: "sm",
      wrap: true,
      margin: bodyContents.length ? "md" : "none",
      color: style.bodyColor,
    });
  }

  if (!bodyContents.length) {
    bodyContents.push({
      type: "text",
      text: " ",
      size: "xs",
      color: "#FFFFFF",
    });
  }

  const bubble = {
    type: "bubble",
    size: style.bubbleSize,
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
    },
  };

  if (style.showHero && image) {
    bubble.hero = {
      type: "image",
      url: image,
      size: "full",
      aspectRatio: style.aspectRatio,
      aspectMode: style.aspectMode,
      action: { type: "uri", uri: link },
    };
  }

  if (style.showButton) {
    bubble.footer = footerButton(link, c.buttonLabel, style);
  }

  return bubble;
}

function flexMessage(altText, contents) {
  return {
    type: "flex",
    altText: clip(altText, 400) || "Jeko eSIM",
    contents,
  };
}

/** LINE Flex：純文字日常推播 */
export function buildLineTextBroadcastMessages({ title, body, url, cardStyle }) {
  const style = normalizeLineCardStyle(cardStyle, "hero");
  const card = sanitizeLineCard({
    title: title || "Jeko eSIM",
    body,
    url,
    buttonLabel: "查看詳情",
  });
  const alt = `${card.title} ${card.body}`.trim();
  return [flexMessage(alt, buildStyledBubble(card, { ...style, showHero: false, showSubtitle: false }))];
}

/** LINE Flex：主 DM（可選前導文字） */
export function buildLineHeroDmMessages({
  title,
  body,
  url,
  imageUrl,
  card,
  cardStyle,
  includeLeadText,
}) {
  const style = normalizeLineCardStyle(cardStyle, "hero");
  const merged = sanitizeLineCard({
    title: card?.title || title,
    subtitle: card?.subtitle,
    body: card?.body ?? body,
    imageUrl: card?.imageUrl || imageUrl,
    url: card?.url || url,
    buttonLabel: card?.buttonLabel || "查看詳情",
  });
  if (style.showHero && !resolveLinePushImageUrl(merged.imageUrl)) {
    throw new Error("主 DM 圖需 HTTPS 公開網址（可填 /images/... 相對路徑）");
  }

  const messages = [];
  if (includeLeadText) {
    messages.push(...leadTextMessages(title, body));
  }
  messages.push(
    flexMessage(
      `${merged.title} ${merged.subtitle} ${merged.body}`.trim(),
      buildStyledBubble(merged, style),
    ),
  );
  return messages;
}

/** LINE Flex：產品輪播（可選前導文字） */
export function buildLineProductCarouselMessages({
  title,
  body,
  products,
  cards,
  cardStyle,
  includeLeadText,
}) {
  const style = normalizeLineCardStyle(cardStyle, "carousel");
  let items = sanitizeLineCards(cards);
  if (!items.length && Array.isArray(products)) {
    items = products.map((p) =>
      sanitizeLineCard({
        title: p.title,
        subtitle: p.priceLabel,
        body: "",
        imageUrl: p.imageUrl,
        url: p.url,
        buttonLabel: "查看商品",
      }),
    );
  }
  items = items.filter((c) => c.title || c.imageUrl);
  if (items.length < 1) {
    throw new Error("產品輪播至少需要 1 張卡片");
  }
  if (items.length > 12) {
    throw new Error("產品輪播最多 12 張卡片");
  }

  const messages = [];
  if (includeLeadText) {
    messages.push(...leadTextMessages(title, body));
  }

  messages.push(
    flexMessage(title || items[0].title || "Jeko eSIM 精選方案", {
      type: "carousel",
      contents: items.map((c) => buildStyledBubble(c, style)),
    }),
  );
  return messages;
}

/**
 * template: text | hero | text_hero | carousel | text_carousel
 */
export function buildLineBroadcastMessages({
  template = "text",
  title,
  body,
  url,
  imageUrl,
  products,
  cards,
  card,
  cardStyle,
}) {
  const mode = String(template || "text").toLowerCase();
  if (mode === "hero" || mode === "text_hero") {
    return buildLineHeroDmMessages({
      title,
      body,
      url,
      imageUrl,
      card,
      cardStyle,
      includeLeadText: mode === "text_hero",
    });
  }
  if (mode === "carousel" || mode === "text_carousel") {
    return buildLineProductCarouselMessages({
      title,
      body,
      products,
      cards,
      cardStyle,
      includeLeadText: mode === "text_carousel",
    });
  }
  return buildLineTextBroadcastMessages({ title, body, url, cardStyle });
}
