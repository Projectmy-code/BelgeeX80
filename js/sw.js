const CACHE_NAME = 'x80-portal-v1';
const ASSETS = [
  './',
  './index.html',
  './checklist.html',
  './login.html',
  './favicon.svg'
];

// Установка и кэширование
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Активация
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов (сначала ищем в кэше, потом в сети)
self.addEventListener('fetch', (e) => {
  // Не кэшируем запросы к Supabase и YouTube
  if (e.request.url.includes('supabase.co') || e.request.url.includes('youtube.com')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request);
    })
  );
});
