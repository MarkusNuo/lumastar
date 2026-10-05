import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../support/regex.ts';

/** "0.8" → "80 %", as the checkpoint screens write shares. */
export const share = (value: number) => `${Math.round(value * 100)} %`;

/** The sheet a checkpoint node of the path opens before the test starts (PRD 5). */
export class CheckpointIntroSheet {
  readonly page: Page;
  readonly sheet: Locator;
  readonly startButton: Locator;
  readonly laterButton: Locator;

  constructor(page: Page, level: string) {
    this.page = page;
    this.sheet = page.getByRole('dialog', { name: `Checkpoint ${level}`, exact: true });
    this.startButton = this.sheet.getByRole('button', { name: 'Checkpoint starten' });
    this.laterButton = this.sheet.getByRole('button', { name: 'Später', exact: true });
  }

  /** What the sheet promises: ~15 tasks, 80 % to pass and the level a pass leads to. */
  async expectOpen(nextLevel: string): Promise<void> {
    await expect(this.sheet).toBeVisible();
    await expect(this.sheet).toContainText('~15 Aufgaben · 80 % zum Bestehen');
    await expect(this.sheet).toHaveAccessibleDescription(
      new RegExp(`^Bestehst du, steigst du auf ${escapeRegExp(nextLevel)} auf\\.`),
    );
    await expect(this.startButton, 'the main action has the focus').toBeFocused();
  }
}

/** The end of a checkpoint: an encouraging retry, or the level-up celebration (PRD 5, F9). */
export class CheckpointResultScreen {
  readonly page: Page;
  readonly failedHeading: Locator;
  readonly retryLaterButton: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.failedHeading = page.getByRole('heading', { name: 'Noch nicht ganz', level: 1 });
    this.retryLaterButton = page.getByRole('button', { name: 'Später nochmals versuchen' });
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
  }

  /** "Du bist jetzt auf A1.1" after a pass that moves the learner up. */
  passedHeading(newLevel: string): Locator {
    return this.page.getByRole('heading', { name: `Du bist jetzt auf ${newLevel}`, level: 1 });
  }

  /** Either end, for the lesson loop. */
  anyHeading(): Locator {
    return this.failedHeading.or(
      this.page.getByRole('heading', { name: /^(Du bist jetzt auf .+|Du hast .+ gemeistert!)$/, level: 1 }),
    );
  }

  /** The bar that shows how close a failed checkpoint came. */
  accuracyMeter(accuracy: number, required: number): Locator {
    return this.page.getByRole('img', {
      name: `Deine Genauigkeit: ${share(accuracy)}, ${share(required)} zum Bestehen`,
      exact: true,
    });
  }

  levelBadge(level: string): Locator {
    return this.page.getByRole('main').getByRole('img', { name: `Niveau ${level}`, exact: true });
  }
}

/** The level badges a checkpoint earned (PRD F9), one moment after the level-up. */
export class BadgeRevealScreen {
  readonly page: Page;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
  }

  /** "Niveau A1 geschafft!" */
  heading(bands: readonly string[]): Locator {
    return this.page.getByRole('heading', { name: `Niveau ${bands.join(' & ')} geschafft!`, level: 1 });
  }

  badge(band: string): Locator {
    return this.page.getByRole('main').getByRole('img', { name: `Abzeichen ${band}`, exact: true });
  }
}
