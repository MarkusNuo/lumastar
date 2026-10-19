import { expect, type Locator, type Page } from '@playwright/test';

/** Welcome screen (/willkommen): where everyone without a session starts. */
export class WelcomePage {
  readonly page: Page;
  readonly heading: Locator;
  readonly registerLink: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Willkommen bei Lumastar!', level: 1 });
    this.registerLink = page.getByRole('link', { name: 'Konto erstellen', exact: true });
    this.loginLink = page.getByRole('link', { name: 'Ich habe schon ein Konto', exact: true });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/willkommen$/);
    await expect(this.heading).toBeVisible();
  }
}
