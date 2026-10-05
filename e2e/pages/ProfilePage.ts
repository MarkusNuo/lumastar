import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { isSettingsUpdate, type DailyGoalMinutes, type Settings } from '../support/progressApi.ts';
import { AppShell } from './AppShell.ts';

export interface SavedDownload {
  /** The name the browser suggests, from the Content-Disposition header. */
  filename: string;
  path: string;
}

export const LEARNING_DATA_ACTIONS = [
  'KI-Zusammenfassung kopieren',
  'Zusammenfassung ansehen',
  'Backup herunterladen',
  'Backup importieren',
] as const;
export type LearningDataAction = (typeof LEARNING_DATA_ACTIONS)[number];

/**
 * Profile tab (/profil): learner header, badges, the "Lerndaten" actions of PRD F11, the settings
 * and the logout.
 */
export class ProfilePage {
  readonly page: Page;
  readonly shell: AppShell;
  readonly learningData: Locator;
  /** "Einstellungen": daily goal, sounds, vibration and the target retention. */
  readonly settings: Locator;
  /** The choice of 5, 10, 15 or 20 minutes a day (PRD F1, F9). */
  readonly dailyGoal: Locator;
  /** The note after a new daily goal: "Lernplan angepasst: A1 bis ca. …". */
  readonly planNote: Locator;
  /** Opens the advanced setting "Ziel-Behaltensrate" (PRD F8); its name ends with the current value. */
  readonly retentionToggle: Locator;
  readonly retentionSlider: Locator;
  /** The bottom sheet with the formatted learner_summary.md. */
  readonly summarySheet: Locator;
  readonly importConfirm: Locator;
  /** The inline error message under the actions. */
  readonly problem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.learningData = page.getByRole('region', { name: 'Lerndaten' });
    this.settings = page.getByRole('region', { name: 'Einstellungen', exact: true });
    this.dailyGoal = this.settings.getByRole('radiogroup', { name: 'Tagesziel', exact: true });
    this.planNote = this.settings.getByRole('status').filter({ hasText: /^Lernplan angepasst/ });
    this.retentionToggle = this.settings.getByRole('button', { name: /^Ziel-Behaltensrate anpassen:/ });
    this.retentionSlider = this.settings.getByRole('slider', { name: 'Ziel-Behaltensrate', exact: true });
    this.summarySheet = page.getByRole('dialog', { name: 'KI-Zusammenfassung' });
    this.importConfirm = page.getByRole('alertdialog', { name: 'Backup importieren?' });
    this.problem = page.getByRole('main').getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.shell.openProfile();
    for (const action of LEARNING_DATA_ACTIONS) await expect(this.action(action)).toBeVisible();
  }

  /** The radio button of a daily goal, labelled "5 Min." etc. */
  goalOption(minutes: DailyGoalMinutes): Locator {
    return this.dailyGoal.getByRole('radio', { name: `${minutes} Min.`, exact: true });
  }

  /** Taps a daily goal, as a learner does, and waits until it is saved. */
  async chooseGoal(minutes: DailyGoalMinutes): Promise<Settings> {
    const saved = this.page.waitForResponse(isSettingsUpdate);
    await this.dailyGoal.getByText(`${minutes} Min.`, { exact: true }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(200);
    await expect(this.goalOption(minutes)).toBeChecked();
    return (await response.json()) as Settings;
  }

  /** A switch of a device setting, e.g. "Töne" or "Vibration" (PRD 12.4). */
  deviceSwitch(label: 'Töne' | 'Vibration'): Locator {
    return this.settings.getByRole('switch', { name: label, exact: true });
  }

  action(label: LearningDataAction): Locator {
    return this.learningData.getByRole('button', { name: label, exact: true });
  }

  /** The level badges A1 … C2 (PRD F9): one row each, earned ones with their day. */
  badges(): Locator {
    return this.page.getByRole('region', { name: 'Abzeichen', exact: true }).getByRole('listitem');
  }

  /** A badge; one not earned yet is named "Abzeichen B1, noch nicht verdient". */
  badge(band: string, earned: boolean): Locator {
    const name = earned ? `Abzeichen ${band}` : `Abzeichen ${band}, noch nicht verdient`;
    return this.page.getByRole('region', { name: 'Abzeichen', exact: true }).getByRole('img', { name, exact: true });
  }

  /** The XP chip of the header, e.g. "1’240 XP" in Swiss number format. */
  xpChip(xp: number): Locator {
    return this.page.getByRole('main').getByText(`${xp.toLocaleString('de-CH')} XP`, { exact: true });
  }

  /** The level chip; its decorative badge is part of the text, so the label is matched as a part. */
  levelChip(level: string | undefined): Locator {
    return this.page.getByRole('main').getByText(level ? `Niveau ${level}` : 'Noch nicht eingestuft');
  }

  /** A toast; they appear in a status region at the top of the screen. */
  toast(text: string | RegExp): Locator {
    return this.page.getByRole('status').getByText(text);
  }

  /** Taps "Backup herunterladen" and saves the file under its suggested name in `folder`. */
  async downloadBackup(folder: string): Promise<SavedDownload> {
    const download = this.page.waitForEvent('download');
    await this.action('Backup herunterladen').click();
    const file = await download;
    const filename = file.suggestedFilename();
    const saved = path.join(folder, filename);
    await file.saveAs(saved);
    return { filename, path: saved };
  }

  /** Taps "Backup importieren" and picks the file in the file chooser that opens. */
  async chooseBackup(file: string): Promise<void> {
    const chooser = this.page.waitForEvent('filechooser');
    await this.action('Backup importieren').click();
    await (await chooser).setFiles(file);
    await expect(this.importConfirm).toBeVisible();
  }

  async confirmImport(): Promise<void> {
    await this.importConfirm.getByRole('button', { name: 'Ersetzen', exact: true }).click();
    await expect(this.importConfirm).toBeHidden();
  }
}
