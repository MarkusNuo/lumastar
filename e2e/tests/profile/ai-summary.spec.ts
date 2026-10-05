import { expect, test } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { choiceFor } from '../../support/lessonAnswers.ts';
import { fetchMe } from '../../support/lessonApi.ts';
import { playLessonInUi } from '../../support/lessonFlow.ts';
import { LEARNER } from '../../support/learner.ts';
import { fetchSummary, isSummaryRequest } from '../../support/profileApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * "KI-Zusammenfassung kopieren" and "Zusammenfassung ansehen" (PRD F11, 8.3): after a lesson with one
 * wrong answer the summary names the level and shows that mistake as a typical error.
 */

const UNIT = 'Begrüssung & Höflichkeit';
const HEADING = `Lernstand ${LEARNER.displayName} – \\d{2}\\.\\d{2}\\.\\d{4} \\(Gheg, Kosovo\\)`;
const COPIED = 'Kopiert! Füge sie in einen KI-Chat ein.';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** The summary writes a sentence without its final period. */
const withoutFinalPeriod = (text: string) => text.trim().replace(/\.$/u, '');

test('after a lesson the AI summary is copied to the clipboard and shown formatted in a sheet', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  const profile = new ProfilePage(page);
  const { wrongExercise } = await playLessonInUi(page, UNIT);
  const me = await fetchMe(page.request);
  const level = `Niveau: ${me.currentLevel ?? 'noch nicht eingestuft'} (Ziel C2)`;
  const typicalError = `„${withoutFinalPeriod(choiceFor(wrongExercise, 'wrong'))}“ → „`;

  await test.step('profile tab', async () => {
    await profile.goto();
    await expect(profile.xpChip(me.xpTotal)).toBeVisible();
    await expect(profile.levelChip(me.currentLevel)).toBeVisible();
    await snap(page, 'profile-learning-data', { fullPage: false });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(profile.shell.logoutButton).toBeInViewport();
    await expect(profile.shell.bottomNav).toBeInViewport();
    await snap(page, 'profile-learning-data-scrolled', { fullPage: false });
  });

  await test.step('KI-Zusammenfassung kopieren', async () => {
    const loaded = page.waitForResponse(isSummaryRequest);
    await profile.action('KI-Zusammenfassung kopieren').click();
    expect((await loaded).status()).toBe(200);
    await expect(profile.toast(COPIED)).toBeVisible();
    await expect(profile.summarySheet, 'copying needs no sheet').toBeHidden();

    // The Windows clipboard stores line breaks as CRLF; the text itself is the same.
    const copied = (await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, '\n');
    const [title, ...lines] = copied.split('\n');
    expect(copied.startsWith('# Lernstand')).toBe(true);
    expect(title, JSON.stringify(title)).toMatch(new RegExp(`^# ${HEADING}$`));
    expect(lines[0]?.startsWith(`- ${level},`), `the level comes first: ${lines[0]}`).toBe(true);
    expect(lines.some((line) => line.startsWith('- Stärken: '))).toBe(true);
    expect(lines.some((line) => line.startsWith('- Schwächen: '))).toBe(true);
    expect(lines).toContain('- Letzte typische Fehler:');
    expect(copied, 'the wrong answer of the lesson is a typical error').toContain(typicalError);
    expect(copied, 'the clipboard holds exactly the summary').toBe(await fetchSummary(page.request));
    await snap(page, 'profile-copied-toast', { fullPage: false });
  });

  await test.step('Zusammenfassung ansehen', async () => {
    await profile.action('Zusammenfassung ansehen').click();
    const sheet = profile.summarySheet;
    await expect(sheet).toBeVisible();
    // The Markdown "#" sits below the sheet title (h2), so the outline stays intact.
    await expect(sheet.getByRole('heading', { level: 3 })).toHaveText(new RegExp(`^${HEADING}$`));
    const facts = sheet.getByRole('list').first();
    await expect(facts.getByRole('listitem').first()).toContainText(level);
    const errors = facts.getByRole('listitem').filter({ hasText: /^Letzte typische Fehler:/ });
    await expect(errors.getByRole('list').getByRole('listitem').first()).toContainText('→');
    await expect(sheet.getByRole('button', { name: 'Kopieren', exact: true })).toBeVisible();
    await expect(sheet).toBeInViewport();
    await snap(page, 'profile-summary-sheet', { fullPage: false });

    await sheet.getByRole('button', { name: 'Schliessen' }).click();
    await expect(sheet).toBeHidden();
    await expect(profile.action('Zusammenfassung ansehen'), 'focus returns to the row').toBeFocused();
  });
});
