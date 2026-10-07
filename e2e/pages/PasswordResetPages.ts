import { expect, type Locator, type Page } from '@playwright/test';

/** "Passwort vergessen?" (/passwort-vergessen): asks for a link to a new password. */
export class ForgotPasswordPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly sentHeading: Locator;
  readonly toLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Passwort vergessen?', level: 1 });
    this.emailInput = page.getByLabel('E-Mail-Adresse', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Link senden', exact: true });
    this.sentHeading = page.getByRole('heading', { name: 'Schau in dein Postfach', level: 1 });
    this.toLoginLink = page.getByRole('link', { name: 'Zur Anmeldung', exact: true });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/passwort-vergessen$/);
    await expect(this.heading).toBeVisible();
  }

  /** The note after a request: the same whether an account has the address or not. */
  sentText(email: string): Locator {
    return this.page.getByText(
      `Falls es ein Konto mit ${email} gibt, ist ein Link für ein neues Passwort unterwegs. Schau auch im Spam-Ordner nach.`,
      { exact: true },
    );
  }
}

/** The page of the reset link (/reset-password?token=…): the new password, twice. */
export class ResetPasswordPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly passwordInput: Locator;
  readonly confirmationInput: Locator;
  readonly submitButton: Locator;
  readonly doneHeading: Locator;
  readonly invalidHeading: Locator;
  readonly requestNewLink: Locator;
  readonly toLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Neues Passwort', level: 1 });
    this.passwordInput = page.getByLabel('Neues Passwort', { exact: true });
    this.confirmationInput = page.getByLabel('Passwort wiederholen', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Passwort speichern', exact: true });
    this.doneHeading = page.getByRole('heading', { name: 'Passwort geändert!', level: 1 });
    this.invalidHeading = page.getByRole('heading', { name: 'Link ungültig', level: 1 });
    this.requestNewLink = page.getByRole('link', { name: 'Neuen Link anfordern', exact: true });
    this.toLoginLink = page.getByRole('link', { name: 'Zur Anmeldung', exact: true });
  }

  async submit(password: string, confirmation = password): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmationInput.fill(confirmation);
    await this.submitButton.click();
  }
}
