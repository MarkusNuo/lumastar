import { expect, type Locator, type Page } from '@playwright/test';

/**
 * First-start setup (/setup): welcome, name and password step (PRD F1, F13). Its progress bar runs on
 * through the onboarding questions, see OnboardingPage.
 */
export class SetupPage {
  readonly page: Page;
  readonly welcomeHeading: Locator;
  readonly startButton: Locator;
  readonly nameInput: Locator;
  readonly nextButton: Locator;
  readonly passwordInput: Locator;
  readonly confirmationInput: Locator;
  readonly createAccountButton: Locator;
  readonly progress: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeHeading = page.getByRole('heading', { name: 'Willkommen bei Lingora!' });
    this.startButton = page.getByRole('button', { name: /^Los geht/ });
    this.nameInput = page.getByLabel('Dein Name');
    this.nextButton = page.getByRole('button', { name: 'Weiter' });
    this.passwordInput = page.getByLabel('Passwort', { exact: true });
    this.confirmationInput = page.getByLabel('Passwort wiederholen');
    this.createAccountButton = page.getByRole('button', { name: 'Konto erstellen' });
    this.progress = page.getByRole('progressbar', { name: 'Einrichtung' });
  }

  async expectWelcome(): Promise<void> {
    await expect(this.page).toHaveURL(/\/setup$/);
    await expect(this.welcomeHeading).toBeVisible();
  }

  async start(): Promise<void> {
    await this.startButton.click();
    await expect(this.nameInput).toBeFocused();
  }

  async enterName(displayName: string): Promise<void> {
    await this.nameInput.fill(displayName);
    await this.nextButton.click();
    await expect(this.passwordHeading(displayName)).toBeVisible();
  }

  passwordHeading(displayName: string): Locator {
    return this.page.getByRole('heading', { name: `Freut mich, ${displayName}!`, exact: false });
  }

  async submitPasswords(password: string, confirmation: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmationInput.fill(confirmation);
    await this.createAccountButton.click();
  }
}
