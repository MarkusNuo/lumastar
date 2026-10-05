import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
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

/** Profile tab (/profil): learner header, the "Lerndaten" actions of PRD F11 and the logout. */
export class ProfilePage {
  readonly page: Page;
  readonly shell: AppShell;
  readonly learningData: Locator;
  /** The bottom sheet with the formatted learner_summary.md. */
  readonly summarySheet: Locator;
  readonly importConfirm: Locator;
  /** The inline error message under the actions. */
  readonly problem: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.learningData = page.getByRole('region', { name: 'Lerndaten' });
    this.summarySheet = page.getByRole('dialog', { name: 'KI-Zusammenfassung' });
    this.importConfirm = page.getByRole('alertdialog', { name: 'Backup importieren?' });
    this.problem = page.getByRole('main').getByRole('alert');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.shell.openProfile();
    for (const action of LEARNING_DATA_ACTIONS) await expect(this.action(action)).toBeVisible();
  }

  action(label: LearningDataAction): Locator {
    return this.learningData.getByRole('button', { name: label, exact: true });
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
