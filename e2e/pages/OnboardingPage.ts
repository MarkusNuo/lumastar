import { expect, type Locator, type Page } from '@playwright/test';
import { escapeRegExp } from '../support/regex.ts';

/** Steps of the first start that show the shared progress bar "Einrichtung" (PRD F1). */
export const COUNTED_STEPS = 5;

export const QUESTIONS = {
  motivation: 'Warum lernst du Gheg?',
  dailyGoal: 'Wie viel Zeit nimmst du dir pro Tag?',
  selfAssessment: 'Wie gut kannst du schon Gheg?',
} as const;
export type Question = keyof typeof QUESTIONS;

/** Number of the question among the counted steps: name and password come first. */
const STEP_OF: Record<Question, number> = { motivation: 3, dailyGoal: 4, selfAssessment: 5 };

/** Onboarding questions after the account step (/onboarding): one question per screen (PRD F1). */
export class OnboardingPage {
  readonly page: Page;
  readonly progress: Locator;
  readonly nextButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.progress = page.getByRole('progressbar', { name: 'Einrichtung' });
    this.nextButton = page.getByRole('button', { name: 'Weiter', exact: true });
  }

  heading(question: Question): Locator {
    return this.page.getByRole('heading', { name: QUESTIONS[question], level: 1 });
  }

  /** The answer cards of a question; the group is named after the question. */
  options(question: Question): Locator {
    return this.page.getByRole('group', { name: QUESTIONS[question] });
  }

  /** A card; its name starts with the label, a daily goal adds its minutes ("Mit Schwung 15 Min. pro Tag"). */
  option(question: Question, label: string): Locator {
    return this.options(question).getByRole('button', { name: new RegExp(`^${escapeRegExp(label)}`) });
  }

  async expectQuestion(question: Question): Promise<void> {
    await expect(this.page).toHaveURL(/\/onboarding$/);
    await expect(this.heading(question)).toBeVisible();
    await expect(this.progress).toHaveAttribute(
      'aria-valuetext',
      `Schritt ${STEP_OF[question]} von ${COUNTED_STEPS}`,
    );
  }

  async choose(question: Question, label: string): Promise<void> {
    await this.option(question, label).tap();
    await expect(this.option(question, label)).toHaveAttribute('aria-pressed', 'true');
  }
}
