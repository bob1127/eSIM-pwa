/* 本機開發用：僅處理 Web Push，不含 Workbox precache（避免 dev 與 HMR 衝突） */
const DEFAULT_ICON = `${self.location.origin}/images/Logo/icon-192.png`;
const DEFAULT_BADGE = `${self.location.origin}/images/Logo/icon-192.png`;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Jeko eSIM 貼心提醒";
  const options = {
    body: data.body || "您有一則新訊息",
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_BADGE,
    image: data.image || undefined,
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
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
