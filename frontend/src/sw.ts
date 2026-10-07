import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CSRF_COOKIE } from './api/middleware';
import { BACKEND_NAVIGATIONS } from './sw/backendPaths';
import {
  handleNotificationClick,
  renewSubscription,
  showReminder,
  type ReminderWorker,
} from './sw/handlers';
import { readPushData } from './sw/reminder';
import { createWorkerBackend } from './sw/workerBackend';

/*
 * Lingora's service worker (vite-plugin-pwa injectManifest; PRD 2, 11.1; DECISIONS #59, #85).
 *
 * App shell: the build's code, styles and fonts are precached for installability and a fast
 * start; navigations fall back to index.html. Learning data is never cached: there is no runtime
 * caching, every /api request goes to the network.
 *
 * Reminders: web push messages become native system notifications; a tap brings the app to the
 * front at the right screen, "In 1 Stunde" postpones the reminder without opening it.
 */

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: BACKEND_NAVIGATIONS }),
);

const badging = self.navigator;

const worker: ReminderWorker = {
  origin: self.location.origin,
  showNotification: (title, options) => self.registration.showNotification(title, options),
  setAppBadge: (count) =>
    'setAppBadge' in badging ? badging.setAppBadge(count) : Promise.resolve(),
  clearAppBadge: () => ('clearAppBadge' in badging ? badging.clearAppBadge() : Promise.resolve()),
  appWindows: () => self.clients.matchAll({ type: 'window', includeUncontrolled: true }),
  openWindow: (url) => self.clients.openWindow(url),
  subscribe: (applicationServerKey) =>
    self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }),
  backend: createWorkerBackend({
    baseUrl: self.location.origin,
    fetch: (request) => self.fetch(request),
    // Safari before 18.4 has no Cookie Store: the request then fails CSRF and the app catches up.
    readCsrfToken: async () =>
      'cookieStore' in self ? (await self.cookieStore.get(CSRF_COOKIE))?.value : undefined,
    userAgent: self.navigator.userAgent,
  }),
};

self.addEventListener('push', (event) => {
  event.waitUntil(showReminder(worker, readPushData(event.data)));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    handleNotificationClick(worker, { action: event.action, data: event.notification.data }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    renewSubscription(worker, {
      oldSubscription: event.oldSubscription,
      newSubscription: event.newSubscription,
    }),
  );
});
