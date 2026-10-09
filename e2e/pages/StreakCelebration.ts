import { expect, type Locator, type Page } from '@playwright/test';
import type { LessonResultResponse, LessonStreak } from '../support/lessonApi.ts';
import { isGoalUpdate } from '../support/streakApi.ts';

/** "1 Tag Streak!", "3 Tage Streak!" */
export const streakTitle = (days: number) => `${days} ${days === 1 ? 'Tag' : 'Tage'} Streak!`;

/** "1 Tag", "10 Tage" */
const dayCount = (days: number) => `${days} ${days === 1 ? 'Tag' : 'Tage'}`;

/** intro: the cold flame shivers; show: it catches and the number counts up; settled: all in place. */
export type CelebrationPhase = 'intro' | 'show' | 'settled';

const CHEERS = ['Feuer und Flamme!', 'Stark, weiter so!', 'Du bist kaum zu bremsen!'] as const;

/** The mascot's cheer under the flame; the first day gets its own. */
export function cheerFor(days: number): string {
  return days === 1 ? 'Der erste Funke ist gezündet!' : (CHEERS[days % CHEERS.length] ?? CHEERS[0]);
}

/**
 * The full screen after the lesson that met today's goal (PRD F9, 12.4, M10): it replaces the result
 * screen in place, the grey flame catches fire and the streak counts up from the one before; a
 * bridged missed day gets a word about the streak freeze. When the streak reached its goal, a second
 * beat follows with the trophy and the next goals.
 */
export class StreakCelebration {
  readonly page: Page;
  /** The stage of the ignite beat: kicker, flame, number and text; a tap on it skips the show. */
  readonly screen: Locator;
  readonly continueButton: Locator;
  readonly freezeNote: Locator;
  readonly flame: Locator;
  /** The number that counts up: decorative, the heading reads the new streak aloud. */
  readonly number: Locator;
  readonly embers: Locator;
  /** The trophy beat when the streak reached its goal. */
  readonly goalBeat: Locator;
  readonly goalSaved: Locator;
  readonly laterNote: Locator;

  constructor(page: Page) {
    this.page = page;
    this.screen = page.getByTestId('streak-celebration');
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.freezeNote = page.getByText(
      'Dein Streak-Schutz hat den verpassten Tag überbrückt. Pro Woche gibt es einen davon.',
      { exact: true },
    );
    this.flame = this.screen.locator('[data-lit]');
    this.number = this.screen.locator('h1 > span').first();
    this.embers = page.getByTestId('streak-ember');
    this.goalBeat = page.getByTestId('streak-goal-reached');
    this.goalSaved = page.getByRole('status').filter({ hasText: /^Neues Ziel: / });
    this.laterNote = page.getByText('Du kannst dein nächstes Ziel auch später auf der Streak-Seite wählen.', {
      exact: true,
    });
  }

  heading(days: number): Locator {
    return this.page.getByRole('heading', { name: streakTitle(days), level: 1, exact: true });
  }

  /** The number on screen: the one that popped in last, while the one before may still shrink away. */
  shownNumber(): Promise<string> {
    return this.number.evaluate((grid) => grid.lastElementChild?.textContent ?? '');
  }

  /** How many numbers are on screen: two while the old one shrinks away. */
  numbersOnScreen(): Promise<number> {
    return this.number.evaluate((grid) => grid.childElementCount);
  }

  async expectPhase(phase: CelebrationPhase): Promise<void> {
    await expect(this.screen).toHaveAttribute('data-phase', phase);
  }

  phase(): Promise<string | null> {
    return this.screen.getAttribute('data-phase');
  }

  async expectNumber(days: number): Promise<void> {
    await expect.poll(() => this.shownNumber(), { message: 'the number on screen' }).toBe(String(days));
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

  /** Everything in place: the lit flame, the new number, kicker, text and the mascot's cheer. */
  async expectSettled(streak: Pick<LessonStreak, 'current' | 'freezeUsed'>): Promise<void> {
    await this.expectPhase('settled');
    await this.expectShown({ streak: { ...streak, previous: streak.current, extendedToday: true } });
    await expect(this.flame).toHaveAttribute('data-lit', 'true');
    await this.expectNumber(streak.current);
    await expect(this.screen.getByText(streak.current === 1 ? 'Tag Streak' : 'Tage Streak', { exact: true })).toBeVisible();
    await expect(
      this.screen.getByText(streak.current === 1 ? 'Dein Streak beginnt!' : 'Streak verlängert!', { exact: true }),
    ).toBeVisible();
    await expect(this.page.getByText(cheerFor(streak.current), { exact: true })).toBeVisible();
  }

  /** The trophy beat of a reached streak goal, with its next goals as chips. */
  async expectGoalBeat({ target, options }: NonNullable<LessonStreak['goalReached']>): Promise<void> {
    await expect(this.goalBeat).toBeVisible();
    await expect(this.goalBeat.getByText('Streak-Ziel', { exact: true })).toBeVisible();
    await expect(
      this.page.getByRole('heading', { name: `Ziel erreicht: ${dayCount(target)}!`, level: 1, exact: true }),
    ).toBeVisible();
    await expect(
      this.goalBeat.getByText(`${dayCount(target)} am Stück gelernt. Wie weit gehst du als Nächstes?`, { exact: true }),
    ).toBeVisible();
    const chips = this.goalChooser();
    await expect(chips.getByRole('radio')).toHaveCount(options.length);
    for (const [index, option] of options.entries()) {
      await expect(chips.getByRole('radio').nth(index)).toHaveAccessibleName(dayCount(option));
      await expect(chips.getByRole('radio').nth(index)).not.toBeChecked();
    }
    await expect(this.continueButton).toBeEnabled();
  }

  goalChooser(): Locator {
    return this.page.getByRole('radiogroup', { name: 'Nächstes Ziel', exact: true });
  }

  goalOption(target: number): Locator {
    return this.goalChooser().getByRole('radio', { name: dayCount(target), exact: true });
  }

  /** Taps a chip of the trophy beat, as a learner does, and waits until the goal is saved. */
  async chooseGoal(target: number): Promise<void> {
    const saved = this.page.waitForResponse(isGoalUpdate);
    await this.goalChooser().getByText(dayCount(target), { exact: true }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(200);
    await expect(this.goalOption(target)).toBeChecked();
    await expect(this.goalSaved).toHaveText(`Neues Ziel: ${dayCount(target)}`);
  }

  /**
   * Passes the celebration with "Weiter" if the lesson met today's goal, and the trophy beat of a
   * reached streak goal after it; otherwise it never shows.
   */
  async continueIfDue(result: Pick<LessonResultResponse, 'dailyGoal' | 'streak'>): Promise<void> {
    if (!result.dailyGoal.justMet) {
      await expect(this.screen, 'no celebration without a newly met goal').toHaveCount(0);
      return;
    }
    await this.expectShown(result);
    await this.continueButton.click();
    await expect(this.screen).toBeHidden();
    if (result.streak.goalReached) {
      await this.expectGoalBeat(result.streak.goalReached);
      await this.continueButton.click();
      await expect(this.goalBeat).toBeHidden();
    }
  }
}

/** What the page went through since `watchForPathFlash`: every URL path and whether the app frame showed. */
export interface PathFlashRecord {
  paths: string[];
  /** The bottom navigation of the app frame was put into the page. */
  navigation: boolean;
  /** The learning path's heading was put into the page. */
  learningPath: boolean;
}

/**
 * Watches the page from now on for any sign of the learning path between the result screen and the
 * celebration (M10: "never the path in between"): every URL change through the History API and every
 * element added to the document, however briefly it stays.
 */
export async function watchForPathFlash(page: Page): Promise<() => Promise<PathFlashRecord>> {
  await page.evaluate(() => {
    const record = { paths: [location.pathname], navigation: false, learningPath: false };
    (window as unknown as { __pathFlash: typeof record }).__pathFlash = record;
    const inspect = (node: Node) => {
      if (!(node instanceof Element)) return;
      const elements = [node, ...node.querySelectorAll('*')];
      if (elements.some((element) => element.matches('nav[aria-label="Hauptnavigation"]'))) record.navigation = true;
      if (elements.some((element) => element.matches('h1') && element.textContent?.trim() === 'Lernpfad')) {
        record.learningPath = true;
      }
    };
    new MutationObserver((mutations) => mutations.forEach((mutation) => mutation.addedNodes.forEach(inspect))).observe(
      document.body,
      { childList: true, subtree: true },
    );
    for (const method of ['pushState', 'replaceState'] as const) {
      const original = history[method].bind(history);
      history[method] = (...args: Parameters<History['pushState']>) => {
        original(...args);
        record.paths.push(location.pathname);
      };
    }
    window.addEventListener('popstate', () => record.paths.push(location.pathname));
  });
  return () =>
    page.evaluate(() => (window as unknown as { __pathFlash: PathFlashRecord }).__pathFlash);
}
