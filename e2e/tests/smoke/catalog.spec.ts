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

test('the catalog feedback section opens and closes the feedback sheet', async ({ page }) => {
  const catalog = new CatalogPage(page);
  await catalog.goto();

  const section = await catalog.jumpTo('Feedback');
  await snap(page, 'catalog-feedback', { element: section });

  const sheet = await catalog.openFeedbackSheet('Standard', 'Richtig, aber Standard');
  await expect(sheet).toContainText('Shpija âsht e madhe.');
  await snap(page, 'catalog-feedback-sheet', { fullPage: false });

  await sheet.getByRole('button', { name: 'Weiter' }).click();
  await expect(sheet).toBeHidden();
});
