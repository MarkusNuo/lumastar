import { test as base, type BrowserContext, type Page } from '@playwright/test';

/*
 * A browser profile on disk instead of Playwright's off-the-record context: Chromium keeps the
 * service worker, its notifications and the granted permission as an installed browser does. Real
 * push still needs Google's push service (`pushManager.subscribe()` waits for it), so the tests swap
 * the push service at both ends (support/browserPush.ts) and keep the worker real.
 *
 * Its `context` and `page` replace the built-in ones: the profile has the phone, locale and options of
 * the project, allows service workers, grants notifications and runs the full Chromium (its headless
 * mode has notifications; the headless shell of the other tests reports them as denied). Its time
 * fields follow the browser's language, not the emulated locale: Swiss German shows 18:15. Like
 * every context of a test it gets the storage state in use: a spec that signs in learners of its
 * own sets an empty one, so the shared learner's session stays untouched.
 */
export const test = base.extend({
  context: async (
    {
      playwright,
      headless,
      viewport,
      userAgent,
      deviceScaleFactor,
      isMobile,
      hasTouch,
      locale,
      timezoneId,
      colorScheme,
      reducedMotion,
      baseURL,
    },
    use,
    testInfo,
  ) => {
    // Inside the test's output folder, which Playwright empties at the start of every run.
    const context: BrowserContext = await playwright.chromium.launchPersistentContext(testInfo.outputPath('profile'), {
      channel: 'chromium',
      headless,
      args: ['--lang=de-CH'],
      ...definedOnly({ viewport, userAgent, deviceScaleFactor, locale, timezoneId, baseURL }),
      isMobile,
      hasTouch,
      colorScheme,
      reducedMotion,
      serviceWorkers: 'allow',
      permissions: ['notifications'],
    });
    await use(context);
    await context.close();
  },

  page: async ({ context }, use) => {
    const page: Page = context.pages()[0] ?? (await context.newPage());
    await use(page);
  },
});

export { expect } from '@playwright/test';

/** Leaves out the options a project does not set, so the browser's defaults apply. */
function definedOnly<T extends object>(options: T): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}
