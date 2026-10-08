import { expect, test, type Request, type Response } from '@playwright/test';
import { AppShell } from '../../pages/AppShell.ts';
import { LearningPathPage } from '../../pages/LearningPathPage.ts';
import { LevelRevealPage } from '../../pages/LevelRevealPage.ts';
import { COUNTED_STEPS, OnboardingPage } from '../../pages/OnboardingPage.ts';
import { PlacementIntroPage } from '../../pages/PlacementIntroPage.ts';
import { PlanPage } from '../../pages/PlanPage.ts';
import { RegisterPage } from '../../pages/RegisterPage.ts';
import { VerificationBanner, VerifyEmailPage } from '../../pages/VerifyEmailPage.ts';
import { WelcomePage } from '../../pages/WelcomePage.ts';
import { fetchAccount, fetchAuthStatus } from '../../support/auth.ts';
import { PATHS } from '../../support/env.ts';
import { LEARNER, ONBOARDING, START_LEVEL } from '../../support/learner.ts';
import { fetchMe } from '../../support/lessonApi.ts';
import { expectAccountMail, Inbox, linkIn, SUBJECTS } from '../../support/mailpit.ts';
import { isPlacementSkip, type PlacementResult } from '../../support/placementApi.ts';
import { currentUnit, fetchPath, fetchPlanChanges } from '../../support/planApi.ts';
import { snapOnAllPhones } from '../../support/screenshots.ts';
import { Stopwatch } from '../../support/stopwatch.ts';

/*
 * Runs once per test run, before every other project, so the first start of PRD F1 is captured once
 * at every phone size. The second test registers the learner every signed-in project shares (M8),
 * answers the questions with "Ich kann kein Wort", skips the placement test (A0, the same in every
 * run), confirms the address with the link from the mail and stores the session. A full placement
 * through the UI runs later as "Neu einstufen"; the account screens in detail: tests/account.
 */

/** PRD F1: the onboarding can be completed in under a minute. */
const ONBOARDING_LIMIT_MS = 60_000;

const isOnboardingAnswer = (response: Response) =>
  response.request().method() === 'PUT' && new URL(response.url()).pathname === '/api/onboarding';

const isRegistrationRequest = (request: Request) =>
  request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/register';

test('the welcome screen leads to the registration, which checks every field before sending it', async ({
  page,
}) => {
  const sent: Request[] = [];
  page.on('request', (request) => {
    if (isRegistrationRequest(request)) sent.push(request);
  });
  const welcome = new WelcomePage(page);
  const register = new RegisterPage(page);

  await page.goto('/');
  await welcome.expectVisible();
  await expect(welcome.loginLink).toBeVisible();
  await snapOnAllPhones(page, 'welcome');

  await welcome.registerLink.click();
  await register.expectVisible();
  await expect(register.progress).toHaveAttribute('aria-valuetext', `Schritt 1 von ${COUNTED_STEPS}`);
  await expect(register.nameInput, 'the form starts with the name').toBeFocused();
  await expect(register.inviteCodeInput, 'an open registration needs no invite code').toHaveCount(0);
  await expect(register.loginLink).toBeVisible();
  await snapOnAllPhones(page, 'register');

  await register.submitButton.click();
  await register.expectFieldError(register.nameInput, 'Bitte gib einen Namen ein.');
  await register.expectFieldError(register.emailInput, 'Bitte gib deine E-Mail-Adresse ein.');
  await register.expectFieldError(register.passwordInput, 'Bitte wähle ein Passwort.');

  await register.fill({ displayName: '   ', email: 'testa@lingora', password: 'kurz123' });
  await register.submitButton.click();
  await register.expectFieldError(register.nameInput, 'Bitte gib einen Namen ein.');
  await register.expectFieldError(register.emailInput, 'Diese E-Mail-Adresse sieht nicht vollständig aus.');
  await register.expectFieldError(register.passwordInput, 'Mindestens 8 Zeichen, bitte.');
  await snapOnAllPhones(page, 'register-errors');

  await register.backButton.click();
  await welcome.expectVisible();
  expect(sent, 'invalid input never reaches the backend').toEqual([]);
  expect(await fetchAuthStatus(page.request)).toMatchObject({ authenticated: false, registrationMode: 'open' });
});

test('the first start: registration, onboarding questions and the skipped placement lead to the path at A0 in under a minute; the mailed link confirms the address', async ({
  page,
}) => {
  test.setTimeout(3 * 60_000);
  await page.goto('/');
  const welcome = new WelcomePage(page);
  await welcome.expectVisible();

  const clock = new Stopwatch();
  const snapAll = (name: string) => clock.excluding(() => snapOnAllPhones(page, name));
  const onboarding = new OnboardingPage(page);

  await test.step('registration', async () => {
    await welcome.registerLink.click();
    const register = new RegisterPage(page);
    await register.expectVisible();
    const response = await register.register(LEARNER);
    expect(response.status(), await response.text()).toBe(201);
    expect(await response.json()).toMatchObject({ displayName: LEARNER.displayName, onboardingCompleted: false });
    await onboarding.expectQuestion('motivation');
    await expect(
      page.getByRole('status').getByText(`Willkommen! Wir haben dir einen Bestätigungslink an ${LEARNER.email} geschickt.`),
    ).toBeVisible();
    expect(await fetchAuthStatus(page.request)).toMatchObject({
      authenticated: true,
      displayName: LEARNER.displayName,
      emailVerified: false,
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

    // The app keeps a copy of every unsafe request for a CSRF retry, which turns its body into a
    // stream that Chromium reports without data; an intercepted request carries it.
    await page.route('**/api/onboarding', (route) => route.fallback());
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

  await test.step('the link of the verification mail confirms the address', async () => {
    // The other projects then see the app without the reminder, as a learner usually does.
    const banner = new VerificationBanner(page);
    await banner.expectFor(LEARNER.email);
    await snapOnAllPhones(page, 'home-verification-banner', { fullPage: false });

    const mail = await new Inbox(LEARNER.email).next(SUBJECTS.verify);
    expectAccountMail(mail, LEARNER.displayName);
    expect(mail.text).toContain('Der Link ist 48 Stunden gültig.');
    const verify = new VerifyEmailPage(page);
    await verify.open(linkIn(mail, '/verify-email'));
    await expect(verify.doneHeading).toBeVisible();
    await snapOnAllPhones(page, 'verify-email-done');

    await verify.toAppLink.click();
    await new AppShell(page).expectHome();
    await expect(banner.region).toHaveCount(0);
    expect(await fetchAccount(page.request)).toMatchObject({ email: LEARNER.email, emailVerified: true });
  });

  await page.context().storageState({ path: PATHS.authState });
});
