const APP_VERSION = "my-expenses-v6";
const STATIC_CACHE = `${APP_VERSION}-static`;

const STATIC_ASSETS = [
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/maskable-icon-512.png",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map((assetPath) => cache.add(assetPath)),
      );
      await self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE)
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith("/api")) {
    return;
  }

  if (request.mode === "navigate") {
    return;
  }

  const shouldUseCacheFirst =
    requestUrl.pathname.startsWith("/_next/static") ||
    requestUrl.pathname === "/logo.png" ||
    requestUrl.pathname === "/icon-192.png" ||
    requestUrl.pathname === "/icon-512.png" ||
    requestUrl.pathname === "/maskable-icon-512.png" ||
    requestUrl.pathname === "/apple-touch-icon.png" ||
    requestUrl.pathname === "/manifest.webmanifest";

  if (!shouldUseCacheFirst) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();

        caches.open(STATIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      });
    }),
  );
});