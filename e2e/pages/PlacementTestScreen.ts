import { expect, type Locator, type Page } from '@playwright/test';
import type { PlacementAnswer } from '../support/placementApi.ts';
import { LessonPlayer } from './LessonPlayer.ts';

/**
 * The placement test (/einstufung/test): one item per screen in the exercise components of the
 * lesson player, but without "Prüfen" and without a verdict: "Weiter" moves on.
 */
export class PlacementTestScreen {
  readonly page: Page;
  /** The exercise components are the lesson player's. */
  readonly player: LessonPlayer;
  readonly progress: Locator;
  readonly closeButton: Locator;
  readonly nextButton: Locator;
  /** Any feedback sheet; the test never shows one. */
  readonly feedback: Locator;

  constructor(page: Page) {
    this.page = page;
    this.player = new LessonPlayer(page);
    this.progress = page.getByRole('progressbar', { name: 'Fortschritt der Einstufung' });
    this.closeButton = page.getByRole('button', { name: 'Einstufung abbrechen' });
    this.nextButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.feedback = page.getByRole('dialog');
  }

  /** The item on screen at its position, e.g. "Frage 2 von höchstens 20". */
  async expectItem(id: string, position: number, maxItems: number): Promise<void> {
    await expect(this.page).toHaveURL(/\/einstufung\/test$/);
    await expect(this.player.exercise).toHaveAttribute('data-exercise-id', id);
    await expect(this.progress).toHaveAttribute(
      'aria-valuetext',
      `Frage ${position} von höchstens ${maxItems}`,
    );
    await expect(this.progress).toHaveAttribute('aria-valuenow', String(position - 1));
    await expect(this.nextButton, 'nothing to send yet').toBeDisabled();
  }

  async enter(answer: PlacementAnswer): Promise<void> {
    const player = this.player;
    switch (answer.kind) {
      case 'option':
        await player.chooseOption(answer.choice);
        break;
      case 'gap-chip':
        await player.tapChips('Antwortmöglichkeiten', [answer.choice]);
        break;
      case 'chips':
        await player.tapChips('Wortbausteine', answer.chips);
        await expect(player.answerLine().getByRole('button')).toHaveText(answer.chips);
        break;
      case 'text': {
        const field = player.exercise.getByRole('textbox');
        await field.fill(answer.text);
        break;
      }
    }
    await expect(this.nextButton).toBeEnabled();
  }
}
