import { expect, type Locator, type Page } from '@playwright/test';

/** Home tab (/): the learning path with its unit banners and lesson nodes (PRD 12.3). */
export class LearningPathPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { name: 'Lernpfad' })).toBeAttached();
  }

  /**
   * The unit's section: its banner and its list of lesson nodes. The unit section has no accessible
   * name, so it is told apart from the banner (no list) and the stage around it (a level-2 heading).
   */
  unit(title: string): Locator {
    const page = this.page;
    return page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: title, level: 3, exact: true }) })
      .filter({ has: page.getByRole('list') })
      .filter({ hasNot: page.getByRole('heading', { level: 2 }) });
  }

  /** Node "Lektion <n>"; its accessible name ends with the status, e.g. "Lektion 1, als Nächstes". */
  lessonNode(unitTitle: string, lesson: number): Locator {
    return this.unit(unitTitle).getByRole('button', { name: new RegExp(`^Lektion ${lesson},`) });
  }
}
