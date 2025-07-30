const CACHE_NAME = 'untime-v1';

// Get the base path from the current location
const getBasePath = () => {
  const path = self.location.pathname;
  // If we're in a subdirectory, extract it
  if (path.includes('/untime')) {
    return '/untime';
  }
  return '';
};

const basePath = getBasePath();

const STATIC_RESOURCES = [
  `${basePath}/`,
  `${basePath}/manifest.json`,
  `${basePath}/favicon.svg`,
  `${basePath}/icon-192x192.png`,
  `${basePath}/icon-512x512.png`
];

// Install event - cache static resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_RESOURCES))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        if (event.request.destination === 'document') {
          return caches.match(`${basePath}/`);
        }
      })
  );
});