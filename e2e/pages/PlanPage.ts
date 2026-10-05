import { expect, type Locator, type Page } from '@playwright/test';
import { BANDS, PLAN_CHANGE_LABELS, type Band, type PlanChange } from '../support/planApi.ts';

/** The plan (/plan): a timeline of the CEFR bands up to C2 and the "Plan-Verlauf" (PRD F3, 12.3). */
export class PlanPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly timeline: Locator;
  readonly history: Locator;
  readonly toPathButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dein Lernplan', level: 1 });
    this.timeline = page.getByRole('list', { name: 'Zeitleiste bis C2' });
    this.history = page.getByRole('region', { name: 'Plan-Verlauf' });
    this.toPathButton = page.getByRole('button', { name: 'Zum Lernpfad', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/plan');
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/plan$/);
    await expect(this.heading).toBeVisible();
    await expect(this.timeline).toBeVisible();
  }

  /** The entry of a band; nested unit rows carry no level-2 heading, so only the band matches. */
  band(band: Band): Locator {
    return this.timeline
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('heading', { name: `${band} · ${BANDS[band]}`, level: 2 }) });
  }

  /** Shows or hides the stages and units of a band ("4 Einheiten anzeigen"). */
  unitsToggle(band: Band): Locator {
    return this.band(band).getByRole('button', { name: /^(\d+ Einheiten? anzeigen|Einheiten ausblenden)$/ });
  }

  /** The last entry of the timeline: the target level with its expected day. */
  goal(targetLevel: string): Locator {
    return this.timeline.getByRole('listitem').filter({ hasText: `Ziel: ${targetLevel}` });
  }

  historyEntries(): Locator {
    return this.history.getByRole('listitem');
  }

  /** The history shows the changes of the API in its order, each with its kind and reason. */
  async expectHistory(changes: readonly PlanChange[]): Promise<void> {
    const entries = this.historyEntries();
    await expect(entries).toHaveCount(changes.length);
    for (const [index, change] of changes.entries()) {
      const entry = entries.nth(index);
      await expect(entry.getByText(PLAN_CHANGE_LABELS[change.type], { exact: true })).toBeVisible();
      await expect(entry.getByText(change.reason, { exact: true })).toBeVisible();
      await expect(entry.locator('time')).toHaveAttribute('datetime', change.changedAt);
    }
  }
}
