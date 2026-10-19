// Installability check of the production build (part of `npm run verify`, after `vite build`):
// web manifest with name, language, standalone display, token colours and icons; a service worker
// that precaches the app shell but never the API and shows the push reminders; index.html linking
// all of it.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readColorTokens } from './designTokens.ts';

const dist = resolve(process.argv[2] ?? 'dist');
const problems = [];
const expect = (condition, message) => {
  if (!condition) problems.push(message);
};
const read = (file) => readFileSync(join(dist, file), 'utf8');

// The reminders name the status-bar badge (DECISIONS #85); the app icon is checked below.
const files = ['manifest.webmanifest', 'sw.js', 'index.html', 'favicon.svg', 'icons/badge-96.png'];
for (const file of files) {
  expect(existsSync(join(dist, file)), `${file} is missing`);
}

if (problems.length === 0) {
  const manifest = JSON.parse(read('manifest.webmanifest'));
  const background = readColorTokens()('bg');
  expect(manifest.name === 'Lumastar', 'manifest name is not "Lumastar"');
  // Only the same id keeps installed apps the same app across a rename (DECISIONS #103).
  expect(manifest.id === '/', 'manifest id is not /');
  expect(manifest.lang === 'de-CH', 'manifest lang is not de-CH');
  expect(manifest.display === 'standalone', 'manifest display is not standalone');
  expect(manifest.start_url === '/', 'manifest start_url is not /');
  expect(manifest.theme_color === background, `theme_color is not the --color-bg token`);
  expect(manifest.background_color === background, `background_color is not --color-bg`);
  for (const purpose of ['any', 'maskable']) {
    for (const size of ['192x192', '512x512']) {
      const icon = manifest.icons.find(
        (entry) => entry.purpose === purpose && entry.sizes === size,
      );
      expect(icon, `no ${purpose} icon of ${size}`);
      if (icon) expect(existsSync(join(dist, icon.src)), `${icon.src} is missing`);
    }
  }

  const worker = read('sw.js');
  expect(worker.includes('index.html'), 'the service worker does not precache index.html');
  expect(!/"url":"\/?api\//.test(worker), 'the service worker precaches API responses');
  expect(
    worker.includes('denylist') && /[`'"]\/api[`'"]/.test(worker),
    'navigations to /api fall back to the app shell',
  );
  for (const event of ['push', 'notificationclick', 'pushsubscriptionchange']) {
    const listens = new RegExp(`addEventListener\\([\`'"]${event}[\`'"]`).test(worker);
    expect(listens, `the service worker does not handle ${event}`);
  }

  const html = read('index.html');
  expect(html.includes('rel="manifest"'), 'index.html does not link the manifest');
  expect(html.includes('registerSW.js'), 'index.html does not register the service worker');
  expect(html.includes('rel="apple-touch-icon"'), 'index.html has no Apple touch icon');
  expect(html.includes(`name="theme-color" content="${background}"`), 'theme-color meta is off');
}

if (problems.length > 0) {
  console.error(`PWA check of ${dist} failed:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`PWA check passed: ${dist} is installable.`);
