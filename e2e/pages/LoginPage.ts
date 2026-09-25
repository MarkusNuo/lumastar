import { expect, type Locator, type Page } from '@playwright/test';

/** Login (/login) of the single-user instance (PRD F13). */
export class LoginPage {
  static readonly WRONG_PASSWORD_MESSAGE = 'Das Passwort stimmt nicht. Versuch es nochmals.';

  readonly page: Page;
  readonly heading: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Willkommen zurück!' });
    this.passwordInput = page.getByLabel('Passwort', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Anmelden' });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login$/);
    await expect(this.heading).toBeVisible();
  }

  async login(password: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectWrongPasswordError(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
    await expect(this.passwordInput).toHaveAccessibleDescription(LoginPage.WRONG_PASSWORD_MESSAGE);
  }
}
