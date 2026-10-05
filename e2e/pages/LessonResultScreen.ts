import { expect, type Locator, type Page } from '@playwright/test';
import type { LessonDailyGoal, LessonKind, LessonResultResponse } from '../support/lessonApi.ts';
import { goalRingPercent, goalRingText } from './AppShell.ts';
import { StreakCelebration } from './StreakCelebration.ts';

export type StatLabel = 'XP' | 'Genauigkeit' | 'Zeit';

/** The title per lesson kind; a lesson without a mistake is "Fehlerfrei!" instead. */
export const RESULT_TITLES: Record<Exclude<LessonKind, 'checkpoint'>, string> = {
  lesson: 'Lektion geschafft!',
  focus: 'Fokus-Lektion geschafft!',
  review: 'Wiederholung geschafft!',
  practice: 'Gezielt geübt!',
};
export const PERFECT_TITLE = 'Fehlerfrei!';

/** Headline and line below it of the "Tagesziel" card on the result screen (PRD F9). */
export function dailyGoalCardText({ minutesToday, goalMinutes, goalMet, justMet }: LessonDailyGoal): {
  headline: string;
  detail: string;
} {
  if (justMet) return { headline: 'Tagesziel erreicht!', detail: `${minutesToday} Min. geübt. Dein Streak wächst.` };
  if (goalMet) return { headline: 'Tagesziel erreicht', detail: `Heute schon ${minutesToday} Min. geübt.` };
  return {
    headline: `${minutesToday} von ${goalMinutes} Min.`,
    detail: `Noch ${goalMinutes - minutesToday} Min. bis zum Tagesziel.`,
  };
}

/** Lesson end (PRD F5, F9, 12.3): title, XP, accuracy and time cards, today's goal, practised words. */
export class LessonResultScreen {
  readonly page: Page;
  /** The title of any lesson kind; a checkpoint ends on its own screen (CheckpointResultScreen). */
  readonly heading: Locator;
  readonly continueButton: Locator;
  /** Collapses the expanded list of practised words again. */
  readonly showFewerWordsButton: Locator;
  /** The card with today's minutes and the goal ring. */
  readonly dailyGoalCard: Locator;

  constructor(page: Page) {
    this.page = page;
    const titles = [...Object.values(RESULT_TITLES), PERFECT_TITLE];
    this.heading = page.getByRole('heading', { name: new RegExp(`^(${titles.join('|')})$`), level: 1 });
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.showFewerWordsButton = page.getByRole('button', { name: 'Weniger anzeigen', exact: true });
    this.dailyGoalCard = page.getByRole('main').getByRole('region', { name: 'Tagesziel', exact: true });
  }

  /** The "Tagesziel" card shows the minutes of the lesson's day against the goal, and its ring. */
  async expectDailyGoal(goal: LessonDailyGoal): Promise<void> {
    const { headline, detail } = dailyGoalCardText(goal);
    const card = this.dailyGoalCard;
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-tone', goal.goalMet ? 'success' : 'neutral');
    await expect(card.getByText(headline, { exact: true })).toBeVisible();
    await expect(card.getByText(detail, { exact: true })).toBeVisible();
    const ring = card.getByRole('progressbar', { name: 'Tagesziel', exact: true });
    await expect(ring).toHaveAttribute('aria-valuetext', goalRingText(goal.minutesToday, goal.goalMinutes));
    await expect(ring).toHaveAttribute(
      'aria-valuenow',
      String(goalRingPercent(goal.minutesToday, goal.goalMinutes)),
    );
  }

  /**
   * "Weiter": the lesson that met today's goal is followed by the streak celebration (PRD F9),
   * which takes a second "Weiter"; every other lesson leaves at once.
   */
  async leave(result: Pick<LessonResultResponse, 'dailyGoal' | 'streak'>): Promise<void> {
    await this.continueButton.click();
    await new StreakCelebration(this.page).continueIfDue(result);
  }

  /** The card that suggests a focus lesson (PRD F7), named "Fokus-Lektion vorgeschlagen: <tag>". */
  focusSuggestion(label: string): Locator {
    return this.page.getByRole('region', { name: `Fokus-Lektion vorgeschlagen: ${label}`, exact: true });
  }

  focusStartButton(label: string): Locator {
    return this.focusSuggestion(label).getByRole('button', { name: 'Fokus-Lektion starten' });
  }

  /** The stat card: the label on its face, the value below it. */
  stat(label: StatLabel): Locator {
    return this.page.getByText(label, { exact: true }).locator('xpath=..');
  }

  /** A part of the XP line under the cards, e.g. "Basis +10". */
  xpPart(label: 'Basis' | 'Fehlerfrei' | 'Tempo'): Locator {
    return this.page.getByRole('listitem').filter({ hasText: new RegExp(`^${label} \\+\\d+$`) });
  }

  /** Expands a collapsed list of practised words. */
  showAllWordsButton(count: number): Locator {
    return this.page.getByRole('button', { name: `Alle ${count} anzeigen`, exact: true });
  }

  /** Rows of the "Geübte Wörter" card; the innermost div around its heading is the card. */
  learnedWords(): Locator {
    const heading = this.page.getByRole('heading', { name: 'Geübte Wörter', level: 2 });
    return this.page.locator('div', { has: heading }).last().getByRole('listitem');
  }
}
