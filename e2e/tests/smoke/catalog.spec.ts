import { expect, test } from '@playwright/test';
import { CatalogPage } from '../../pages/CatalogPage.ts';
import { snap } from '../../support/screenshots.ts';

test('the component catalog renders every section of its navigation', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  const titles = await catalog.sectionNav.getByRole('link').allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const title of titles) {
    await expect(catalog.sectionHeading(title)).toBeVisible();
  }
  await snap(page, 'catalog-top', { fullPage: false });
});

test('every catalog section is captured for the design review', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  const sections = await catalog.sectionLinks();
  expect(sections.length).toBeGreaterThan(0);
  for (const { id, title } of sections) {
    await test.step(title, async () => {
      expect(id, `anchor id of section "${title}"`).toMatch(/^[a-z0-9-]+$/);
      const section = catalog.section(title);
      await section.scrollIntoViewIfNeeded();
      await expect(catalog.sectionHeading(title)).toBeVisible();
      await snap(page, `catalog-${id}`, { element: section, style: CatalogPage.UNSTICK_HEADER });
    });
  }
});

test('the catalog feedback section opens and closes the feedback sheet', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  await catalog.jumpTo('Feedback');
  const sheet = await catalog.openFeedbackSheet('Standard', 'Richtig, aber Standard');
  await expect(sheet).toContainText('Shpija âsht e madhe.');
  await snap(page, 'catalog-feedback-sheet', { fullPage: false });

  await sheet.getByRole('button', { name: 'Weiter' }).click();
  await expect(sheet).toBeHidden();
});
