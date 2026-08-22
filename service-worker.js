const CACHE_NAME = 'jeju-guide-v5';
const APP_SHELL = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest', './icon.svg', './vendor/leaflet.css', './vendor/leaflet.js'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))));
self.addEventListener('fetch', (event) => event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request))));
