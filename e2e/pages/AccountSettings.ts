import { expect, type Locator, type Page } from '@playwright/test';
import { AppShell } from './AppShell.ts';

export const ACCOUNT_ROWS = ['E-Mail-Adresse', 'Anzeigename', 'Passwort ändern', 'Konto löschen'] as const;
export type AccountRow = (typeof ACCOUNT_ROWS)[number];

/** The section "Konto" of the profile tab and its screens below /profil/… (M8). */
export class AccountSettings {
  readonly page: Page;
  readonly shell: AppShell;
  readonly section: Locator;
  readonly backButton: Locator;
  /** A screen's own heading; every account screen has one task (PRD 12.1). */
  readonly screenHeading: (title: string) => Locator;

  // /profil/name
  readonly nameInput: Locator;
  readonly saveButton: Locator;

  // /profil/e-mail
  readonly currentAddress: Locator;
  readonly newEmailInput: Locator;
  readonly passwordInput: Locator;
  readonly sendLinkButton: Locator;
  readonly backToProfileLink: Locator;

  // /profil/passwort
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly changePasswordButton: Locator;

  // /profil/konto-loeschen
  readonly consequences: Locator;
  readonly backupButton: Locator;
  readonly deleteButton: Locator;
  readonly confirmDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.section = page.getByRole('region', { name: 'Konto', exact: true });
    this.backButton = page.getByRole('button', { name: 'Zurück', exact: true });
    this.screenHeading = (title) => page.getByRole('heading', { name: title, level: 1, exact: true });

    this.nameInput = page.getByLabel('Dein Name', { exact: true });
    this.saveButton = page.getByRole('button', { name: 'Speichern', exact: true });

    this.currentAddress = page.getByRole('region', { name: 'Aktuelle Adresse', exact: true });
    this.newEmailInput = page.getByLabel('Neue E-Mail-Adresse', { exact: true });
    this.passwordInput = page.getByLabel('Passwort', { exact: true });
    this.sendLinkButton = page.getByRole('button', { name: 'Bestätigungslink senden', exact: true });
    this.backToProfileLink = page.getByRole('link', { name: 'Zurück zum Profil', exact: true });

    this.currentPasswordInput = page.getByLabel('Aktuelles Passwort', { exact: true });
    this.newPasswordInput = page.getByLabel('Neues Passwort', { exact: true });
    this.changePasswordButton = page.getByRole('button', { name: 'Passwort ändern', exact: true });

    this.consequences = page.getByRole('region', {
      name: 'Wenn du dein Konto löschst, ist alles endgültig weg:',
    });
    this.backupButton = page
      .getByRole('region', { name: 'Erst ein Backup?', exact: true })
      .getByRole('button', { name: 'Backup herunterladen', exact: true });
    this.deleteButton = page.getByRole('button', { name: 'Konto löschen', exact: true });
    this.confirmDialog = page.getByRole('alertdialog', { name: 'Wirklich löschen?' });
  }

  row(label: AccountRow): Locator {
    return this.section.getByRole('button', { name: label, exact: true });
  }

  /** Opens the profile tab and one of the account screens from it. */
  async open(label: AccountRow, title: string): Promise<void> {
    await this.page.goto('/');
    await this.shell.openProfile();
    await this.row(label).click();
    await expect(this.screenHeading(title)).toBeVisible();
  }

  /** The note an account screen shows after a change that still needs the link from the mail. */
  outcome(heading: string): Locator {
    return this.page.getByRole('status').filter({ hasText: heading });
  }

  /** A toast; they appear in a status region at the top of the screen. */
  toast(text: string): Locator {
    return this.page.getByRole('status').getByText(text, { exact: true });
  }
}
