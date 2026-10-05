import { expect, test, type Response } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LevelRevealPage } from '../../pages/LevelRevealPage.ts';
import { LoginPage } from '../../pages/LoginPage.ts';
import { COUNTED_STEPS, OnboardingPage } from '../../pages/OnboardingPage.ts';
import { PlacementIntroPage } from '../../pages/PlacementIntroPage.ts';
import { PlanPage } from '../../pages/PlanPage.ts';
import { SetupPage } from '../../pages/SetupPage.ts';
import { fetchAuthStatus } from '../../support/auth.ts';
import { PATHS } from '../../support/env.ts';
import { LEARNER, ONBOARDING, START_LEVEL } from '../../support/learner.ts';
import { fetchMe } from '../../support/lessonApi.ts';
import { isPlacementSkip, type PlacementResult } from '../../support/placementApi.ts';
import { currentUnit, fetchPath, fetchPlanChanges } from '../../support/planApi.ts';
import { snapOnAllPhones } from '../../support/screenshots.ts';
import { Stopwatch } from '../../support/stopwatch.ts';

/*
 * Runs once per test run, before every other project: the backend starts on an empty database, so
 * this is the only place where the setup, the onboarding questions and the first placement can be
 * seen (PRD 6, F1). The second test creates the single account, answers the questions with "Ich kann
 * kein Wort", skips the placement test (A0, the same in every run) and stores the session for all
 * dependent projects. A full placement through the UI runs later as "Neu einstufen".
 */

/** PRD F1: the onboarding can be completed in under a minute. */
const ONBOARDING_LIMIT_MS = 60_000;

const isOnboardingAnswer = (response: Response) =>
  response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/onboarding';

test('a fresh instance leads to the setup and validates name and password', async ({
  page,
  request,
}) => {
  const status = await fetchAuthStatus(request);
  test.skip(!status.setupRequired, 'Reused backend already has an account; restart it for a fresh database.');

  const setup = new SetupPage(page);
  await page.goto('/');
  await setup.expectWelcome();
  await snapOnAllPhones(page, 'setup-welcome');

  await setup.start();
  await expect(setup.progress).toHaveAttribute('aria-valuetext', `Schritt 1 von ${COUNTED_STEPS}`);
  await expect(setup.nextButton).toBeDisabled();
  await setup.nameInput.fill('   ');
  await expect(setup.nextButton, 'a name of only spaces is no name').toBeDisabled();
  await setup.nameInput.fill(LEARNER.displayName);
  await snapOnAllPhones(page, 'setup-name');

  await setup.nextButton.click();
  await expect(setup.passwordHeading(LEARNER.displayName)).toBeVisible();
  await expect(setup.progress).toHaveAttribute('aria-valuetext', `Schritt 2 von ${COUNTED_STEPS}`);

  const mismatch = 'Die Passwörter stimmen nicht überein.';
  await setup.submitPasswords('kurz', 'kurx');
  await expect(setup.passwordInput).toHaveAttribute('aria-invalid', 'true');
  await expect(setup.passwordInput).toHaveAccessibleDescription('Mindestens 8 Zeichen, bitte.');
  await expect(setup.confirmationInput).toHaveAccessibleDescription(mismatch);
  await snapOnAllPhones(page, 'setup-password-errors');

  await setup.submitPasswords(LEARNER.password, `${LEARNER.password}-typo`);
  await expect(setup.passwordInput).not.toHaveAttribute('aria-invalid');
  await expect(setup.confirmationInput).toHaveAttribute('aria-invalid', 'true');
  await expect(setup.confirmationInput).toHaveAccessibleDescription(mismatch);

  await page.getByRole('button', { name: 'Zurück' }).click();
  await expect(setup.nameInput, 'going back keeps the name').toHaveValue(LEARNER.displayName);

  expect((await fetchAuthStatus(request)).setupRequired, 'invalid input creates no account').toBe(
    true,
  );
});

test('the first start: account, onboarding questions and the skipped placement lead to the path at A0 in under a minute', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  const status = await fetchAuthStatus(page.request);
  await page.goto('/');

  if (!status.setupRequired) {
    // Only when a still running backend was reused (local runs): its learner is onboarded already.
    const login = new LoginPage(page);
    await login.expectVisible();
    await login.login(LEARNER.password);
    await new AppShell(page).expectHome();
    await page.context().storageState({ path: PATHS.authState });
    return;
  }

  const clock = new Stopwatch();
  const snapAll = (name: string) => clock.excluding(() => snapOnAllPhones(page, name));
  const onboarding = new OnboardingPage(page);

  await test.step('account', async () => {
    const setup = new SetupPage(page);
    await setup.expectWelcome();
    await setup.start();
    await setup.enterName(LEARNER.displayName);
    await setup.submitPasswords(LEARNER.password, LEARNER.password);
    await onboarding.expectQuestion('motivation');
    expect(await fetchAuthStatus(page.request)).toMatchObject({
      authenticated: true,
      displayName: LEARNER.displayName,
    });
  });

  await test.step('motivation: several answers', async () => {
    await expect(onboarding.page.getByRole('button', { name: 'Zurück' }), 'the account exists').toHaveCount(0);
    await expect(onboarding.nextButton, 'nothing chosen yet').toBeDisabled();
    for (const { label } of ONBOARDING.motivations) await onboarding.choose('motivation', label);
    await snapAll('onboarding-motivation');
    await onboarding.nextButton.click();
  });

  await test.step('daily goal: one answer, back keeps the motivation', async () => {
    await onboarding.expectQuestion('dailyGoal');
    await expect(onboarding.option('dailyGoal', 'Dranbleiben'), 'the default of a new profile').toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await onboarding.choose('dailyGoal', ONBOARDING.dailyGoal.label);
    await expect(onboarding.option('dailyGoal', 'Dranbleiben')).toHaveAttribute('aria-pressed', 'false');
    await snapAll('onboarding-daily-goal');

    await onboarding.page.getByRole('button', { name: 'Zurück' }).click();
    await onboarding.expectQuestion('motivation');
    for (const { label } of ONBOARDING.motivations) {
      await expect(onboarding.option('motivation', label)).toHaveAttribute('aria-pressed', 'true');
    }
    await onboarding.nextButton.click();
    await expect(onboarding.option('dailyGoal', ONBOARDING.dailyGoal.label)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await onboarding.nextButton.click();
  });

  await test.step('self-assessment: "Ich kann kein Wort" is saved', async () => {
    await onboarding.expectQuestion('selfAssessment');
    await expect(onboarding.nextButton).toBeDisabled();
    await onboarding.choose('selfAssessment', ONBOARDING.selfAssessment.label);
    await snapAll('onboarding-self-assessment');

    const saved = page.waitForResponse(isOnboardingAnswer);
    await onboarding.nextButton.click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(response.request().postDataJSON()).toEqual({
      motivations: ONBOARDING.motivations.map(({ value }) => value),
      dailyGoalMinutes: ONBOARDING.dailyGoal.minutes,
      selfAssessment: ONBOARDING.selfAssessment.value,
    });
    expect(await response.json()).toEqual({ placementSkippable: true, startLevel: START_LEVEL });
  });

  let result: PlacementResult | undefined;
  await test.step('placement intro: a beginner may skip the test (PRD F1)', async () => {
    const intro = new PlacementIntroPage(page);
    await intro.expectVisible('first');
    await expect(intro.skipButton).toBeVisible();
    await snapAll('placement-intro');

    const skipped = page.waitForResponse(isPlacementSkip);
    await intro.skipButton.click();
    const response = await skipped;
    expect(response.status()).toBe(200);
    result = (await response.json()) as PlacementResult;
    expect(result).toMatchObject({ skipped: true, level: START_LEVEL, answeredCount: 0 });
  });

  await test.step('level reveal', async () => {
    if (!result) throw new Error('The placement was not skipped');
    const reveal = new LevelRevealPage(page);
    await reveal.expectResult(result);
    await snapAll('reveal-skipped');
    await reveal.continueButton.click();
  });

  await test.step('plan, then the path', async () => {
    const plan = new PlanPage(page);
    await plan.expectVisible();
    const changes = await fetchPlanChanges(page.request);
    expect(changes.map((change) => change.type), 'nothing skipped or shortened').toEqual(['plan_created']);
    expect(changes[0]?.reason).toBe(`Lernplan ab ${START_LEVEL} erstellt, Einstufung übersprungen`);
    await plan.expectHistory(changes);

    await plan.toPathButton.click();
    const path = new LearningPathPage(page);
    await path.expectVisible();
    const data = await fetchPath(page.request);
    const units = data.stages.flatMap((stage) => stage.units);
    expect(
      units.filter((unit) => unit.status !== 'planned' && unit.status !== 'in_progress'),
      'a new learner has done nothing yet, and a placement alone skips no unit (PRD F3)',
    ).toEqual([]);
    expect(
      data.stages.filter((stage) => stage.checkpoint.status !== 'locked'),
      'no unit done, so every checkpoint is locked (PRD 5)',
    ).toEqual([]);
    const unit = currentUnit(data);
    await expect(path.unit(unit.title).getByRole('button', { name: 'Lektion 1, als Nächstes' })).toBeVisible();
    await expect(path.currentNode).toHaveCount(1);
  });

  const elapsedMs = clock.elapsedMs();
  test.info().annotations.push({ type: 'first start', description: `${Math.round(elapsedMs)} ms` });
  expect(elapsedMs, 'from the welcome screen to the path (PRD F1)').toBeLessThan(ONBOARDING_LIMIT_MS);

  expect(await fetchMe(page.request)).toMatchObject({
    displayName: LEARNER.displayName,
    currentLevel: START_LEVEL,
    onboardingCompleted: true,
    onboardingStep: 'done',
    motivations: ONBOARDING.motivations.map(({ value }) => value),
    dailyGoalMinutes: ONBOARDING.dailyGoal.minutes,
    selfAssessment: ONBOARDING.selfAssessment.value,
  });
  await page.context().storageState({ path: PATHS.authState });
});
