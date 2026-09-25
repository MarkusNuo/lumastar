import { expect, type Locator, type Page } from '@playwright/test';

/** Public component catalog (/dev/ui) of the design system (PRD 12.5). */
export class CatalogPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly sectionNav: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Komponenten-Katalog', level: 1 });
    this.sectionNav = page.getByRole('navigation', { name: 'Abschnitte' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/dev/ui');
    await expect(this.heading).toBeVisible();
  }

  section(title: string): Locator {
    return this.page.getByRole('region', { name: title, exact: true });
  }

  sectionHeading(title: string): Locator {
    return this.section(title).getByRole('heading', { name: title, level: 2, exact: true });
  }

  /** Jumps to a section through the sticky section navigation. */
  async jumpTo(title: string): Promise<Locator> {
    await this.sectionNav.getByRole('link', { name: title, exact: true }).click();
    const section = this.section(title);
    await expect(this.sectionHeading(title)).toBeInViewport();
    return section;
  }

  /** Opens the feedback sheet from the trigger button of the feedback section. */
  async openFeedbackSheet(trigger: string, title: string): Promise<Locator> {
    await this.section('Feedback').getByRole('button', { name: trigger, exact: true }).click();
    const sheet = this.page.getByRole('dialog', { name: title });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Weiter' })).toBeFocused();
    return sheet;
  }
}
