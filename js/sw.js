const CACHE_NAME = 'x80-portal-v2';
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

// Перехват запросов
self.addEventListener('fetch', (e) => {
  // Не кэшируем запросы к Supabase и YouTube
  if (e.request.url.includes('supabase.co') || e.request.url.includes('youtube.com')) {
    return;
  }

  // Для навигации (открытие страниц) — network-first
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Для остального — cache-first
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
