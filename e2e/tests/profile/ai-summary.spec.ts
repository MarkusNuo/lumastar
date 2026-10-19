import { expect, test } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { readSkillTagLabels } from '../../support/content.ts';
import { choiceFor, solutionsOf } from '../../support/lessonAnswers.ts';
import { fetchMe, type LessonExercise } from '../../support/lessonApi.ts';
import { playLessonInUi } from '../../support/lessonFlow.ts';
import { LEARNER } from '../../support/learner.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchSummary, isSummaryRequest } from '../../support/profileApi.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * "KI-Zusammenfassung kopieren" and "Zusammenfassung ansehen": after a lesson with one
 * wrong answer the summary frames the request for the AI, names the level and the current unit, lists
 * strengths and weaknesses as "<skill> <mastery> %" and shows that mistake with its task first.
 */

const HEADING = `Lernstand ${LEARNER.displayName} – \\d{2}\\.\\d{2}\\.\\d{4} \\(Gheg, Kosovo\\)`;
const COPIED = 'Kopiert! Füge sie in einen KI-Chat ein.';
const FRAMING =
  'Ich spreche Deutsch und lerne Gheg-Albanisch (Kosovo). Bitte antworte auf Deutsch und verwende auf Albanisch nur Gheg-Formen, keine Standard-Formen (z. B. *âsht* statt *është*).';
const TYPICAL_ERRORS = '- Letzte typische Fehler:\n';
/** The summary lists up to three skills per line. */
const LISTED_SKILLS = 3;

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

/** The summary writes a text on one line, its lines joined by " / ", and without its final period. */
const inline = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' / ')
    .replace(/\.$/u, '');

/** "- Stärken: Grundwortschatz 88 %, Begrüssungen 75 %" or "- Stärken: noch keine". */
function skillsLine(name: 'Stärken' | 'Schwächen'): RegExp {
  const label = readSkillTagLabels().map(escapeRegExp).join('|');
  const skill = `(?:${label}) \\d{1,3} %`;
  return new RegExp(`^- ${name}: (?:noch keine|${skill}(?:, ${skill}){0,${LISTED_SKILLS - 1}})$`);
}

/** The latest typical error: '  - Aufgabe „<prompt>“: „<given>“ → „<solution>“ (<category>)'. */
function latestTypicalError(exercise: LessonExercise): RegExp {
  const literal = (text: string) => escapeRegExp(inline(text));
  const solution = solutionsOf(exercise).map(literal).join('|');
  return new RegExp(
    `^  - Aufgabe „${literal(exercise.prompt.text)}“: „${literal(choiceFor(exercise, 'wrong'))}“ ` +
      `→ „(?:${solution})“ \\([^()]+\\)\n`,
    'u',
  );
}

test('after a lesson the AI summary is copied to the clipboard and shown formatted in a sheet', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  const profile = new ProfilePage(page);
  const { wrongExercise } = await playLessonInUi(page);
  const me = await fetchMe(page.request);
  const path = await fetchPath(page.request);
  const unit = currentUnit(path);
  const unitLevel = path.stages.find((stage) => stage.units.includes(unit))?.level;
  const level = `Niveau: ${me.currentLevel ?? 'noch nicht eingestuft'} (Ziel C2)`;

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
    const [title, framing, blank, ...lines] = copied.split('\n');
    expect(copied.startsWith('# Lernstand')).toBe(true);
    expect(title, JSON.stringify(title)).toMatch(new RegExp(`^# ${HEADING}$`));
    expect(framing, 'it asks the AI for German answers and Gheg forms only').toBe(FRAMING);
    expect(blank).toBe('');
    expect(lines[0]?.startsWith(`- ${level},`), `the level comes first: ${lines[0]}`).toBe(true);
    expect(lines[1], 'the unit the path continues with').toBe(
      `- Aktuelle Einheit: ${unit.title} (${unitLevel})`,
    );
    expect(lines[2], 'strengths as "<skill> <mastery> %"').toMatch(skillsLine('Stärken'));
    expect(lines[3], 'weaknesses as "<skill> <mastery> %"').toMatch(skillsLine('Schwächen'));
    expect(lines[4]).toMatch(/^- Häufige Fehler \(\d+ Tage\): /);
    const errors = copied.indexOf(TYPICAL_ERRORS);
    expect(errors, 'the typical errors close the list').toBe(copied.lastIndexOf('\n- ') + 1);
    expect(
      copied.slice(errors + TYPICAL_ERRORS.length),
      'the wrong answer of the lesson comes first, after the task it belongs to',
    ).toMatch(latestTypicalError(wrongExercise));
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
    await expect(errors.getByRole('list').getByRole('listitem').first()).toContainText(
      /^Aufgabe „.+“: „.+“ → „.+“ \(.+\)$/su,
    );
    await expect(sheet.getByRole('button', { name: 'Kopieren', exact: true })).toBeVisible();
    await expect(sheet).toBeInViewport();
    await snap(page, 'profile-summary-sheet', { fullPage: false });

    await sheet.getByRole('button', { name: 'Schliessen' }).click();
    await expect(sheet).toBeHidden();
    await expect(profile.action('Zusammenfassung ansehen'), 'focus returns to the row').toBeFocused();
  });
});
