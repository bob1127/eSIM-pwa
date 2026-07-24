// worker/index.js — next-pwa 會編譯進 public/sw.js
const DEFAULT_ICON = `${self.location.origin}/images/Logo/icon-192.png`;
const DEFAULT_BADGE = `${self.location.origin}/images/Logo/icon-192.png`;

self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Jeko eSIM 貼心提醒";

  const options = {
    body: data.body || "您有一則新訊息",
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        const urlToOpen = new URL(
          event.notification.data?.url || "/",
          self.location.origin,
        ).href;
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && "focus" in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(urlToOpen);
      }),
  );
});
