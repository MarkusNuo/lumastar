import { expect, type Locator, type Page } from '@playwright/test';
import { AppShell } from './AppShell.ts';

export const STATS_SECTIONS = [
  'Niveau',
  'Können pro Bereich',
  'Häufigste Fehler',
  'Lerntage',
  'Wiederholungen',
] as const;
export type StatsSection = (typeof STATS_SECTIONS)[number];

/** A summary card of the top row: the label on its face, the value below. */
export type SummaryCard = 'Streak' | 'Rekord' | 'Wörter';

/**
 * Tab "Statistik" (/statistik): streak and learned words, the level with the way to the next
 * stage, mastery per area, the top errors with "Gezielt üben", the heatmap and the FSRS forecast.
 */
export class StatsPage {
  readonly page: Page;
  readonly shell: AppShell;
  readonly heading: Locator;
  /** One cell per day of the heatmap, with data-level (none, practised, goal, frozen). */
  readonly heatmapCells: Locator;
  readonly heatmapToday: Locator;
  readonly heatmapScroller: Locator;
  /** The columns of the forecast, today first. */
  readonly forecastBars: Locator;
  readonly reviewButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.heading = page.getByRole('heading', { name: 'Statistik', level: 1 });
    this.heatmapCells = page.getByTestId('heatmap-grid').locator('[data-level]');
    this.heatmapToday = page.getByTestId('heatmap-grid').locator('[data-today]');
    this.heatmapScroller = page.getByTestId('heatmap-scroller');
    this.forecastBars = this.section('Wiederholungen')
      .getByRole('list', { name: 'Fällige Karten in den nächsten 7 Tagen' })
      .getByRole('listitem');
    this.reviewButton = this.section('Wiederholungen').getByRole('button', { name: 'Jetzt wiederholen' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/statistik');
    await this.expectVisible();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/statistik$/);
    await expect(this.heading).toBeVisible();
    await expect(this.shell.navLink('Statistik')).toHaveAttribute('aria-current', 'page');
    for (const title of STATS_SECTIONS) await expect(this.section(title)).toBeVisible();
  }

  section(title: StatsSection): Locator {
    return this.page.getByRole('main').getByRole('region', { name: title, exact: true });
  }

  /** A card of the summary row; its value is read out as e.g. "Streak: 1 Tag". */
  summaryCard(label: SummaryCard): Locator {
    return this.page.getByRole('main').getByText(label, { exact: true }).locator('xpath=..');
  }

  /** The rows of "Häufigste Fehler", most frequent first. */
  errorRows(): Locator {
    return this.section('Häufigste Fehler').getByRole('listitem');
  }

  practiceButton(label: string): Locator {
    return this.section('Häufigste Fehler').getByRole('button', { name: `Gezielt üben: ${label}`, exact: true });
  }
}
