/* Service Worker for Web Push Notifications */

self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { text: event.data ? event.data.text() : 'You have a notification' };
  }

  const title = data.title || 'Aura Knot';
  const options = {
    body: data.body || data.text || 'You have a new reminder',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: data.url || '/',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

/* Optional: handle pushsubscriptionchange */
self.addEventListener('pushsubscriptionchange', function (event) {
  // You may re-subscribe and send the new subscription to your server
});
