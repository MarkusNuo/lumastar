import { expect, type Locator, type Page } from '@playwright/test';

/** The page of the verification link (/verify-email?token=…); it needs no session. */
export class VerifyEmailPage {
  readonly page: Page;
  readonly doneHeading: Locator;
  readonly invalidHeading: Locator;
  /** "Weiter zu Lumastar" with a session, "Zur Anmeldung" without one. */
  readonly toAppLink: Locator;
  readonly toLoginLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.doneHeading = page.getByRole('heading', { name: 'E-Mail-Adresse bestätigt!', level: 1 });
    this.invalidHeading = page.getByRole('heading', { name: 'Link ungültig', level: 1 });
    this.toAppLink = page.getByRole('link', { name: 'Weiter zu Lumastar', exact: true });
    this.toLoginLink = page.getByRole('link', { name: 'Zur Anmeldung', exact: true });
  }

  async open(link: string): Promise<void> {
    await this.page.goto(link);
    await expect(this.page).toHaveURL(/\/verify-email\?token=/);
  }
}

/** The reminder above the content of the signed-in app while the address is not confirmed. */
export class VerificationBanner {
  readonly region: Locator;
  readonly resendButton: Locator;
  readonly dismissButton: Locator;

  constructor(page: Page) {
    this.region = page.getByRole('region', { name: 'E-Mail bestätigen', exact: true });
    this.resendButton = this.region.getByRole('button', { name: 'Link erneut senden', exact: true });
    this.dismissButton = this.region.getByRole('button', { name: 'Hinweis ausblenden', exact: true });
  }

  /** The cooldown after a resend: "Erneut senden (0:59)". */
  get waitingButton(): Locator {
    return this.region.getByRole('button', { name: /^Erneut senden \(\d+:\d{2}\)$/ });
  }

  async expectFor(email: string): Promise<void> {
    await expect(this.region).toBeVisible();
    await expect(this.region).toContainText(`Wir haben dir einen Link an ${email} geschickt.`);
  }
}
