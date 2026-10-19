import { expect, type Locator, type Page } from '@playwright/test';

export type PlacementIntroKind = 'first' | 'replacement';

const TITLES: Record<PlacementIntroKind, string> = {
  first: 'Finden wir dein Niveau',
  replacement: 'Neu einstufen',
};

/** Placement intro (/einstufung): before the first test and for "Neu einstufen". */
export class PlacementIntroPage {
  readonly page: Page;
  readonly startButton: Locator;
  /** "Ich kann kein Wort" may start at A0 without the test, but only before the first placement. */
  readonly skipButton: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.startButton = page.getByRole('button', { name: 'Test starten', exact: true });
    this.skipButton = page.getByRole('button', { name: 'Ich fange bei null an', exact: true });
    this.backButton = page.getByRole('button', { name: 'Zurück', exact: true });
  }

  heading(kind: PlacementIntroKind): Locator {
    return this.page.getByRole('heading', { name: TITLES[kind], level: 1 });
  }

  async expectVisible(kind: PlacementIntroKind): Promise<void> {
    await expect(this.page).toHaveURL(/\/einstufung$/);
    await expect(this.heading(kind)).toBeVisible();
    await expect(this.page.getByText('ca. 5–8 Minuten')).toBeVisible();
    await expect(this.startButton).toBeEnabled();
  }
}
