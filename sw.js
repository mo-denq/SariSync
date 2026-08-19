/*
  Minimal PWA service worker.
  It enables app-style installation but deliberately does not cache store data.
  Offline product caching will be added later as its own SariSync feature.
*/
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
