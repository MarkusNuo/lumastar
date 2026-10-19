import { expect, type Locator, type Page } from '@playwright/test';
import { firstBuildableChips, isSpecialChar } from '../support/answers.ts';
import {
  canAnswerWrong,
  choiceFor,
  solutionsOf,
  textFor,
  type Intent,
} from '../support/lessonAnswers.ts';
import type { ExerciseType, LessonExercise, Outcome } from '../support/lessonApi.ts';

export const FEEDBACK_VARIANTS = ['correct', 'almost', 'standard', 'wrong'] as const;
export type FeedbackVariant = (typeof FEEDBACK_VARIANTS)[number];

/** The feedback sheet the player shows for the binding outcome of the backend. */
export const VARIANT_OF: Record<Outcome, FeedbackVariant> = {
  correct: 'correct',
  almost_correct: 'almost',
  correct_standard_form: 'standard',
  wrong: 'wrong',
};

/** Title, colour tone and solution label of the feedback sheet per variant. */
export const FEEDBACK: Record<FeedbackVariant, { title: string; tone: string; solutionLabel: string }> = {
  correct: { title: 'Richtig!', tone: 'success', solutionLabel: 'Lösung' },
  almost: { title: 'Fast richtig!', tone: 'warning', solutionLabel: 'Richtige Schreibweise' },
  standard: { title: 'Richtig, aber Standard', tone: 'secondary', solutionLabel: 'Auf Gheg' },
  wrong: { title: 'Nicht ganz', tone: 'danger', solutionLabel: 'Richtige Lösung' },
};

export type ChipGroup = 'Wortbausteine' | 'Antwortmöglichkeiten';
export type PairSide = 'Gheg' | 'Deutsch';

/** Lesson player (/lesson/:unitId): one exercise, the "Prüfen" button and the feedback sheet. */
export class LessonPlayer {
  readonly page: Page;
  readonly progress: Locator;
  readonly closeButton: Locator;
  /** The exercise on screen; carries data-exercise-id and data-exercise-type. */
  readonly exercise: Locator;
  readonly checkButton: Locator;
  readonly retryBadge: Locator;
  readonly specialChars: Locator;
  readonly quitDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.progress = page.getByRole('progressbar', { name: 'Lektionsfortschritt' });
    this.closeButton = page.getByRole('button', { name: 'Lektion schliessen' });
    this.exercise = page.locator('[data-exercise-id]');
    this.checkButton = page.getByRole('button', { name: 'Prüfen' });
    this.retryBadge = this.exercise.getByText('Nochmals', { exact: true });
    this.specialChars = page.getByRole('group', { name: 'Sonderzeichen' });
    this.quitDialog = page.getByRole('alertdialog', { name: 'Lektion wirklich beenden?' });
  }

  async current(): Promise<{ id: string; type: ExerciseType }> {
    await expect(this.exercise).toHaveCount(1);
    const id = await this.exercise.getAttribute('data-exercise-id');
    const type = await this.exercise.getAttribute('data-exercise-type');
    if (!id || !type) throw new Error('The exercise lacks its data attributes');
    return { id, type: type as ExerciseType };
  }

  async progressValue(): Promise<number> {
    return Number(await this.progress.getAttribute('aria-valuenow'));
  }

  feedbackSheet(variant: FeedbackVariant): Locator {
    return this.page.getByRole('dialog', { name: FEEDBACK[variant].title, exact: true });
  }

  /** The variant of the feedback sheet on screen: its colour tone, confirmed by its title. */
  async shownFeedback(): Promise<FeedbackVariant> {
    const sheet = this.page.locator('[role="dialog"][data-tone]');
    await expect(sheet).toBeVisible();
    const tone = await sheet.getAttribute('data-tone');
    const variant = FEEDBACK_VARIANTS.find((candidate) => FEEDBACK[candidate].tone === tone);
    if (!variant) throw new Error(`No feedback variant has the tone ${tone}`);
    await expect(this.feedbackSheet(variant)).toBeVisible();
    return variant;
  }

  /** A multiple-choice card; its accessible name also holds the number key, so match its label. */
  option(choice: string): Locator {
    return this.exercise
      .getByRole('button')
      .filter({ has: this.page.getByText(choice, { exact: true }) });
  }

  async chooseOption(choice: string): Promise<void> {
    await this.option(choice).tap();
    await expect(this.option(choice)).toHaveAttribute('aria-pressed', 'true');
  }

  chips(group: ChipGroup): Locator {
    return this.exercise.getByRole('group', { name: group });
  }

  /** Taps word chips in order; a picked chip leaves an empty slot, so the next equal word is free. */
  async tapChips(group: ChipGroup, words: readonly string[]): Promise<void> {
    for (const word of words) {
      await this.chips(group).getByRole('button', { name: word, exact: true }).first().tap();
    }
  }

  answerLine(): Locator {
    return this.exercise.getByRole('group', { name: 'Deine Antwort' });
  }

  answerField(lang: 'sq' | 'de'): Locator {
    const name = lang === 'sq' ? 'Deine Antwort auf Gheg' : 'Deine Antwort auf Deutsch';
    return this.exercise.getByRole('textbox', { name, exact: true });
  }

  gapField(): Locator {
    return this.exercise.getByRole('textbox', { name: 'Lücke', exact: true });
  }

  /**
   * Types `text` into the field; ë, ç, â, ê, î, ô, û (also upper case) come from the special-character
   * bar when `useBar` is set. Returns how many characters were entered through the bar.
   */
  async typeAnswer(field: Locator, text: string, { useBar }: { useBar: boolean }): Promise<number> {
    await field.click();
    const shift = this.specialChars.getByRole('button', { name: 'Grossbuchstaben' });
    let fromBar = 0;
    for (const char of text) {
      if (!useBar || !isSpecialChar(char)) {
        await this.page.keyboard.type(char);
        continue;
      }
      await this.setShift(shift, char !== char.toLocaleLowerCase('sq'));
      await this.specialChars.getByRole('button', { name: `${char} einfügen`, exact: true }).tap();
      fromBar += 1;
    }
    if (fromBar > 0) await this.setShift(shift, false);
    await expect(field).toHaveValue(text);
    await expect(field, 'the bar keeps the cursor in the field').toBeFocused();
    return fromBar;
  }

  /**
   * Tries the special-character bar on an empty field: "ë", then a shifted "Ç" go in at the cursor,
   * the focus stays, then the field is cleared again. Returns how many characters came from the bar.
   */
  async tryOutSpecialChars(field: Locator): Promise<number> {
    await expect(field).toHaveValue('');
    const tried = 'ëÇ';
    const fromBar = await this.typeAnswer(field, tried, { useBar: true });
    await field.fill('');
    return fromBar;
  }

  /** The text field of a typed exercise: the gap, or the answer field in the answer language. */
  textField(exercise: LessonExercise): Locator {
    return exercise.type === 'fill_gap' ? this.gapField() : this.answerField(exercise.answerLang ?? 'sq');
  }

  private async setShift(shift: Locator, on: boolean): Promise<void> {
    if ((await shift.getAttribute('aria-pressed')) === String(on)) return;
    await shift.tap();
    await expect(shift).toHaveAttribute('aria-pressed', String(on));
  }

  pairTile(side: PairSide, word: string): Locator {
    return this.exercise
      .getByRole('group', { name: side })
      .getByRole('button', { name: word, exact: true });
  }

  /**
   * Matches every pair without a mistake. `midway` runs once the first pair is matched and the next
   * Gheg tile is selected, so a screenshot shows matched, selected and open tiles at once.
   */
  async matchPairs(
    pairs: readonly { left: string; right: string }[],
    midway: () => Promise<void>,
  ): Promise<void> {
    for (const [index, pair] of pairs.entries()) {
      const left = this.pairTile('Gheg', pair.left);
      await left.tap();
      await expect(left).toHaveAttribute('aria-pressed', 'true');
      if (index === 1) await midway();
      await this.pairTile('Deutsch', pair.right).tap();
      // A matched pair flashes green, then both tiles are locked.
      await expect(this.exercise.getByRole('button', { name: pair.left, exact: true })).toBeDisabled();
    }
  }

  /**
   * Enters the answer of every type except match_pairs (see `matchPairs`); returns how many
   * characters were typed through the special-character bar.
   */
  async enterAnswer(exercise: LessonExercise, intent: Intent): Promise<number> {
    if (intent === 'wrong' && !canAnswerWrong(exercise)) {
      throw new Error(`${exercise.id} (${exercise.type}) cannot be answered wrong for sure`);
    }
    switch (exercise.type) {
      case 'multiple_choice':
        await this.chooseOption(choiceFor(exercise, intent));
        return 0;
      case 'translate_wordbank': {
        const chips = firstBuildableChips(solutionsOf(exercise), exercise.wordBank ?? []);
        await this.tapChips('Wortbausteine', chips);
        await expect(this.answerLine().getByRole('button')).toHaveText(chips);
        return 0;
      }
      case 'word_order': {
        const tokens = exercise.tokens ?? [];
        await this.tapChips('Wortbausteine', tokens);
        await expect(this.answerLine().getByRole('button')).toHaveText(tokens);
        return 0;
      }
      case 'fill_gap':
        if (exercise.choices) {
          const choice = choiceFor(exercise, intent);
          await this.tapChips('Antwortmöglichkeiten', [choice]);
          await expect(this.exercise.getByRole('group', { name: 'Lücke' })).toHaveText(choice);
          return 0;
        }
        return this.typeText(exercise, intent);
      case 'translate_free':
        return this.typeText(exercise, intent);
      case 'match_pairs':
        throw new Error('Match pairs are answered by matchPairs');
    }
  }

  /** A learner who types "almost" right skips the special characters; the others use the bar. */
  private typeText(exercise: LessonExercise, intent: Intent): Promise<number> {
    const useBar = exercise.answerLang === 'sq' && intent !== 'almost';
    return this.typeAnswer(this.textField(exercise), textFor(exercise, intent), { useBar });
  }

  async check(): Promise<void> {
    await expect(this.checkButton).toBeEnabled();
    await this.checkButton.click();
  }

  async continueFrom(sheet: Locator): Promise<void> {
    await sheet.getByRole('button', { name: 'Weiter' }).click();
    await expect(sheet).toBeHidden();
  }
}
