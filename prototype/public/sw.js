// Service Worker for background notifications
// This enables notifications even when the app isn't open

const CACHE_NAME = 'offhours-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Handle background sync for scheduled notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(checkScheduledNotifications());
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Open the app
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Check for scheduled notifications
async function checkScheduledNotifications() {
  // This would check for scheduled notifications and send them
  // In production, this would sync with your backend
}

// Handle push messages (for future push notification integration)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New OffHours activity available!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification('OffHours', options)
  );
});