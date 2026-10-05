import type { Plugin } from 'vite';
import type { VitePWAOptions } from 'vite-plugin-pwa';
import { readColorTokens } from './scripts/designTokens.ts';

/*
 * Installable PWA (PRD 2, 11.1): manifest, own icons (npm run gen:icons) and a service worker that
 * precaches the app shell for installability and a fast start. Learning data is never cached:
 * every /api call goes to the network (offline use and sync are PRD non-goals).
 */

const color = readColorTokens();
export const APP_BACKGROUND = color('bg');

/** Paths the dev and preview servers proxy to the backend; the worker never answers them. */
export const BACKEND_PATHS = ['/api', '/v3', '/actuator'];

const icon = (src: string, size: number, purpose: 'any' | 'maskable') => ({
  src: `/icons/${src}`,
  sizes: `${size}x${size}`,
  type: 'image/png',
  purpose,
});

export const pwaOptions: Partial<VitePWAOptions> = {
  // The new version takes over at once, but the page is not reloaded: a running lesson goes on.
  registerType: 'autoUpdate',
  // Only `vite build` registers the worker; the dev server never has one (devOptions are off).
  injectRegister: 'script-defer',
  includeAssets: ['favicon.svg'],
  // The browser fetches the install icons when it installs the app; the shell does not need them.
  includeManifestIcons: false,
  manifest: {
    id: '/',
    name: 'Lingora',
    short_name: 'Lingora',
    description:
      'Gheg-Albanisch lernen: adaptiv, spielerisch und mit deinem persönlichen Lernplan.',
    lang: 'de-CH',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: APP_BACKGROUND,
    background_color: APP_BACKGROUND,
    categories: ['education'],
    icons: [
      icon('icon-192.png', 192, 'any'),
      icon('icon-512.png', 512, 'any'),
      icon('icon-maskable-192.png', 192, 'maskable'),
      icon('icon-maskable-512.png', 512, 'maskable'),
    ],
  },
  workbox: {
    // The app shell: code, styles, icons and the Latin font subsets that Gheg needs.
    globPatterns: ['**/*.{js,css,html}', 'assets/nunito-latin-*.woff2'],
    // The design catalog is a developer page; it loads from the network when opened.
    globIgnores: ['**/CatalogPage-*.js'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: BACKEND_PATHS.map((path) => new RegExp(`^${path}(/|$)`)),
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    // No runtimeCaching: requests outside the precache, above all /api, always use the network.
  },
};

/** `<meta name="theme-color">` from the tokens, so the browser bars match the app background. */
export function themeColorMeta(): Plugin {
  return {
    name: 'lingora-theme-color',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'theme-color', content: APP_BACKGROUND }, injectTo: 'head' },
    ],
  };
}

/**
 * A worker left behind by `vite preview` on the same origin would keep serving the old build to
 * the dev server. In dev, /sw.js is therefore a worker that unregisters itself and reloads its pages.
 */
const RESET_WORKER = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((pages) => Promise.all(pages.map((page) => page.navigate(page.url)))),
  );
});
`;

export function devServiceWorkerReset(): Plugin {
  return {
    name: 'lingora-dev-service-worker-reset',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/sw.js', (_request, response) => {
        response.setHeader('Content-Type', 'text/javascript');
        response.setHeader('Cache-Control', 'no-store');
        response.end(RESET_WORKER);
      });
    },
  };
}
