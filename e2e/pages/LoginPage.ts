import { expect, type Locator, type Page } from '@playwright/test';

/** Sign-in with e-mail address and password (/anmelden). */
export class LoginPage {
  static readonly WRONG_CREDENTIALS_MESSAGE = 'E-Mail-Adresse oder Passwort stimmt nicht. Versuch es nochmals.';

  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly forgotLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Willkommen zurück!', level: 1 });
    this.emailInput = page.getByLabel('E-Mail-Adresse', { exact: true });
    this.passwordInput = page.getByLabel('Passwort', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Anmelden', exact: true });
    this.forgotLink = page.getByRole('link', { name: 'Passwort vergessen?', exact: true });
    this.registerLink = page.getByRole('link', { name: 'Konto erstellen', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/anmelden');
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/anmelden$/);
    await expect(this.heading).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectWrongCredentialsError(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('aria-invalid', 'true');
    await expect(this.passwordInput).toHaveAccessibleDescription(LoginPage.WRONG_CREDENTIALS_MESSAGE);
  }
}
