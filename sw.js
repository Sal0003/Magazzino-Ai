const CACHE_NAME = 'magazzai-v25';
const urlsToCache = ['./', './index.html', './style.css', './app.js', './manifest.json'];
self.addEventListener('install', function(event) { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(function(cache) { return cache.addAll(urlsToCache); })); });
self.addEventListener('fetch', function(event) { event.respondWith(fetch(event.request).then(function(response) { if (response && response.status === 200) { var r = response.clone(); caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, r); }); } return response; }).catch(function() { return caches.match(event.request); })); });
self.addEventListener('activate', function(event) { event.waitUntil(caches.keys().then(function(names) { return Promise.all(names.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })); }).then(function() { return self.clients.claim(); })); });
