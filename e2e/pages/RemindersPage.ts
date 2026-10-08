import { expect, type Locator, type Page } from '@playwright/test';
import { AppShell } from './AppShell.ts';

/** Route of the reminder settings (M9), below the profile tab. */
export const REMINDERS_ROUTE = '/profil/erinnerungen';

/** What the screen says where reminders cannot be switched on (region titles). */
export const REMINDER_BLOCKERS = {
  denied: 'Mitteilungen sind blockiert',
  unsupported: 'Hier gehen keine Erinnerungen',
  serverUnavailable: 'Erinnerungen sind noch nicht eingerichtet',
  install: 'Erst auf den Home-Bildschirm',
} as const;

/** "Erinnerungen" (/profil/erinnerungen): this device's reminders, their times and a test reminder. */
export class RemindersPage {
  readonly page: Page;
  readonly shell: AppShell;
  readonly heading: Locator;
  readonly backButton: Locator;
  /** The row in the profile's settings that leads here, e.g. "Täglich um 19:00" or "Aus". */
  readonly profileRow: Locator;
  /** The mock notification at the top of the screen. */
  readonly preview: Locator;
  readonly reminderSwitch: Locator;
  readonly timeInput: Locator;
  readonly rescueSwitch: Locator;
  readonly rescueTimeInput: Locator;
  readonly testButton: Locator;
  /** "Als App installiert" in an installed app, else the tip to install it. */
  readonly installedChip: Locator;
  readonly installTip: Locator;
  readonly blocker: (title: string) => Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.heading = page.getByRole('heading', { name: 'Erinnerungen', level: 1, exact: true });
    this.backButton = page.getByRole('button', { name: 'Zurück', exact: true });
    this.profileRow = page
      .getByRole('region', { name: 'Einstellungen', exact: true })
      .getByRole('button', { name: 'Erinnerungen', exact: true });
    this.preview = page.getByLabel('Vorschau einer Erinnerung');
    this.reminderSwitch = page.getByRole('switch', { name: 'Erinnerungen', exact: true });
    this.timeInput = page.getByLabel('Uhrzeit', { exact: true });
    this.rescueSwitch = page.getByRole('switch', { name: 'Streak-Retter am Abend', exact: true });
    this.rescueTimeInput = page.getByLabel('Uhrzeit des Streak-Retters', { exact: true });
    this.testButton = page.getByRole('button', { name: 'Test-Erinnerung senden', exact: true });
    this.installedChip = page.getByText('Als App installiert', { exact: true });
    this.installTip = page.getByText(/^Tipp: Installiere Lingora als App\./);
    this.blocker = (title) => page.getByRole('region', { name: title, exact: true });
  }

  /** A toast of the screen, e.g. "Erinnerungen gespeichert". */
  toast(text: string | RegExp): Locator {
    return this.page.getByRole('status').getByText(text);
  }

  /** Closes the toasts, which cover the top of the screen, e.g. before a screenshot. */
  async closeToasts(): Promise<void> {
    const close = this.page.getByRole('button', { name: 'Meldung schliessen', exact: true });
    for (let shown = await close.count(); shown > 0; shown -= 1) await close.first().click();
    await expect(close).toHaveCount(0);
  }

  /** A message of the screen about a time field, e.g. that the rescue must come later. */
  problem(text: string): Locator {
    return this.page.getByText(text, { exact: true });
  }

  /** Opens the screen from the profile tab, as the learner does. */
  async openFromProfile(): Promise<void> {
    await this.shell.openProfile();
    await this.profileRow.click();
    await expect(this.heading).toBeVisible();
  }

  /** The back arrow of the screen, to the profile tab. */
  async backToProfile(): Promise<void> {
    await this.backButton.click();
    await expect(this.shell.profileHeading).toBeVisible();
  }

  async goto(): Promise<void> {
    await this.page.goto(REMINDERS_ROUTE);
    await expect(this.heading).toBeVisible();
  }

  /** Types a time into a field and leaves it, which saves a valid change at once. */
  async setTime(field: Locator, time: string): Promise<void> {
    await field.fill(time);
    await field.blur();
  }
}
