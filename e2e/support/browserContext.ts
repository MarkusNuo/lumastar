import type { Browser, BrowserContextOptions, Page } from '@playwright/test';
import { FRONTEND_URL } from './env.ts';
import { PHONES } from './phones.ts';

/** The browser settings every test runs with; the config's `use` and second learners share them. */
export const CONTEXT_OPTIONS = {
  baseURL: FRONTEND_URL,
  locale: 'de-CH',
  timezoneId: 'Europe/Zurich',
  colorScheme: 'dark',
  // Motion jumps to its end state, which keeps screenshots stable; the layout is the same.
  reducedMotion: 'reduce',
  // Requests stay visible to page.route and every page load is a cold start; tests/platform
  // allows the PWA's service worker where it is the subject.
  serviceWorkers: 'block',
} as const satisfies BrowserContextOptions;

/**
 * A second, signed-out browser on the same phone as `like`: another device of the same learner, or
 * the device of another learner. The caller closes its context.
 */
export async function newPhonePage(browser: Browser, like: Page): Promise<Page> {
  const viewport = like.viewportSize();
  const phone =
    Object.values(PHONES).find((candidate) => candidate.viewport.width === viewport?.width) ??
    PHONES['phone-390'];
  const context = await browser.newContext({ ...phone, ...CONTEXT_OPTIONS });
  return context.newPage();
}
