// public/service-worker.js

const CACHE_NAME = 'pauls-cleaning-crew-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/client.js',
    // Add other assets like images, fonts if you have them
];

// Install event: Cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.error('Failed to cache during install:', err))
    );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of the page immediately
    return self.clients.claim();
});

// Fetch event: Serve from cache or network
self.addEventListener('fetch', (event) => {
    // For API requests, try network first, then fallback to cache (if applicable) or IndexedDB (handled in client.js)
    if (event.request.url.startsWith(self.location.origin + '/api/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // If network request is successful, clone and cache it
                    if (response.ok) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request);
                })
        );
    } else {
        // For static assets, use a cache-first strategy
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No cache hit - fetch from network
                    return fetch(event.request).then(
                        (response) => {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            // IMPORTANT: Clone the response. A response is a stream
                            // and can only be consumed once. We consume it once to cache it,
                            // and once the browser consumes it.
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                            return response;
                        }
                    );
                })
        );
    }
});