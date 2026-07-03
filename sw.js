// sw.js - Сервис-воркер для офлайн работы
const CACHE_NAME = 'olotau-v1';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './styles.css',
  './parser.js',
  './admin.js',
  './app.js',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap'
];

// Установка воркера и кэширование ресурсов
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация и удаление старого кэша
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Стратегия: Сначала сеть, если её нет — берем из кэша
self.addEventListener('fetch', (e) => {
  // Не кэшируем запросы к Google Sheets динамически, обрабатываем их в JS
  if (e.request.url.includes('script.google.com')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request).catch(() => {
      return caches.match(e.request);
    })
  );
});