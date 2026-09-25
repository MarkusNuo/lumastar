import { expect, type Locator, type Page } from '@playwright/test';

export const NAV_LABELS = ['Lernen', 'Wiederholen', 'Statistik', 'Profil'] as const;
export type NavLabel = (typeof NAV_LABELS)[number];

/** Signed-in app frame: top bar, the current tab and the bottom navigation (PRD 12.3). */
export class AppShell {
  readonly page: Page;
  readonly topBar: Locator;
  readonly bottomNav: Locator;
  readonly profileHeading: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.topBar = page.getByRole('banner');
    this.bottomNav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    this.profileHeading = page.getByRole('heading', { name: 'Profil', level: 1 });
    this.logoutButton = page.getByRole('button', { name: 'Abmelden' });
  }

  navLink(label: NavLabel): Locator {
    return this.bottomNav.getByRole('link', { name: label });
  }

  async expectHome(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.bottomNav).toBeVisible();
    for (const label of NAV_LABELS) await expect(this.navLink(label)).toBeVisible();
    await expect(this.navLink('Lernen')).toHaveAttribute('aria-current', 'page');
    await expect(this.topBar).toBeVisible();
  }

  async openProfile(): Promise<void> {
    await this.navLink('Profil').click();
    await expect(this.page).toHaveURL(/\/profil$/);
    await expect(this.profileHeading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.openProfile();
    await this.logoutButton.click();
  }
}
