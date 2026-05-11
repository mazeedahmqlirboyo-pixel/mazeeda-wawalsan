// Basic Service Worker untuk memenuhi syarat PWA Chrome
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Hanya bypass untuk memastikan install prompt bisa muncul
  e.respondWith(fetch(e.request).catch(() => new Response('Offline')));
});
