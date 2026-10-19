import { expect, test, type APIRequestContext } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { ReviewTab } from '../../pages/ReviewTab.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { loginViaApi, newApiContext, newLearnerViaApi, type TestLearner } from '../../support/auth.ts';
import type { ProfileData } from '../../support/backup.ts';
import { newPhonePage } from '../../support/browserContext.ts';
import { csrfHeaders } from '../../support/csrf.ts';
import {
  fetchMe,
  finishViaApi,
  playLessonViaApi,
  startViaApi,
  type LessonResponse,
  type PlayedLesson,
} from '../../support/lessonApi.ts';
import { currentUnit, fetchPath } from '../../support/planApi.ts';
import { fetchExport, fetchSummary } from '../../support/profileApi.ts';
import { fetchTodayProgress } from '../../support/progressApi.ts';
import { fetchReviewSummary } from '../../support/reviewApi.ts';
import { fetchStats } from '../../support/statsApi.ts';
import { snap } from '../../support/screenshots.ts';

/*
 * Two learners on one instance: the second one never sees anything of the first, neither on the
 * screens nor through the API, and cannot reach the first one's lessons or placement test by id.
 */
test.use({ storageState: { cookies: [], origins: [] } });

interface LearnerWithProgress extends TestLearner {
  played: PlayedLesson;
  /** A lesson started and left open. */
  open: LessonResponse;
}

/** A learner with a lesson played (one mistake: errors, reviews, XP) and a second one open. */
async function learnerWithProgress(
  request: APIRequestContext,
  purpose: string,
  displayName: string,
): Promise<LearnerWithProgress> {
  const learner = await newLearnerViaApi(request, purpose, displayName);
  const played = await playLessonViaApi(request, currentUnit(await fetchPath(request)).unitId);
  const started = await startViaApi(request, { unitId: currentUnit(await fetchPath(request)).unitId });
  expect(started.status(), await started.text()).toBe(201);
  return { ...learner, played, open: (await started.json()) as LessonResponse };
}

test('a second learner sees nothing of the first one: path, statistics, reviews, profile documents and export', async ({
  page,
  browser,
}) => {
  const a = await learnerWithProgress(page.request, 'isolation-a', 'Ardit');
  expect((await fetchMe(page.request)).xpTotal).toBeGreaterThan(0);
  expect((await fetchReviewSummary(page.request)).totalCards).toBeGreaterThan(0);
  const traces = [
    a.credentials.displayName,
    a.credentials.email,
    a.placement.testId,
    a.played.lesson.sessionId,
    a.open.sessionId,
  ];

  const bPage = await newPhonePage(browser, page);
  try {
    const b = bPage.request;
    const { credentials } = await newLearnerViaApi(b, 'isolation-b', 'Blerta');
    const shell = new AppShell(bPage);
    const path = new LearningPathPage(bPage);

    await test.step('the screens of B', async () => {
      await bPage.goto('/');
      await shell.expectHome();
      await expect(shell.xpLabel).toHaveText('0 XP');
      await shell.expectProgress(await fetchTodayProgress(b));
      const unit = currentUnit(await fetchPath(b));
      await expect(path.unit(unit.title).getByRole('button', { name: 'Lektion 1, als Nächstes' })).toBeVisible();
      await new ReviewTab(bPage).expectNavBadge(0);
      await snap(bPage, 'isolation-second-learner', { fullPage: false });
      await shell.openProfile();
      await expect(bPage.getByRole('main')).toContainText(credentials.displayName);
      await expect(bPage.getByRole('main')).not.toContainText(a.credentials.displayName);
      await expect(bPage.getByRole('main')).not.toContainText(a.credentials.email);
    });

    await test.step('the data of B through the API', async () => {
      const units = (await fetchPath(b)).stages.flatMap((stage) => stage.units);
      expect(units.filter((unit) => unit.lessonsCompleted > 0 || unit.status === 'completed')).toEqual([]);
      expect(await fetchReviewSummary(b)).toEqual({ dueNow: 0, dueTomorrow: 0, totalCards: 0 });
      const stats = await fetchStats(b);
      expect(stats.topErrors).toEqual([]);
      expect(stats.learnedWords).toBe(0);
      expect(stats.heatmap.days.filter((day) => day.lessons > 0 || day.xp > 0)).toEqual([]);
      expect((await fetchTodayProgress(b)).lessonsToday).toBe(0);

      const documents = await b.get('/api/profile/documents/learner_profile.json');
      expect(documents.status()).toBe(200);
      const summary = await fetchSummary(b);
      expect(summary).toContain(credentials.displayName);
      const backup = await fetchExport(b);
      expect(backup.json<ProfileData>('data/profile.json')).toMatchObject({ displayName: credentials.displayName, xpTotal: 0 });
      for (const table of ['sessions', 'attempts', 'srs_cards', 'review_log', 'skill_mastery', 'streak_days'] as const) {
        expect(backup.rows(table), table).toEqual([]);
      }
      const everything = [
        await documents.text(),
        summary,
        ...backup.names().map((name) => backup.text(name)),
      ].join('\n');
      for (const trace of traces) expect(everything, 'nothing of A in what B can read').not.toContain(trace);
    });

    await test.step('the lessons and the placement test of A are unknown to B', async () => {
      const headers = await csrfHeaders(b);
      const [exercise] = a.open.exercises;
      if (!exercise) throw new Error('The open lesson has no exercise');
      const attempt = await b.post(`/api/lessons/${a.open.sessionId}/attempts`, {
        headers,
        data: { exerciseId: exercise.id, answer: { mistakes: 0 }, responseTimeMs: 4000 },
      });
      expect(attempt.status(), await attempt.text()).toBe(404);
      for (const lesson of [a.open, a.played.lesson]) {
        const completed = await b.post(`/api/lessons/${lesson.sessionId}/complete`, { headers });
        expect(completed.status(), await completed.text()).toBe(404);
      }
      const result = await b.get(`/api/placement/${a.placement.testId}/result`);
      expect(result.status(), await result.text()).toBe(404);
      const answer = await b.post(`/api/placement/${a.placement.testId}/answers`, {
        headers,
        data: { exerciseId: 'any', answer: { mistakes: 0 }, responseTimeMs: 4000 },
      });
      expect(answer.status(), await answer.text()).toBe(404);
    });
  } finally {
    await bPage.context().close();
  }

  // B's tries changed nothing: A plays the open lesson to its end.
  const result = await finishViaApi(page.request, a.open);
  expect(result.exerciseCount).toBe(a.open.exercises.length);
});

test('a learner who signs in where another session just ended sees only their own data', async ({
  page,
  playwright,
}) => {
  const elsewhere = await newApiContext(playwright);
  try {
    const a = await learnerWithProgress(page.request, 'shared-device-a', 'Ardit');
    const b = await newLearnerViaApi(elsewhere, 'shared-device-b', 'Blerta');
    const shell = new AppShell(page);
    await page.goto('/');
    await shell.expectHome();
    const aXp = (await fetchMe(page.request)).xpTotal;
    await expect(shell.xpLabel).toHaveText(`${aXp} XP`);

    // A's password changes on another device, which ends this session; the next request finds out.
    const other = await newApiContext(playwright);
    try {
      expect(await loginViaApi(other, a.credentials)).toBe(204);
      const newPassword = await other.put('/api/account/password', {
        headers: await csrfHeaders(other),
        data: { currentPassword: a.credentials.password, newPassword: `${a.credentials.password}-neu` },
      });
      expect(newPassword.status()).toBe(204);
    } finally {
      await other.dispose();
    }
    await shell.navLink('Statistik').click();
    const welcome = new WelcomePage(page);
    await welcome.expectVisible();

    // B signs in on the same page, without a reload: as on a shared phone.
    await welcome.loginLink.click();
    const login = new LoginPage(page);
    await login.expectVisible();
    await login.login(b.credentials.email, b.credentials.password);
    await shell.expectHome();
    await expect(shell.xpLabel, 'B has no XP yet').toHaveText('0 XP', { timeout: 5_000 });
    await shell.openProfile();
    await expect(page.getByRole('main')).toContainText(b.credentials.displayName, { timeout: 5_000 });
  } finally {
    await elsewhere.dispose();
  }
});
