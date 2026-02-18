const CACHE_NAME = 'agent-premium-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/account.html',
  '/login.html',
  '/track.html',
  '/style.css',
  '/script.js',
  '/auth.js',
  '/auth-config.js',
  '/backend.js',
  '/backend-config.js',
  '/notifications.js',
  '/manifest.json',
  '/images/1691829400logo-canva-png.png',
  '/images/premium-soft.mp4'
];

// Installation du service worker
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes pour mode hors ligne
self.addEventListener('fetch', event => {
  const isGet = event.request.method === 'GET';
  if (!isGet) return;

  const isSameOrigin = new URL(event.request.url).origin === self.location.origin;
  const isAppAsset =
    event.request.mode === 'navigate' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'document';

  if (isSameOrigin && isAppAsset) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retourne la réponse en cache si disponible
        if (response) {
          return response;
        }
        // Sinon, fait la requête réseau
        return fetch(event.request);
      })
  );
});

// Notifications push
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle offre disponible !',
    icon: '/images/1691829400logo-canva-png.png',
    badge: '/images/1691829400logo-canva-png.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir l\'offre',
        icon: '/images/1691829400logo-canva-png.png'
      },
      {
        action: 'close',
        title: 'Fermer'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AGENT PREMIUM', options)
  );
});

// Gestion des clics sur notifications
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
