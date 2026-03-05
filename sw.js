const CACHE_NAME = 'rengong-v2';
const RUNTIME_CACHE = 'rengong-runtime-v2';

const urlsToCache = [
  '/jg/',
  '/jg/index.php',
  '/jg/css-new/variables.css',
  '/jg/css-new/base.css',
  '/jg/css-new/components.css',
  '/jg/css-new/layout.css',
  '/jg/css-new/attendance.css',
  '/jg/css-new/toast.css',
  '/jg/css-new/dialog.css',
  '/jg/css-new/form.css',
  '/jg/css-new/notification.css',
  '/jg/css-new/home.css',
  '/jg/css-new/reimbursement.css',
  '/jg/js-core/event-bus.js',
  '/jg/js-core/storage.js',
  '/jg/js-core/intelligent-storage.js',
  '/jg/js-core/logger.js',
  '/jg/js-core/utils.js',
  '/jg/js-core/export-templates.js',
  '/jg/js-core/constants.js',
  '/jg/js-shared/theme.js',
  '/jg/js-components/dialog.js',
  '/jg/js-components/toast.js',
  '/jg/js-components/form-dialog.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});