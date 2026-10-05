import { expect, test } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LEARNER } from '../../support/learner.ts';
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
  await expect(page.getByText(LEARNER.displayName, { exact: true })).toBeVisible();
  await expect(shell.navLink('Profil')).toHaveAttribute('aria-current', 'page');
  await expect(shell.logoutButton).toBeEnabled();
  await snap(page, 'profile', { fullPage: false });
});

// "Statistik" is the last tab of a later milestone (M5); "Wiederholen" is real since M4 (tests/review).
test('tabs of later milestones show a placeholder', async ({ page }) => {
  const shell = new AppShell(page);
  await page.goto('/');
  await shell.navLink('Statistik').click();
  await expect(page).toHaveURL(/\/statistik$/);
  await expect(shell.navLink('Statistik')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: 'Statistik', level: 1 })).toBeVisible();
  await expect(page.getByText('Kommt bald')).toBeVisible();
  await snap(page, 'placeholder-tab', { fullPage: false });
});
