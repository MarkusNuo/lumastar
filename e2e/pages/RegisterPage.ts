import { expect, type Locator, type Page, type Response } from '@playwright/test';
import type { Credentials } from '../support/auth.ts';

export const isRegistration = (response: Response) =>
  response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/register';

/**
 * Registration (/registrieren), the first counted step of the first start (PRD F1, M8): one form
 * with name, address and password; the invite code only when the instance needs one. Its progress
 * bar runs on through the onboarding questions, see OnboardingPage.
 */
export class RegisterPage {
  static readonly HEADING = 'Erstelle dein Konto. Danach geht’s los!';

  readonly page: Page;
  readonly heading: Locator;
  readonly progress: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly inviteCodeInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: RegisterPage.HEADING, level: 1 });
    this.progress = page.getByRole('progressbar', { name: 'Einrichtung' });
    this.nameInput = page.getByLabel('Dein Name', { exact: true });
    this.emailInput = page.getByLabel('E-Mail-Adresse', { exact: true });
    this.passwordInput = page.getByLabel('Passwort', { exact: true });
    this.inviteCodeInput = page.getByLabel('Einladungscode', { exact: true });
    this.submitButton = page.getByRole('button', { name: 'Konto erstellen', exact: true });
    this.loginLink = page.getByRole('link', { name: 'Anmelden', exact: true });
    this.backButton = page.getByRole('button', { name: 'Zurück', exact: true });
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/registrieren$/);
    await expect(this.heading).toBeVisible();
  }

  async fill(account: Pick<Credentials, 'displayName' | 'email' | 'password'>): Promise<void> {
    await this.nameInput.fill(account.displayName);
    await this.emailInput.fill(account.email);
    await this.passwordInput.fill(account.password);
  }

  /** Fills the form, sends it and returns the answer of POST /api/auth/register. */
  async register(account: Pick<Credentials, 'displayName' | 'email' | 'password'>): Promise<Response> {
    await this.fill(account);
    const answer = this.page.waitForResponse(isRegistration);
    await this.submitButton.click();
    return answer;
  }

  async expectFieldError(field: Locator, message: string): Promise<void> {
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(message);
  }
}
