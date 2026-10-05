import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ProfilePage } from '../../pages/ProfilePage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import {
  BackupArchive,
  countKey,
  DATA_TABLES,
  ERROR_CATEGORIES,
  EXPECTED_ENTRIES,
  localDate,
  writeZip,
  type AttemptRow,
  type LearnerProfileDocument,
  type LearningPlanDocument,
  type MasteryDocument,
  type PlacementTestRow,
  type ProfileData,
  type RecentError,
  type SessionRow,
} from '../../support/backup.ts';
import { LEARNER, ONBOARDING } from '../../support/learner.ts';
import { choiceFor } from '../../support/lessonAnswers.ts';
import { fetchMe, P0_EXERCISE_TYPES, playLessonViaApi } from '../../support/lessonApi.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchExport, fetchSummary, isImport, type ImportResult } from '../../support/profileApi.ts';
import { snap } from '../../support/screenshots.ts';

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

const keysOf = (value: object) => Object.keys(value).sort();
const accepted = (outcome: string) => outcome !== 'wrong';

const swissDate = (instant: string) =>
  new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeZone: 'Europe/Zurich' }).format(
    new Date(instant),
  );
const count = (value: number, singular: string, plural: string) =>
  `${value.toLocaleString('de-CH')} ${value === 1 ? singular : plural}`;

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
    expect(manifest.schemaVersion).toBe(1);
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
      schemaVersion: 1,
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

  await test.step('learner_summary.md', async () => {
    const summary = backup.text('documents/learner_summary.md');
    expect(summary).toMatch(new RegExp(`^# Lernstand ${LEARNER.displayName} – `));
    expect(summary).toContain(`- Niveau: ${me.currentLevel ?? 'noch nicht eingestuft'} (Ziel C2)`);
    expect(summary, 'the same text as "KI-Zusammenfassung kopieren"').toBe(
      await fetchSummary(page.request),
    );
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
      unitId,
      exerciseCount: played.lesson.exercises.length,
      xpEarned: played.result.xpEarned,
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
    schemaVersion: 1,
    exportedAt: manifest.exportedAt,
    imported: manifest.counts,
  });

  const message =
    `Backup vom ${swissDate(manifest.exportedAt)} importiert: ` +
    `${count(result.imported.sessions ?? 0, 'Lektion', 'Lektionen')}, ` +
    `${count(result.imported.attempts ?? 0, 'Antwort', 'Antworten')}.`;
  await expect(profile.toast(message)).toBeVisible();
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

  await test.step('an export of a newer Lingora (schemaVersion 2)', async () => {
    const newer = testInfo.outputPath('lingora-export-neuer.zip');
    await writeZip(newer, {
      'manifest.json': JSON.stringify({ schemaVersion: 2, exportedAt: new Date().toISOString() }),
    });
    await expectRejected(profile, newer, 'unsupported_schema_version', NEWER_VERSION);
  });

  await test.step('an entry that would escape the folder when unpacked (zip slip)', async () => {
    const slip = testInfo.outputPath('lingora-export-slip.zip');
    await writeZip(slip, {
      'manifest.json': JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString() }),
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
