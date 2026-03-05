// Service Worker for caching static resources

const CACHE_NAME = 'jg-cache-v2';
const STATIC_ASSETS = [
    '/jg/',
    '/jg/index.php',
    '/jg/css-new/bundle.min.css',
    '/jg/js-core/event-bus.js',
    '/jg/js-core/utils.js',
    '/jg/js-core/logger.js',
    '/jg/js-core/storage.js',
    '/jg/js-core/intelligent-storage.js',
    '/jg/js-core/constants.js',
    '/jg/js-shared/theme.js',
    '/jg/js-pages/home.js',
    '/jg/icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Clearing old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache or fetch from network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip API requests (we want fresh data for APIs)
    if (event.request.url.includes('/api/')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response if found
                    console.log('Service Worker: Serving from cache', event.request.url);
                    return cachedResponse;
                }
                
                // Fetch from network if not in cache
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Cache the response for future requests
                        if (networkResponse && networkResponse.ok) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('Service Worker: Fetch error', error);
                    });
            })
    );
});
