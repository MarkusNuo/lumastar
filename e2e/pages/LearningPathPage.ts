import { expect, type Locator, type Page } from '@playwright/test';
import { currentUnit, fetchPath, type PathUnit } from '../support/planApi.ts';
import { escapeRegExp } from '../support/regex.ts';

/** Home tab (/): the personal learning path with stages, unit banners and lesson nodes (PRD 12.3). */
export class LearningPathPage {
  readonly page: Page;
  /** The next lesson: it pulses with the "Start" bubble; its name ends with "als Nächstes". */
  readonly currentNode: Locator;
  /** The card at the top that opens the plan timeline. */
  readonly planTeaser: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentNode = page.getByRole('main').locator('button[aria-current="step"]');
    this.planTeaser = page.getByRole('link', { name: /Dein Lernplan/ });
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
    await expect(this.page.getByRole('heading', { name: 'Lernpfad', level: 1 })).toBeAttached();
    await expect(this.planTeaser).toBeVisible();
  }

  /** A stage of the plan, e.g. "A0 · Erste Schritte", with its units and its checkpoint. */
  stage(level: string, title: string): Locator {
    return this.page.getByRole('region', { name: `${level} · ${title}`, exact: true });
  }

  /**
   * The stage passed last, collapsed with its trophy above the current one (PRD 12.3), named e.g.
   * "A0 · Erste Schritte, bestanden".
   */
  passedStage(level: string, title: string): Locator {
    return this.page.getByRole('region', { name: `${level} · ${title}, bestanden`, exact: true });
  }

  /** A unit: its banner (the title is a level-3 heading) and its lesson nodes. */
  unit(title: string): Locator {
    return this.page.getByRole('region', { name: title, exact: true });
  }

  /**
   * The lesson nodes of a unit, named "Lektion <n>, <status>" (e.g. "Lektion 1, als Nächstes"); a
   * focus unit names them "Fokus-Lektion <n>, …".
   */
  lessonNodes(unit: Locator): Locator {
    return unit.getByRole('listitem').getByRole('button', { name: /^(Fokus-)?Lektion \d+, / });
  }

  /** The test at the end of a stage, e.g. "Checkpoint A0, gesperrt". */
  checkpoint(level: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^Checkpoint ${escapeRegExp(level)}, `) });
  }

  /**
   * The node of the next lesson of a unit: the current one, or an open one while a checkpoint is the
   * next step of the path (the lessons after it stay playable).
   */
  nextLessonNode(unit: PathUnit): Locator {
    const kind = unit.focus ? 'Fokus-Lektion' : 'Lektion';
    return this.unit(unit.title).getByRole('button', {
      name: new RegExp(`^${kind} ${unit.lessonsCompleted + 1}, (als Nächstes|verfügbar)$`),
    });
  }

  /** Starts the next lesson of the unit in progress from the path, as a learner does. */
  async startCurrentLesson(): Promise<void> {
    const node = this.nextLessonNode(currentUnit(await fetchPath(this.page.request)));
    await node.scrollIntoViewIfNeeded();
    await node.tap();
  }
}
