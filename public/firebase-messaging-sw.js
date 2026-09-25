// Firebase Cloud Messaging Background Service Worker
// Automatically loaded by Firebase SDK when app is in the background

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
const firebaseConfig = {
  projectId: 'gen-lang-client-0402274970',
  appId: '1:46900601033:web:e80367df3c15d27856ad18',
  apiKey: 'AIzaSyB935FQACmtDngoMEw4qTsGCdlZ8QiVqO8',
  authDomain: 'gen-lang-client-0402274970.firebaseapp.com',
  storageBucket: 'gen-lang-client-0402274970.firebasestorage.app',
  messagingSenderId: '46900601033'
};

firebase.initializeApp(firebaseConfig);

try {
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Pengumuman Sekolah SIMAK';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Anda menerima informasi penting terbaru dari sekolah.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.data?.tag || `simak_fcm_${Date.now()}`,
      data: payload.data || {},
      vibrate: [200, 100, 200]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Background messaging init failed:', err);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
