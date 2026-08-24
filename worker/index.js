// worker/index.js — next-pwa 會編譯進 public/sw.js
const DEFAULT_ICON = `${self.location.origin}/images/Logo/icon-192.png`;
const DEFAULT_BADGE = `${self.location.origin}/images/Logo/icon-192.png`;

function resolveNotifyUrl(raw, fallback = "/") {
  try {
    return new URL(raw || fallback, self.location.origin).href;
  } catch {
    return new URL(fallback, self.location.origin).href;
  }
}

function trimActionTitle(label, max = 16) {
  const t = String(label || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

/** Web Push 最多 2 個 action；優先每日型 + 吃到飽，其餘靠 LINE 按鈕 */
function buildNotificationActions(data) {
  const offers = Array.isArray(data.upsellOffers) ? data.upsellOffers : [];
  const picked = [];
  for (const id of ["daily", "unlimited", "total"]) {
    const hit = offers.find((o) => o.id === id);
    if (hit) picked.push(hit);
  }
  return picked.slice(0, 2).map((offer) => ({
    action: `upsell-${offer.id}`,
    title: trimActionTitle(offer.label),
  }));
}

function buildNotificationOptions(data, queryUrl, offers) {
  const options = {
    body: data.body || "您有一則新訊息",
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    data: {
      url: queryUrl,
      upsellOffers: offers,
    },
    actions: buildNotificationActions({ upsellOffers: offers }),
  };
  if (data.isTest) {
    options.tag = "jeko-traffic-test";
    options.renotify = true;
    options.requireInteraction = true;
  }
  return options;
}

self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Jeko eSIM 貼心提醒";
  const queryUrl = resolveNotifyUrl(data.url, "/data-query/");
  const offers = (Array.isArray(data.upsellOffers) ? data.upsellOffers : [])
    .map((o) => ({
      ...o,
      url: o.url ? resolveNotifyUrl(o.url, queryUrl) : null,
    }))
    .filter((o) => o.url);

  const options = buildNotificationOptions(data, queryUrl, offers);

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  let urlToOpen = data.url || "/data-query/";

  if (action && action.startsWith("upsell-")) {
    const id = action.replace(/^upsell-/, "");
    const offers = Array.isArray(data.upsellOffers) ? data.upsellOffers : [];
    const hit = offers.find((o) => o.id === id);
    if (hit?.url) urlToOpen = hit.url;
  }

  const href = resolveNotifyUrl(urlToOpen, "/data-query/");

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === href && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(href);
      }),
  );
});
