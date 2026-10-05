import type { Locator, Page } from '@playwright/test';

export type StatLabel = 'XP' | 'Genauigkeit' | 'Zeit';

/** Lesson end (PRD F5, 12.3): title, XP, accuracy and time cards, practised words. */
export class LessonResultScreen {
  readonly page: Page;
  readonly heading: Locator;
  readonly continueButton: Locator;
  /** Collapses the expanded list of practised words again. */
  readonly showFewerWordsButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', {
      name: /^(Lektion geschafft!|Fehlerfrei!)$/,
      level: 1,
    });
    this.continueButton = page.getByRole('button', { name: 'Weiter', exact: true });
    this.showFewerWordsButton = page.getByRole('button', { name: 'Weniger anzeigen', exact: true });
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
