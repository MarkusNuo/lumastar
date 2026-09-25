import { expect, type Locator, type Page } from '@playwright/test';

/** A catalog section as listed in the section navigation: anchor id (e.g. "buttons") and title. */
export interface CatalogSectionLink {
  id: string;
  title: string;
}

/** Public component catalog (/dev/ui) of the design system (PRD 12.5). */
export class CatalogPage {
  /**
   * Screenshot-only CSS: the sticky catalog header would otherwise cover the top of a section that is
   * taller than the viewport. Sticky and static take the same space, so the layout does not change.
   */
  static readonly UNSTICK_HEADER = 'header:has(nav[aria-label="Abschnitte"]) { position: static !important; }';

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

  /** Every section of the navigation, in order; the id comes from the link target "#<id>". */
  async sectionLinks(): Promise<CatalogSectionLink[]> {
    const links = await this.sectionNav.getByRole('link').all();
    return Promise.all(
      links.map(async (link) => ({
        id: ((await link.getAttribute('href')) ?? '').replace(/^#/, ''),
        title: ((await link.textContent()) ?? '').trim(),
      })),
    );
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
