import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import {
  asFormat1,
  asFormat2,
  asFormat3,
  asFormat4,
  BackupArchive,
  countKey,
  DATA_TABLES,
  ERROR_CATEGORIES,
  EXPECTED_ENTRIES,
  EXPORT_FORMAT,
  localDate,
  writeZip,
  type AttemptRow,
  type BadgeRow,
  type LearnerProfileDocument,
  type LearningPlanDocument,
  type MasteryDocument,
  type PlacementTestRow,
  type ProfileData,
  type RecentError,
  type ReviewLogRow,
  type SessionRow,
  type SrsCardRow,
  type StreakDayRow,
  type StreakGoalRow,
} from '../../support/backup.ts';
import { isVocabulary, readItemKinds } from '../../support/content.ts';
import { LEARNER, ONBOARDING } from '../../support/learner.ts';
import { choiceFor } from '../../support/lessonAnswers.ts';
import { fetchMe, P0_EXERCISE_TYPES, playLessonViaApi } from '../../support/lessonApi.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchExport, fetchSummary, isImport, type ImportResult } from '../../support/profileApi.ts';
import { snap } from '../../support/screenshots.ts';
import { chooseStreakGoal, fetchStreak, FIRST_GOAL, isRung, rungsAbove } from '../../support/streakApi.ts';

/*
 * "Backup herunterladen" and "Backup importieren" (PRD F11, 8.3, 13). Each test first records the
 * next lesson of the path through the API (one wrong answer, retried), so the export always has
 * sessions, attempts, an error and mastery to show, whichever test runs first.
 */

const FILENAME = /^lingora-export-\d{4}-\d{2}-\d{2}\.zip$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/** Timestamps of the data files, as PostgreSQL writes them in UTC. */
const PG_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+00:00$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UNCHANGED = 'Deine Lerndaten sind unverändert.';
const NOT_A_BACKUP = `Diese Datei ist kein Lingora-Backup. Wähle eine ZIP-Datei, die du hier heruntergeladen hast. ${UNCHANGED}`;
const NEWER_VERSION = `Dieses Backup stammt aus einer Lingora-Version, die diese Installation nicht kennt. ${UNCHANGED}`;

/** The target retention of FSRS while the learner keeps the default (PRD F8). */
const DEFAULT_RETENTION = 0.9;

const keysOf = (value: object) => Object.keys(value).sort();
const accepted = (outcome: string) => outcome !== 'wrong';

const swissDate = (instant: string) =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeZone: 'Europe/Zurich' }).format(
    new Date(instant),
  );
const count = (value: number, singular: string, plural: string) =>
  `${value.toLocaleString('de-CH')} ${value === 1 ? singular : plural}`;

/** The toast after an import. */
const importedMessage = ({ exportedAt, imported }: ImportResult) =>
  `Backup vom ${swissDate(exportedAt)} importiert: ` +
  `${count(imported.sessions ?? 0, 'Lektion', 'Lektionen')}, ` +
  `${count(imported.attempts ?? 0, 'Antwort', 'Antworten')}.`;

test('the downloaded backup holds the manifest, the five profile documents and all learner data', async ({
  page,
}, testInfo) => {
  const unitId = currentUnit(await fetchPath(page.request)).unitId;
  const played = await playLessonViaApi(page.request, unitId);
  const me = await fetchMe(page.request);
  const profile = new ProfilePage(page);
  await profile.goto();

  const download = await profile.downloadBackup(testInfo.outputDir);
  expect(download.filename).toMatch(FILENAME);
  await expect(profile.toast(`Backup gespeichert: ${download.filename}`)).toBeVisible();
  const backup = await BackupArchive.read(download.path);

  await test.step('entries and manifest', () => {
    expect(backup.names().sort()).toEqual([...EXPECTED_ENTRIES].sort());
    const manifest = backup.manifest();
    expect(manifest.schemaVersion, 'format 5: the streak goal').toBe(EXPORT_FORMAT);
    expect(manifest.exportedAt).toMatch(ISO_INSTANT);
    expect(typeof manifest.appVersion).toBe('string');
    expect(keysOf(manifest.counts)).toEqual(DATA_TABLES.map(countKey).sort());
    for (const table of DATA_TABLES) {
      expect(manifest.counts[countKey(table)], `rows of ${table}`).toBe(backup.rows(table).length);
    }
    const { timeZone } = backup.json<ProfileData>('data/profile.json');
    expect(download.filename, 'named after the export day of the learner').toBe(
      `lingora-export-${localDate(manifest.exportedAt, timeZone)}.zip`,
    );
  });

  await test.step('learner_profile.json', () => {
    const document = backup.document<LearnerProfileDocument>('learner_profile.json');
    expect(keysOf(document)).toEqual(
      [
        'schemaVersion',
        'displayName',
        'variety',
        'motivation',
        'dailyGoalMinutes',
        'currentLevel',
        'targetLevel',
        'xpTotal',
        'streak',
      ].sort(),
    );
    expect(document).toMatchObject({
      schemaVersion: EXPORT_FORMAT,
      displayName: LEARNER.displayName,
      variety: 'gheg-kosovo',
      currentLevel: me.currentLevel ?? null,
      targetLevel: 'C2',
      xpTotal: me.xpTotal,
    });
    expect(document, 'the answers of the onboarding (PRD F1)').toMatchObject({
      motivation: ONBOARDING.motivations.map(({ value }) => value),
      dailyGoalMinutes: ONBOARDING.dailyGoal.minutes,
    });
    expect(keysOf(document.streak)).toEqual(['current', 'longest']);
    expect(document.streak.longest).toBeGreaterThanOrEqual(document.streak.current);
  });

  const attempts = backup.rows<AttemptRow>('attempts');

  await test.step('skill_mastery.json', () => {
    const document = backup.document<Record<string, MasteryDocument>>('skill_mastery.json');
    const firstAnswers = attempts.filter((attempt) => !attempt.isRetry);
    const practisedTags = new Set(attempts.flatMap((attempt) => attempt.skillTags));
    // A placement test seeds an initial mastery for the tags of its items (PRD F2).
    const placedTags = new Set(
      backup
        .rows<PlacementTestRow>('placement_tests')
        .flatMap((test) => Object.keys(test.result?.initialMastery ?? {})),
    );
    expect(practisedTags.size, 'the lesson practised skill tags').toBeGreaterThan(0);
    expect(keysOf(document), 'every practised skill tag has an entry').toEqual(
      expect.arrayContaining([...practisedTags]),
    );

    for (const [tag, entry] of Object.entries(document)) {
      expect(keysOf(entry), tag).toEqual(['attempts', 'correct', 'lastPracticed', 'mastery']);
      expect(entry.mastery, tag).toBeGreaterThanOrEqual(0);
      expect(entry.mastery, tag).toBeLessThanOrEqual(1);
      expect(Math.round(entry.mastery * 100) / 100, `${tag} has two decimals`).toBe(entry.mastery);
      if (!practisedTags.has(tag)) {
        expect(placedTags, `${tag} is only an estimate of a placement test`).toContain(tag);
        expect(entry, tag).toMatchObject({ attempts: 0, correct: 0, lastPracticed: null });
        continue;
      }
      expect(entry.lastPracticed, tag).toMatch(ISO_DATE);
      // Retries move the mastery a little but are not counted, like in the lesson accuracy.
      const answers = firstAnswers.filter((attempt) => attempt.skillTags.includes(tag));
      expect(entry.attempts, `${tag} attempts`).toBe(answers.length);
      expect(entry.correct, `${tag} correct`).toBe(
        answers.filter((attempt) => accepted(attempt.outcome)).length,
      );
    }
  });

  await test.step('recent_errors.json', () => {
    const errors = backup.document<RecentError[]>('recent_errors.json');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.length).toBeLessThanOrEqual(50);
    for (const error of errors) {
      expect(keysOf(error)).toEqual(
        ['ts', 'exerciseType', 'skillTags', 'errorCategory', 'prompt', 'expected', 'given'].sort(),
      );
      expect(error.ts).toMatch(ISO_INSTANT);
      expect(P0_EXERCISE_TYPES).toContain(error.exerciseType);
      expect(error.skillTags.length, 'every error carries its skill tags').toBeGreaterThan(0);
      expect(ERROR_CATEGORIES).toContain(error.errorCategory);
      expect(error.errorCategory, 'a Standard form is a hint, not an error').not.toBe(
        'variant.standard_form',
      );
    }
    const timestamps = errors.map((error) => error.ts);
    expect(timestamps, 'newest first').toEqual([...timestamps].sort().reverse());

    const latest = errors[0];
    expect(latest).toMatchObject({
      exerciseType: played.wrongExercise.type,
      prompt: played.wrongExercise.prompt.text,
      given: choiceFor(played.wrongExercise, 'wrong'),
    });
    expect(played.wrongExercise.solutions ?? []).toContain(latest?.expected);
  });

  await test.step('learning_plan.json: the plan of the path, up to C2', async () => {
    const plan = backup.document<LearningPlanDocument>('learning_plan.json');
    const path = await fetchPath(page.request);
    expect(keysOf(plan)).toEqual(
      ['generatedAt', 'generatedBy', 'startLevel', 'stages', 'estimates'].sort(),
    );
    expect(plan).toMatchObject({ generatedBy: 'rule_based_v1', startLevel: me.currentLevel });
    expect(plan.generatedAt).toMatch(ISO_INSTANT);
    expect(plan.stages.map((stage) => stage.level)).toEqual(path.stages.map((stage) => stage.level));
    expect(plan.stages.at(-1)?.level).toBe('C2.3');
    expect(plan.estimates).toEqual(path.estimates);
    for (const [index, stage] of plan.stages.entries()) {
      const units = path.stages[index]?.units ?? [];
      expect(
        stage.units.map(({ unitId, status }) => ({ unitId, status })),
        `${stage.level}: the live statuses of the path`,
      ).toEqual(units.map(({ unitId, status }) => ({ unitId, status })));
    }
  });

  const learnedWords = await test.step('learned words: words and phrases whose card is in review state (PRD F10)', () => {
    const kinds = readItemKinds();
    const cards = backup.rows<SrsCardRow>('srs_cards');
    const stateOf = new Map(cards.map((card) => [card.itemId, card.state]));
    expect(played.result.learnedItems.length, 'the lesson practised items').toBeGreaterThan(0);
    for (const item of played.result.learnedItems) {
      expect(item.known, `${item.id} is known once its card is in review state`).toBe(
        stateOf.get(item.id) === 'review',
      );
    }
    const learned = cards.filter(
      (card) => card.state === 'review' && isVocabulary(kinds.get(card.itemId)),
    ).length;
    expect(played.result.learnedWordsTotal, 'the total on the result of the lesson').toBe(learned);
    return learned;
  });

  await test.step('learner_summary.md', async () => {
    const summary = backup.text('documents/learner_summary.md');
    const { streak } = backup.document<LearnerProfileDocument>('learner_profile.json');
    expect(summary).toMatch(new RegExp(`^# Lernstand ${LEARNER.displayName} – `));
    expect(summary.split('\n')[3], 'level, streak and the learned words').toBe(
      `- Niveau: ${me.currentLevel ?? 'noch nicht eingestuft'} (Ziel C2), ` +
        `${count(streak.current, 'Tag', 'Tage')} Streak, ${count(learnedWords, 'Wort', 'Wörter')}`,
    );
    expect(summary, 'the same text as "KI-Zusammenfassung kopieren"').toBe(
      await fetchSummary(page.request),
    );
  });

  await test.step('since format 3: the days that counted for the streak, the completion that met each', () => {
    const sessionIds = new Set(backup.rows<SessionRow>('sessions').map((session) => session.id));
    const placementIds = new Set(backup.rows<PlacementTestRow>('placement_tests').map((placement) => placement.id));
    for (const day of backup.rows<StreakDayRow>('streak_days')) {
      expect(day.day, `streak day ${day.id}`).toMatch(ISO_DATE);
      expect(['goal_met', 'freeze']).toContain(day.kind);
      expect(day.goalMinutes !== null, `${day.day}: only a met goal has its minutes`).toBe(
        day.kind === 'goal_met',
      );
      expect(day.sessionId === null || day.placementTestId === null, `${day.day}: a lesson or a placement test`).toBe(
        true,
      );
      if (day.sessionId !== null) expect(sessionIds, `${day.day}: the lesson that met it`).toContain(day.sessionId);
      if (day.placementTestId !== null) {
        expect(day.kind, `${day.day}: a placement test only meets a goal`).toBe('goal_met');
        expect(placementIds, `${day.day}: the placement test that met it (format 4)`).toContain(day.placementTestId);
      }
    }
  });

  await test.step('since format 5: the streak goal, a rung of the ladder, if the learner has one of its own', () => {
    const goals = backup.rows<StreakGoalRow>('streak_goals');
    expect(goals.length, 'one goal at most').toBeLessThanOrEqual(1);
    for (const goal of goals) {
      expect(keysOf(goal)).toEqual(['id', 'target', 'reachedOn', 'reachedAt', 'updatedAt'].sort());
      expect(isRung(goal.target), `${goal.target} days: a rung of the ladder`).toBe(true);
      expect(goal.reachedOn === null, 'reached on a day exactly when reached at a time').toBe(goal.reachedAt === null);
      if (goal.reachedOn !== null) expect(goal.reachedOn).toMatch(ISO_DATE);
      expect(goal.updatedAt).toMatch(PG_INSTANT);
    }
  });

  await test.step('since format 2: checkpoint results, level badges, the target retention of every review', () => {
    const sessions = backup.rows<SessionRow>('sessions');
    for (const session of sessions.filter((row) => row.kind !== 'checkpoint')) {
      expect(session.checkpointPassed, `the ${session.kind} ${session.id} is no checkpoint`).toBeNull();
    }
    const passedCheckpoints = sessions
      .filter((row) => row.kind === 'checkpoint' && row.checkpointPassed === true)
      .map((row) => row.id);
    for (const badge of backup.rows<BadgeRow>('badges')) {
      expect(passedCheckpoints, `badge ${badge.code} comes from a passed checkpoint`).toContain(
        badge.sessionId,
      );
    }
    const reviews = backup.rows<ReviewLogRow>('review_log');
    expect(reviews.length, 'first answers review the cards of their items').toBeGreaterThan(0);
    for (const review of reviews) {
      expect(review.requestRetention, `review ${review.id} of ${review.itemId}`).toBe(DEFAULT_RETENTION);
    }
  });

  await test.step('data/: the complete learner state, without the password', () => {
    const account = backup.json<ProfileData>('data/profile.json');
    expect(keysOf(account)).toEqual(
      [
        'displayName',
        'motivations',
        'dailyGoalMinutes',
        'selfAssessment',
        'currentLevel',
        'xpTotal',
        'timeZone',
        'settings',
        'onboardingCompletedAt',
      ].sort(),
    );
    expect(account).toMatchObject({ displayName: LEARNER.displayName, xpTotal: me.xpTotal });
    for (const name of backup.names()) {
      expect(backup.text(name), `${name} holds no password hash`).not.toMatch(/argon2|passwordHash/i);
    }

    const session = backup
      .rows<SessionRow>('sessions')
      .find((row) => row.id === played.lesson.sessionId);
    expect(session, 'the played lesson').toMatchObject({
      kind: played.result.kind,
      unitId,
      exerciseCount: played.lesson.exercises.length,
      xpEarned: played.result.xpEarned,
      checkpointPassed: null,
    });
    expect(session?.finishedAt).toMatch(PG_INSTANT);

    const answers = attempts.filter((attempt) => attempt.sessionId === played.lesson.sessionId);
    expect(answers, 'every exercise once, the wrong one again').toHaveLength(
      played.lesson.exercises.length + 1,
    );
    const wrong = answers.filter((attempt) => attempt.outcome === 'wrong');
    expect(wrong).toHaveLength(1);
    expect(wrong[0]).toMatchObject({ exerciseId: played.wrongExercise.id, isRetry: false });
    expect(ERROR_CATEGORIES, 'PRD F6: a wrong answer has a category').toContain(
      wrong[0]?.errorCategory,
    );
    expect(wrong[0]?.skillTags.length, 'PRD F6: and its skill tags').toBeGreaterThan(0);
    for (const answer of answers.filter((attempt) => attempt.outcome === 'correct')) {
      expect(answer.errorCategory, `${answer.exerciseId} is no error`).toBeNull();
    }
  });
});

test('importing the downloaded backup restores the same state and keeps the account', async ({
  page,
}, testInfo) => {
  await playLessonViaApi(page.request, currentUnit(await fetchPath(page.request)).unitId);
  const profile = new ProfilePage(page);
  await profile.goto();
  const download = await profile.downloadBackup(testInfo.outputDir);
  const exported = await BackupArchive.read(download.path);
  const manifest = exported.manifest();
  const before = await fetchMe(page.request);

  await profile.chooseBackup(download.path);
  const dialog = profile.importConfirm;
  await expect(dialog).toContainText(
    `Alle aktuellen Lerndaten werden durch das Backup „${download.filename}“ ersetzt. Fortfahren?`,
  );
  await expect(dialog.getByRole('button', { name: 'Abbrechen' }), 'the safe choice').toBeFocused();
  await expect(dialog).toBeInViewport({ ratio: 1 });
  await snap(page, 'profile-import-confirm', { fullPage: false });

  const imported = page.waitForResponse(isImport);
  await profile.confirmImport();
  const response = await imported;
  expect(response.status(), await response.text()).toBe(200);
  const result = (await response.json()) as ImportResult;
  expect(result).toEqual({
    schemaVersion: EXPORT_FORMAT,
    exportedAt: manifest.exportedAt,
    imported: manifest.counts,
  });

  await expect(profile.toast(importedMessage(result))).toBeVisible();
  expect(result.imported.sessions).toBeGreaterThan(0);
  await expect(profile.action('Backup importieren'), 'busy until the data is fresh').not.toHaveAttribute(
    'aria-busy',
    'true',
  );
  await snap(page, 'profile-import-success', { fullPage: false });

  const after = await fetchMe(page.request);
  expect(after, 'XP, level and name are unchanged').toEqual(before);
  await expect(profile.xpChip(before.xpTotal)).toBeVisible();
  await expect(profile.levelChip(before.currentLevel)).toBeVisible();
  expect(await fetchAuthStatus(page.request), 'the account and its session stay').toMatchObject({
    authenticated: true,
    displayName: LEARNER.displayName,
  });

  const reexported = await fetchExport(page.request);
  for (const name of exported.names().filter((entry) => entry.startsWith('data/'))) {
    expect(reexported.text(name), `${name} survives the round trip unchanged`).toBe(
      exported.text(name),
    );
  }
});

/**
 * Imports an older format made from the current export through the UI and checks that the import
 * upgrades it: the rows of the current format come back, the streak days as the older format held
 * them (none before format 3, met by no placement test before format 4) and no streak goal of its
 * own (new in format 5): the learner has the first goal of 10 days again.
 */
async function importUpgraded(
  page: Page,
  file: string,
  current: BackupArchive,
  schemaVersion: number,
  streakDays: StreakDayRow[],
): Promise<void> {
  const manifest = current.manifest();
  const profile = new ProfilePage(page);
  await profile.goto();
  const imported = page.waitForResponse(isImport);
  await profile.chooseBackup(file);
  await profile.confirmImport();
  const response = await imported;
  expect(response.status(), await response.text()).toBe(200);
  const result = (await response.json()) as ImportResult;
  expect(result, 'the version of the file, the rows of the current format').toEqual({
    schemaVersion,
    exportedAt: manifest.exportedAt,
    imported: { ...manifest.counts, streakDays: streakDays.length, streakGoals: 0 },
  });
  await expect(profile.toast(importedMessage(result))).toBeVisible();

  const upgraded = await fetchExport(page.request);
  expect(upgraded.manifest().schemaVersion, 'exported again in the current format').toBe(EXPORT_FORMAT);
  expect(upgraded.rows<StreakDayRow>('streak_days'), `the streak days format ${schemaVersion} held`).toEqual(
    streakDays,
  );
  expect(upgraded.rows<StreakGoalRow>('streak_goals'), 'no streak goal of its own').toEqual([]);
  expect((await fetchStreak(page.request)).goal.target, 'the first goal again').toBe(FIRST_GOAL);
  // Compared as JSON: an upgrader may write a JSONB number like 1.0 of a review state as 1.
  for (const name of current.names().filter((entry) => entry.startsWith('data/'))) {
    if (name === 'data/streak_days.json' || name === 'data/streak_goals.json') continue;
    expect(upgraded.json(name), `${name} after the upgrade`).toEqual(current.json(name));
  }
}

test('a backup of export format 4 is upgraded on import and restores the same state but the streak goal (PRD 13)', async ({
  page,
}, testInfo) => {
  // Format 4 holds everything but the streak goal: with a goal of its own (the next rung above the
  // goal and the streak), the export has the row that format 4 cannot hold, and the import starts at
  // 10 days again.
  const { current: streak, goal } = await fetchStreak(page.request);
  const [nextGoal] = goal.reached ? goal.options : rungsAbove(Math.max(streak, goal.target));
  if (nextGoal === undefined) throw new Error('The ladder has no rung above the goal');
  await chooseStreakGoal(page.request, nextGoal);
  const current = await fetchExport(page.request);
  expect(current.rows<StreakGoalRow>('streak_goals'), 'a goal of its own').toHaveLength(1);
  const formatFour = testInfo.outputPath('lingora-export-format-4.zip');
  await writeZip(formatFour, asFormat4(current));
  await importUpgraded(page, formatFour, current, 4, current.rows<StreakDayRow>('streak_days'));
});

test('a backup of export format 3 is upgraded on import and restores the same state (PRD 13)', async ({
  page,
}, testInfo) => {
  // Format 3 holds everything but the placement test that met a day's goal, so any state will do.
  // The days come back, met by the same lessons and by no placement test.
  const current = await fetchExport(page.request);
  const formatThree = testInfo.outputPath('lingora-export-format-3.zip');
  await writeZip(formatThree, asFormat3(current));
  const days = current.rows<StreakDayRow>('streak_days');
  await importUpgraded(page, formatThree, current, 3, days.map((day) => ({ ...day, placementTestId: null })));
});

test('a backup of export format 2 is upgraded on import and restores the same state (PRD 13)', async ({
  page,
}, testInfo) => {
  // Format 2 holds everything but the streak days, so any state of the learner will do.
  const current = await fetchExport(page.request);
  const formatTwo = testInfo.outputPath('lingora-export-format-2.zip');
  await writeZip(formatTwo, asFormat2(current));
  await importUpgraded(page, formatTwo, current, 2, []);
});

test('a backup of export format 1 is upgraded on import and restores the same state (PRD 13)', async ({
  page,
}, testInfo) => {
  await playLessonViaApi(page.request, currentUnit(await fetchPath(page.request)).unitId);
  const current = await fetchExport(page.request);
  // Format 1 could hold neither, so the upgraded file must come back as it was exported: no badges,
  // no checkpoint results, the default target retention for every review.
  expect(current.rows<BadgeRow>('badges'), 'no level badge yet').toEqual([]);
  expect(
    current.rows<SessionRow>('sessions').filter((session) => session.kind === 'checkpoint'),
    'no checkpoint played yet',
  ).toEqual([]);
  const formatOne = testInfo.outputPath('lingora-export-format-1.zip');
  await writeZip(formatOne, asFormat1(current));
  await importUpgraded(page, formatOne, current, 1, []);
});

test('an invalid backup is rejected with a German message and changes nothing', async ({
  page,
}, testInfo) => {
  const profile = new ProfilePage(page);
  const before = await fetchMe(page.request);
  const imports: number[] = [];
  page.on('response', (response) => {
    if (isImport(response)) imports.push(response.status());
  });
  await profile.goto();

  const notAZip = testInfo.outputPath('kein-backup.zip');
  await writeFile(notAZip, 'Das ist kein Lingora-Backup.', 'utf8');

  await test.step('cancelling the confirmation uploads nothing', async () => {
    await profile.chooseBackup(notAZip);
    await profile.importConfirm.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(profile.importConfirm).toBeHidden();
    expect(imports).toEqual([]);
  });

  await test.step('a file that is no ZIP', async () => {
    await expectRejected(profile, notAZip, 'invalid_backup_archive', NOT_A_BACKUP);
    await expect(profile.problem).toBeInViewport();
    await snap(page, 'profile-import-error', { fullPage: false });
  });

  await test.step(`an export of a newer Lingora (schemaVersion ${EXPORT_FORMAT + 1})`, async () => {
    const newer = testInfo.outputPath('lingora-export-neuer.zip');
    await writeZip(newer, {
      'manifest.json': JSON.stringify({
        schemaVersion: EXPORT_FORMAT + 1,
        exportedAt: new Date().toISOString(),
      }),
    });
    await expectRejected(profile, newer, 'unsupported_schema_version', NEWER_VERSION);
  });

  await test.step('an entry that would escape the folder when unpacked (zip slip)', async () => {
    const slip = testInfo.outputPath('lingora-export-slip.zip');
    await writeZip(slip, {
      'manifest.json': JSON.stringify({
        schemaVersion: EXPORT_FORMAT,
        exportedAt: new Date().toISOString(),
      }),
      '../data/profile.json': '{}',
    });
    await expectRejected(profile, slip, 'invalid_backup_archive', NOT_A_BACKUP);
  });

  expect(imports).toEqual([422, 422, 422]);
  expect(await fetchMe(page.request), 'the learning data is untouched').toEqual(before);
});

async function expectRejected(
  profile: ProfilePage,
  file: string,
  code: string,
  message: string,
): Promise<void> {
  const rejected = profile.page.waitForResponse(isImport);
  await profile.chooseBackup(file);
  await profile.confirmImport();
  const response = await rejected;
  expect(response.status()).toBe(422);
  expect(((await response.json()) as { code?: string }).code).toBe(code);
  await expect(profile.problem).toHaveText(message);
}
