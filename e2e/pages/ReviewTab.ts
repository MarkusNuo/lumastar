import { expect, type Locator, type Page } from '@playwright/test';
import { dueLabel, type ReviewSummary } from '../support/reviewApi.ts';
import { AppShell } from './AppShell.ts';

const count = (value: number) => value.toLocaleString('de-CH');

/** Tab "Wiederholen" (/wiederholen, PRD F8, 12.3): what is due, as a lesson of its own. */
export class ReviewTab {
  readonly page: Page;
  readonly shell: AppShell;
  readonly heading: Locator;
  readonly startButton: Locator;
  readonly learnButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = new AppShell(page);
    this.heading = page.getByRole('heading', { name: 'Wiederholen', level: 1 });
    this.startButton = page.getByRole('button', { name: 'Wiederholung starten' });
    this.learnButton = page.getByRole('button', { name: 'Neue Lektion lernen' });
  }

  /** The card of the tab, named after its headline, e.g. "12 Wörter fällig" or "Alles wiederholt!". */
  summary(name: string): Locator {
    return this.page.getByRole('main').getByRole('region', { name, exact: true });
  }

  /** A stat card of the summary: the label on its face, the value below. */
  stat(label: 'Morgen fällig' | 'Wörter gesamt'): Locator {
    return this.page.getByRole('main').getByText(label, { exact: true }).locator('xpath=..');
  }

  /** The count on the navigation tab and the description a screen reader reads after its name. */
  async expectNavBadge(dueNow: number): Promise<void> {
    const tab = this.shell.navLink('Wiederholen');
    const badge = tab.getByTestId('nav-badge');
    if (dueNow === 0) {
      await expect(badge).toHaveCount(0);
      await expect(tab).toHaveAccessibleDescription('');
      return;
    }
    await expect(badge).toHaveText(dueNow > 99 ? '99+' : String(dueNow));
    await expect(tab).toHaveAccessibleDescription(dueLabel(dueNow));
  }

  /** Something is due: the count as the headline, tomorrow and total below, "Wiederholung starten". */
  async expectDue(summary: ReviewSummary): Promise<void> {
    const words = summary.dueNow === 1 ? 'Wort' : 'Wörter';
    const card = this.summary(`${count(summary.dueNow)} ${words} fällig`);
    await expect(card).toBeVisible();
    await this.expectStats(summary);
    await expect(this.startButton).toBeEnabled();
    await expect(this.learnButton).toHaveCount(0);
  }

  /** Everything reviewed: no dead button, but the way to new content (PRD F8). */
  async expectAllDone(summary: ReviewSummary): Promise<void> {
    const card = this.summary('Alles wiederholt!');
    await expect(card).toBeVisible();
    await expect(card).toContainText(
      summary.dueTomorrow > 0 ? `Morgen fällig: ${summary.dueTomorrow}` : 'Morgen ist nichts fällig.',
    );
    await this.expectStats(summary);
    await expect(this.startButton, 'nothing to start').toHaveCount(0);
    await expect(this.learnButton).toBeEnabled();
  }

  private async expectStats(summary: ReviewSummary): Promise<void> {
    await expect(this.stat('Morgen fällig')).toContainText(count(summary.dueTomorrow));
    await expect(this.stat('Wörter gesamt')).toContainText(count(summary.totalCards));
  }
}
