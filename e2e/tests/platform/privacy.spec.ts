import { expect, test } from '@playwright/test';
import { NAV_LABELS, AppShell } from '../../pages/AppShell.ts';
import { CatalogPage } from '../../pages/CatalogPage.ts';
import { PlanPage } from '../../pages/PlanPage.ts';
import { FRONTEND_URL } from '../../support/env.ts';

/*
 * PRD 13 "kein Tracking": the app talks to its own server only. Fonts, icons and sounds are part of
 * the build, so no screen loads anything from another host: no analytics, no font or icon CDN.
 */

/** Requests that never reach a network: inline images, blobs of the confetti canvas and the like. */
const LOCAL_SCHEMES = new Set(['data:', 'blob:', 'about:']);

test('no screen requests anything from another host', async ({ page, context }) => {
  const foreign: string[] = [];
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (!LOCAL_SCHEMES.has(url.protocol) && url.origin !== FRONTEND_URL) foreign.push(request.url());
  });
  const shell = new AppShell(page);

  await page.goto('/');
  await shell.expectHome();
  for (const label of NAV_LABELS) {
    await test.step(label, async () => {
      await shell.navLink(label).click();
      await expect(shell.navLink(label)).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached();
      await page.waitForLoadState('networkidle');
    });
  }
  await new PlanPage(page).goto();
  await new CatalogPage(page).goto();
  await page.waitForLoadState('networkidle');

  expect(foreign, 'every request stays on the own origin').toEqual([]);
});
