import { expect, test, type APIRequestContext, type Locator } from '@playwright/test';
import { streakText } from '../../pages/AppShell.ts';
import { LessonPlayer } from '../../pages/LessonPlayer.ts';
import { LessonResultScreen } from '../../pages/LessonResultScreen.ts';
import { StatsPage, type StatsSection } from '../../pages/StatsPage.ts';
import { mostWrongableTag } from '../../support/lessonAnswers.ts';
import { finishViaApi, startViaApi, type LessonExercise, type LessonResponse } from '../../support/lessonApi.ts';
import { openLesson, playOpenedLesson } from '../../support/lessonFlow.ts';
import { fetchPath, unitOfLearnerStage } from '../../support/planApi.ts';
import { fetchTodayProgress } from '../../support/progressApi.ts';
import { escapeRegExp } from '../../support/regex.ts';
import { scrollToTop, snap } from '../../support/screenshots.ts';
import {
  FORECAST_DAYS,
  HEATMAP_DAYS,
  TOP_ERRORS,
  fetchStats,
  type FrequentError,
  type HeatmapDay,
  type Stats,
} from '../../support/statsApi.ts';

/*
 * The tab "Statistik" (PRD F10): the streak and learned words, the level with the way to the next
 * stage, mastery per area, the five most frequent errors with "Gezielt üben", the learning days of
 * the last year and the FSRS forecast. Each test first makes mistakes on one skill tag of the
 * learner's stage through the API, so the top errors have an entry it added to, whatever ran before.
 */

const TOP_BAR_GAP = 88;
/** Lessons with mistakes on the tag before it must be among the top errors. */
const MAX_MISTAKE_LESSONS = 4;

/** "72 %" with the no-break space of the app, or any space. */
const percentText = (share: number) => new RegExp(`^${Math.round(share * 100)}\\s%$`, 'u');

/** How the heatmap paints a day: a bridged day by its frame, then a met goal, then any practice. */
function heatLevel(day: HeatmapDay): string {
  if (day.frozen) return 'frozen';
  if (day.goalMet) return 'goal';
  return day.minutes > 0 || day.lessons > 0 ? 'practised' : 'none';
}

/**
 * The tag to make mistakes on: one the lesson can answer wrong that is a practisable top error
 * already, the most frequent first, since more mistakes keep it there. Late in a run the errors of
 * earlier tests outrank a fresh tag for many lessons; only without such a tag the lesson's most
 * wrongable one starts from nothing.
 */
function tagToMiss(exercises: readonly LessonExercise[], topErrors: readonly FrequentError[]): string | undefined {
  const listed = topErrors.filter((error) => error.practice).map((error) => error.skillTag);
  return listed.find((tag) => mostWrongableTag(exercises, tag)) ?? mostWrongableTag(exercises)?.tag;
}

/**
 * Plays lessons of a unit of the learner's stage through the API, every exercise of one skill tag
 * answered wrong (and right on its retry), until the tag is among the top errors with a practice
 * lesson. Returns the tag's entry, which counts the mistakes made here.
 */
async function makeMistakesOnOneTag(request: APIRequestContext): Promise<FrequentError> {
  const before = (await fetchStats(request)).topErrors;
  let tag: string | undefined;
  let mistakes = 0;
  for (let lesson = 1; lesson <= MAX_MISTAKE_LESSONS; lesson += 1) {
    const started = await startViaApi(request, { unitId: unitOfLearnerStage(await fetchPath(request)).unitId });
    expect(started.status(), await started.text()).toBe(201);
    const played = (await started.json()) as LessonResponse;
    tag ??= tagToMiss(played.exercises, before);
    const wrong = new Set(mostWrongableTag(played.exercises, tag)?.candidates.map((exercise) => exercise.id));
    mistakes += wrong.size;
    await finishViaApi(request, played, (exercise) => (wrong.has(exercise.id) ? 'wrong' : 'correct'));
    const entry = (await fetchStats(request)).topErrors.find((error) => error.skillTag === tag);
    if (entry && mistakes > 0) {
      expect(entry.practice, `${tag} has exercises at the learner's level`).toEqual({
        kind: 'practice',
        skillTag: tag,
      });
      const listedBefore = before.find((error) => error.skillTag === tag);
      if (listedBefore) expect(entry.errors, `${tag}: the mistakes made here`).toBe(listedBefore.errors + mistakes);
      else expect(entry.errors, `${tag}: the mistakes made here`).toBeGreaterThanOrEqual(mistakes);
      return entry;
    }
  }
  throw new Error(`${tag} is not among the top errors after ${MAX_MISTAKE_LESSONS} lessons with mistakes on it`);
}

async function snapSection(stats: StatsPage, section: StatsSection, name: string): Promise<void> {
  await scrollToTop(stats.section(section), TOP_BAR_GAP);
  await snap(stats.page, name, { fullPage: false });
}

/** The value of a meter as the app writes it: a percentage, or "noch keine Daten" without data. */
async function expectMeter(meter: Locator, share: number | undefined): Promise<void> {
  if (share === undefined) {
    await expect(meter).toHaveAttribute('aria-valuetext', 'noch keine Daten');
    return;
  }
  await expect(meter).toHaveAttribute('aria-valuetext', percentText(share));
  await expect(meter).toHaveAttribute('aria-valuenow', String(Math.round(share * 100)));
}

test('the Statistik tab shows streak, level progress, mastery per area, the top errors, the learning days and the forecast', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  const missed = await test.step('mistakes on one skill tag through the API', () =>
    makeMistakesOnOneTag(page.request),
  );
  const stats = new StatsPage(page);
  const data: Stats = await fetchStats(page.request);
  const today = await fetchTodayProgress(page.request);
  await stats.goto();

  await test.step('streak, longest streak and learned words', async () => {
    await expect(stats.summaryCard('Streak')).toContainText(String(today.streak.current));
    await expect(stats.summaryCard('Streak')).toContainText(
      `Streak: ${today.streak.current} ${today.streak.current === 1 ? 'Tag' : 'Tage'}`,
    );
    await expect(stats.summaryCard('Rekord')).toContainText(String(today.streak.longest));
    await expect(stats.summaryCard('Wörter')).toContainText(data.learnedWords.toLocaleString('de-CH'));
    // The same streak as the top bar's.
    await expect(stats.shell.streakLabel).toHaveText(
      streakText(today.streak.current, today.streak.extendedToday, today.streak.freezesLeft),
    );
    await snap(page, 'statistik-top', { fullPage: false });
  });

  await test.step('Niveau: the stage and the way to its checkpoint', async () => {
    const { level } = data;
    if (!level) throw new Error('The learner has a level since the setup');
    const section = stats.section('Niveau');
    await expect(section).toContainText(`${level.level} · ${level.title}`);
    await expect(section).toContainText(level.nextLevel ? `Danach: ${level.nextLevel}` : 'Letzte Stufe vor dem Ziel C2');
    const done = level.unitsCompleted + level.unitsSkipped;
    await expect(section).toContainText(
      `${done} von ${level.unitsTotal} ${level.unitsTotal === 1 ? 'Einheit' : 'Einheiten'} geschafft`,
    );
    const label = { locked: 'Checkpoint noch gesperrt', available: 'Checkpoint bereit', passed: 'Checkpoint bestanden' };
    await expect(section).toContainText(label[level.checkpoint]);
    const bar = section.getByRole('progressbar', { name: 'Fortschritt zur nächsten Stufe' });
    await expect(bar).toHaveAttribute('aria-valuenow', String(level.percent));
    expect(level.percent, 'done units of the total').toBe(Math.floor((done / level.unitsTotal) * 100));
    await snapSection(stats, 'Niveau', 'statistik-level');
  });

  await test.step('Können pro Bereich: one meter per area, in the order of the API', async () => {
    const meters = stats.section('Können pro Bereich').getByRole('meter');
    expect(data.masteryByArea.map((area) => area.label)).toEqual(
      expect.arrayContaining(['Wortschatz', 'Grammatik', 'Schreiben']),
    );
    await expect(meters).toHaveCount(data.masteryByArea.length);
    for (const [index, area] of data.masteryByArea.entries()) {
      await expect(meters.nth(index)).toHaveAccessibleName(area.label);
      await expectMeter(meters.nth(index), area.mastery);
    }
    expect(
      data.masteryByArea.some((area) => area.mastery !== undefined),
      'the lessons of the run have given some area a mastery',
    ).toBe(true);
    await snapSection(stats, 'Können pro Bereich', 'statistik-mastery');
  });

  await test.step('Häufigste Fehler: the top five, the deliberate mistakes among them', async () => {
    expect(data.topErrors.length).toBeGreaterThan(0);
    expect(data.topErrors.length).toBeLessThanOrEqual(TOP_ERRORS);
    const errors = data.topErrors.map((error) => error.errors);
    expect(errors, 'the most frequent first').toEqual([...errors].sort((a, b) => b - a));
    expect(data.topErrors.map((error) => error.skillTag)).toContain(missed.skillTag);

    const rows = stats.errorRows();
    await expect(rows).toHaveCount(data.topErrors.length);
    for (const [index, error] of data.topErrors.entries()) {
      const row = rows.nth(index);
      await expect(row).toContainText(error.label);
      await expect(row).toContainText(
        `${error.errors} von ${error.attempts} ${error.attempts === 1 ? 'Antwort' : 'Antworten'} falsch`,
      );
      expect(error.errorRate).toBeCloseTo(error.errors / error.attempts, 5);
      await expectMeter(row.getByRole('meter', { name: `Fehlerquote ${error.label}` }), error.errorRate);
      await expect(row.getByRole('button', { name: `Gezielt üben: ${error.label}` })).toHaveCount(
        error.practice ? 1 : 0,
      );
    }
    await snapSection(stats, 'Häufigste Fehler', 'statistik-errors');
  });

  await test.step('Lerntage: 365 days, today practised, opened at today', async () => {
    const { days, to } = data.heatmap;
    expect(days).toHaveLength(HEATMAP_DAYS);
    expect(days.at(-1)?.date).toBe(to);
    expect(to, 'today in the learner time zone').toBe(today.date);
    expect(heatLevel(days.at(-1) as HeatmapDay), 'the lessons of the run count for today').not.toBe('none');

    await expect(stats.heatmapCells).toHaveCount(HEATMAP_DAYS);
    const shown = await stats.heatmapCells.evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-level')));
    expect(shown, 'every day painted as the API reports it').toEqual(days.map(heatLevel));
    await expect(stats.heatmapToday).toHaveCount(1);
    await expect(stats.heatmapToday).toHaveAttribute('data-level', heatLevel(days.at(-1) as HeatmapDay));

    const practised = days.filter((day) => day.minutes > 0 || day.lessons > 0).length;
    const goals = days.filter((day) => day.goalMet).length;
    await expect(stats.section('Lerntage')).toContainText(
      `An ${practised} ${practised === 1 ? 'Tag' : 'Tagen'} geübt · ${goals}-mal Tagesziel erreicht`,
    );
    await scrollToTop(stats.section('Lerntage'), TOP_BAR_GAP);
    await expect(stats.heatmapToday, 'the year scrolls sideways and opens at today').toBeInViewport();
    await snap(page, 'statistik-heatmap', { fullPage: false });
  });

  await test.step('Wiederholungen: tomorrow\'s cards and the next seven days', async () => {
    const { forecast } = data;
    const section = stats.section('Wiederholungen');
    await expect(section).toContainText(`Morgen fällig: ${forecast.dueTomorrow}`);
    await expect(section).toContainText(
      forecast.dueNow > 0 ? `Jetzt fällig: ${forecast.dueNow}` : 'Gerade ist nichts fällig.',
    );
    expect(forecast.days).toHaveLength(FORECAST_DAYS);
    expect(forecast.days[1]?.due, 'tomorrow is the second day').toBe(forecast.dueTomorrow);
    await expect(stats.forecastBars).toHaveCount(FORECAST_DAYS);
    for (const [index, day] of forecast.days.entries()) {
      await expect(stats.forecastBars.nth(index)).toContainText(new RegExp(`: ${day.due} fällig`));
    }
    await expect(stats.reviewButton).toHaveCount(forecast.dueNow > 0 ? 1 : 0);
    await snapSection(stats, 'Wiederholungen', 'statistik-forecast');
  });
});

test('"Gezielt üben" plays a practice lesson of the skill tag and returns to the tab', async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const missed = await test.step('mistakes on one skill tag through the API', () =>
    makeMistakesOnOneTag(page.request),
  );
  const stats = new StatsPage(page);
  const player = new LessonPlayer(page);
  const resultScreen = new LessonResultScreen(page);
  await stats.goto();

  const button = stats.practiceButton(missed.label);
  await button.scrollIntoViewIfNeeded();
  const opened = await openLesson(page, () => button.click());
  expect(opened.lesson.kind).toBe('practice');
  expect(opened.lesson.exercises.length).toBeGreaterThan(0);
  for (const exercise of opened.lesson.exercises) {
    expect(exercise.skillTags, `${exercise.id} practises ${missed.skillTag}`).toContain(missed.skillTag);
  }
  await expect(page).toHaveURL(
    new RegExp(`/statistik/ueben/${escapeRegExp(encodeURIComponent(missed.skillTag))}$`),
  );
  await expect(player.exercise).toBeVisible();
  await snap(page, 'practice-lesson-exercise', { fullPage: false });

  const result = await playOpenedLesson(page, opened, { end: resultScreen.heading });
  expect(result.kind).toBe('practice');
  await expect(resultScreen.heading).toHaveText(/^(Gezielt geübt!|Fehlerfrei!)$/);
  await resultScreen.expectDailyGoal(result.dailyGoal);
  await snap(page, 'practice-lesson-result', { fullPage: false });

  await resultScreen.leave(result);
  await stats.expectVisible();
});
