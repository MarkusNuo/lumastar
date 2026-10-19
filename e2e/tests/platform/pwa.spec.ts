import { expect, test, type Request } from '@playwright/test';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { FRONTEND_URL } from '../../support/env.ts';

/*
 * Installable PWA: the production build that `vite preview` serves has a web app
 * manifest with own icons and registers a service worker for the app shell. Learning data is never
 * cached: the worker leaves every /api request to the network. The other tests block service
 * workers (playwright.config.ts); the worker test allows it.
 */

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface WebAppManifest {
  id?: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  lang: string;
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
}

/** Width and height from the IHDR chunk of a PNG. */
function pngSize(png: Buffer): { width: number; height: number } {
  expect(png.subarray(1, 4).toString('latin1'), 'a PNG file').toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;

test('the build serves a web app manifest: name, standalone display, theme colour and own icons', async ({
  page,
  request,
}) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">');
  const themeMeta = /<meta name="theme-color" content="([^"]+)">/.exec(html)?.[1];

  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^application\/manifest\+json/);
  const manifest = (await response.json()) as WebAppManifest;
  expect(manifest).toMatchObject({
    // The id never changes, so installed apps stay installed and just update.
    id: '/',
    name: 'Lumastar',
    short_name: 'Lumastar',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'de-CH',
  });
  expect(manifest.theme_color).toMatch(HEX_COLOUR);
  expect(manifest.theme_color, 'the browser bars match the page').toBe(themeMeta);
  expect(manifest.background_color, 'the splash screen is the app background').toBe(manifest.theme_color);

  await test.step('the theme colour is the dark background of the app', async () => {
    await page.goto('/');
    await new LearningPathPage(page).expectVisible();
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [r, g, b] = (manifest.theme_color.match(/[0-9a-f]{2}/gi) ?? []).map((hex) => parseInt(hex, 16));
    expect(background).toBe(`rgb(${r}, ${g}, ${b})`);
  });

  await test.step('icons for installing: 192 and 512 px, also maskable, all PNGs of that size', async () => {
    const sizes = (purpose: string) =>
      manifest.icons.filter((icon) => (icon.purpose ?? 'any').split(' ').includes(purpose)).map((icon) => icon.sizes);
    expect(sizes('any')).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(sizes('maskable')).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icon of manifest.icons) {
      const file = await request.get(icon.src);
      expect(file.status(), icon.src).toBe(200);
      expect(file.headers()['content-type'], icon.src).toBe('image/png');
      expect(icon.type).toBe('image/png');
      const { width, height } = pngSize(await file.body());
      expect(`${width}x${height}`, icon.src).toBe(icon.sizes);
    }
  });
});

test.describe('with the service worker', () => {
  test.use({ serviceWorkers: 'allow' });

  test('it takes over the app shell and leaves /api to the network', async ({ page, context }) => {
    const workerRequests: Request[] = [];
    context.on('request', (request) => {
      if (request.serviceWorker()) workerRequests.push(request);
    });
    const path = new LearningPathPage(page);
    await page.goto('/');
    await path.expectVisible();

    const registration = await page.evaluate(async () => {
      const ready = await navigator.serviceWorker.ready;
      return { scope: ready.scope, script: ready.active?.scriptURL };
    });
    expect(registration).toEqual({ scope: `${FRONTEND_URL}/`, script: `${FRONTEND_URL}/sw.js` });
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null), {
        message: 'the worker controls the page it was installed from (clientsClaim)',
      })
      .toBe(`${FRONTEND_URL}/sw.js`);

    await test.step('a reload comes from the precache; its API calls from the backend', async () => {
      const api: { path: string; fromWorker: boolean }[] = [];
      page.on('response', (response) => {
        const { pathname } = new URL(response.url());
        if (pathname.startsWith('/api/')) api.push({ path: pathname, fromWorker: response.fromServiceWorker() });
      });
      const document = await page.reload();
      expect(document?.fromServiceWorker(), 'the app shell is served by the worker').toBe(true);
      await path.expectVisible();
      expect(api.map((call) => call.path), 'the app loads its data').toEqual(
        expect.arrayContaining(['/api/me', '/api/path']),
      );
      expect(api.filter((call) => call.fromWorker), 'no API answer comes from the worker').toEqual([]);
    });

    await test.step('a navigation to /api is not answered with the app shell', async () => {
      const response = await page.goto('/api/auth/status');
      expect(response?.fromServiceWorker()).toBe(false);
      expect(response?.headers()['content-type']).toMatch(/^application\/json/);
      expect(await response?.json()).toMatchObject({ authenticated: true });
    });

    expect(
      workerRequests.map((request) => new URL(request.url()).pathname).filter((url) => url.startsWith('/api')),
      'the worker itself never fetches learning data',
    ).toEqual([]);
  });
});
