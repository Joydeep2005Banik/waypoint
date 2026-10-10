const CACHE_NAME = 'waypoint-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Exclude API requests, Next.js HMR, and external tile/map requests (OpenStreetMap)
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.includes('/_next/webpack-hmr') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('router.project-osrm.org') ||
    url.hostname.includes('overpass-api.de') ||
    url.hostname.includes('nominatim.openstreetmap.org') ||
    url.hostname.includes('127.0.0.1:11434')
  ) {
    return; // let them go to network
  }

  // Cache first for Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            try {
              cache.put(event.request, toCache);
            } catch (err) {
              console.warn('Quota exceeded or cache error', err);
            }
          });
          return response;
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for other requests (e.g. app shell, images)
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const toCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                try {
                  cache.put(event.request, toCache);
                } catch (err) {
                  console.warn('Quota exceeded or cache error', err);
                }
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Do nothing on catch, rely on cachedResponse or fail
          });

        return cachedResponse || fetchPromise;
      })
    );
  }
});
