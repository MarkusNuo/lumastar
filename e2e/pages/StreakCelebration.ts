import { expect, type Locator, type Page } from '@playwright/test';
import type { LessonResultResponse } from '../support/lessonApi.ts';

/** "1 Tag Streak!", "3 Tage Streak!" */
export const streakTitle = (days: number) => `${days} ${days === 1 ? 'Tag' : 'Tage'} Streak!`;

/**
 * The screen after the lesson that met today's goal (PRD F9, 12.4): the flame catches fire and the
 * streak counts up by one; a bridged missed day gets a word about the streak freeze.
 */
export class StreakCelebration {
  readonly page: Page;
  readonly screen: Locator;
  readonly continueButton: Locator;
  readonly freezeNote: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId('streak-celebration');
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.freezeNote = page.getByText(
      'Dein Streak-Schutz hat den verpassten Tag überbrückt. Pro Woche gibt es einen davon.',
      { exact: true },
    );
  }

  heading(days: number): Locator {
    return this.page.getByRole('heading', { name: streakTitle(days), level: 1, exact: true });
  }

  /** The celebration of the lesson's streak, with the freeze note exactly when a freeze was used. */
  async expectShown({ streak }: Pick<LessonResultResponse, 'streak'>): Promise<void> {
    await expect(this.screen).toBeVisible();
    await expect(this.heading(streak.current)).toBeVisible();
    await expect(this.screen).toContainText(
      streak.current === 1
        ? 'Dein Tagesziel ist erreicht und deine Flamme brennt. Komm morgen wieder!'
        : 'Tagesziel erreicht! Komm morgen wieder, damit deine Flamme weiterbrennt.',
    );
    await expect(this.freezeNote).toHaveCount(streak.freezeUsed ? 1 : 0);
    await expect(this.continueButton).toBeEnabled();
  }

  /** Passes the celebration with "Weiter" if the lesson met today's goal; otherwise it never shows. */
  async continueIfDue(result: Pick<LessonResultResponse, 'dailyGoal' | 'streak'>): Promise<void> {
    if (!result.dailyGoal.justMet) {
      await expect(this.screen, 'no celebration without a newly met goal').toHaveCount(0);
      return;
    }
    await this.expectShown(result);
    await this.continueButton.click();
    await expect(this.screen).toBeHidden();
  }
}
