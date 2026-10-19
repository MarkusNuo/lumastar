import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { StatsPage } from '../../pages/StatsPage.ts';
import { LEARNER } from '../../support/learner.ts';
import { fetchXpTotal } from '../../support/lessonApi.ts';
import { fetchTodayProgress } from '../../support/progressApi.ts';
import { snap } from '../../support/screenshots.ts';

// Signed in through the storage state of the setup project. Shell screens are captured per viewport:
// in full-page captures Chromium leaves the fixed bottom navigation in the middle of the page.

test('the home tab shows the top bar, the learning path and the bottom navigation', async ({
  page,
}) => {
  const shell = new AppShell(page);
  await page.goto('/');
  await shell.expectHome();
  await expect(page.getByRole('heading', { name: 'Lernpfad' })).toBeAttached();
  // The top bar: streak (flame and number), XP and the daily-goal ring.
  await shell.expectProgress(await fetchTodayProgress(page.request));
  await expect(shell.xpLabel).toHaveText(`${await fetchXpTotal(page.request)} XP`);
  await snap(page, 'home', { fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(shell.topBar, 'the top bar sticks while scrolling').toBeInViewport();
  await expect(shell.bottomNav, 'the navigation stays in thumb reach').toBeInViewport();
  await snap(page, 'home-scrolled', { fullPage: false });
});

test('the profile tab shows the signed-in learner', async ({ page }) => {
  const shell = new AppShell(page);
  await page.goto('/');
  await shell.openProfile();
  // In the header and in the row "Anzeigename" of the section "Konto".
  const name = page.getByRole('main').getByText(LEARNER.displayName, { exact: true });
  await expect(name).toHaveCount(2);
  await expect(name.first()).toBeVisible();
  await expect(shell.navLink('Profil')).toHaveAttribute('aria-current', 'page');
  await expect(shell.logoutButton).toBeEnabled();
  await snap(page, 'profile', { fullPage: false });
});

// Every tab is real: no placeholder is left (the Statistik tab in detail: tests/stats).
test('the Statistik tab opens from the navigation with all its sections', async ({ page }) => {
  const shell = new AppShell(page);
  await page.goto('/');
  await shell.navLink('Statistik').click();
  await new StatsPage(page).expectVisible();
  await expect(page.getByText('Kommt bald')).toHaveCount(0);
});
