// worker/index.js

// 監聽來自伺服器的推播事件
self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Jeko eSIM 貼心提醒';
  
  const options = {
    body: data.body || '您有一則新訊息',
    icon: '/icons/icon-192x192.png', // 推播彈出時的左側大圖示
    badge: '/icons/icon-192x192.png', // 手機上方狀態列的單色小圖示
    vibrate: [200, 100, 200], // 手機震動節奏
    data: {
      url: data.url || '/', // 紀錄客人點擊推播後，要打開哪一個網址
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 監聽客人點擊推播通知的事件
self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // 點擊後關閉通知視窗
  
  // 讓手機打開我們剛剛在 data 裡設定的網址 (例如回到訂單頁面)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});