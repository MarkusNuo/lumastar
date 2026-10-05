import type { Locator, Page } from '@playwright/test';
import type { LessonKind } from '../support/lessonApi.ts';

export type StatLabel = 'XP' | 'Genauigkeit' | 'Zeit';

/** The title per lesson kind; a lesson without a mistake is "Fehlerfrei!" instead. */
export const RESULT_TITLES: Record<Exclude<LessonKind, 'checkpoint'>, string> = {
  lesson: 'Lektion geschafft!',
  focus: 'Fokus-Lektion geschafft!',
  review: 'Wiederholung geschafft!',
  practice: 'Gezielt geübt!',
};
export const PERFECT_TITLE = 'Fehlerfrei!';

/** Lesson end (PRD F5, 12.3): title, XP, accuracy and time cards, practised words. */
export class LessonResultScreen {
  readonly page: Page;
  /** The title of any lesson kind; a checkpoint ends on its own screen (CheckpointResultScreen). */
  readonly heading: Locator;
  readonly continueButton: Locator;
  /** Collapses the expanded list of practised words again. */
  readonly showFewerWordsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    const titles = [...Object.values(RESULT_TITLES), PERFECT_TITLE];
    this.heading = page.getByRole('heading', { name: new RegExp(`^(${titles.join('|')})$`), level: 1 });
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.showFewerWordsButton = page.getByRole('button', { name: 'Weniger anzeigen', exact: true });
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
