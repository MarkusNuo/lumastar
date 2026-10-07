import type { ComponentType } from 'react';
import type { RouteObject } from 'react-router';
import { ACCOUNT_ROUTES } from '../features/account/accountRoutes';
import { EmailRequiredGuard } from '../features/account/EmailRequiredGuard';
import { AuthGuard } from '../features/auth/AuthGuard';
import { AUTH_ROUTES } from '../features/auth/authRoutes';
import { CheckpointPage } from '../features/checkpoint/CheckpointPage';
import { CHECKPOINT_ROUTE } from '../features/checkpoint/checkpointRoutes';
import { LessonPage } from '../features/lesson/LessonPage';
import { OnboardingGuard } from '../features/onboarding/OnboardingGuard';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { ONBOARDING_ROUTES } from '../features/onboarding/onboardingRoutes';
import { LearningPathPage } from '../features/path/LearningPathPage';
import { NEXT_LESSON_ROUTE } from '../features/path/lessonRoute';
import { NextLessonPage } from '../features/path/NextLessonPage';
import { PlacementIntroPage } from '../features/placement/PlacementIntroPage';
import { PlacementTestPage } from '../features/placement/PlacementTestPage';
import { LevelRevealPage } from '../features/placement/reveal/LevelRevealPage';
import { PlanPage } from '../features/plan/PlanPage';
import { REMINDER_ROUTE } from '../features/reminders/reminderRoutes';
import { ReviewLessonPage } from '../features/review/ReviewLessonPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { REVIEW_ROUTES } from '../features/review/reviewRoutes';
import { ProfilePage } from '../features/settings/ProfilePage';
import { PracticeLessonPage } from '../features/stats/PracticeLessonPage';
import { StatsPage } from '../features/stats/StatsPage';
import { STATS_ROUTES } from '../features/stats/statsRoutes';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import { SignedInSession } from './SignedInSession';
import { SplashScreen } from './SplashScreen';

/** A screen loaded on its first visit, which keeps it out of everyone else's start bundle. */
function lazyScreen(path: string, load: () => Promise<ComponentType>): RouteObject {
  return { path, HydrateFallback: SplashScreen, lazy: { Component: load } };
}

const authScreens = () => import('../features/auth/screens');
const accountScreens = () => import('../features/account/screens');

/**
 * The app's routes. A factory, because the router fills in lazy screens on the route objects it
 * was given, so every router (one in the app, one per test) needs its own.
 */
export function createRoutes(): RouteObject[] {
  return [
    {
      element: <AuthGuard area="signedOut" />,
      children: [
        lazyScreen(AUTH_ROUTES.welcome, async () => (await authScreens()).WelcomePage),
        lazyScreen(AUTH_ROUTES.register, async () => (await authScreens()).RegisterPage),
        lazyScreen(AUTH_ROUTES.login, async () => (await authScreens()).LoginPage),
        lazyScreen(AUTH_ROUTES.legacyLogin, async () => (await authScreens()).LegacyLoginPage),
        lazyScreen(
          AUTH_ROUTES.forgotPassword,
          async () => (await authScreens()).ForgotPasswordPage,
        ),
      ],
    },
    // Public: the links from mails work with and without a session.
    lazyScreen(AUTH_ROUTES.verifyEmail, async () => (await authScreens()).VerifyEmailPage),
    lazyScreen(AUTH_ROUTES.resetPassword, async () => (await authScreens()).ResetPasswordPage),
    {
      element: <AuthGuard area="signedIn" />,
      children: [
        {
          element: (
            <>
              <SignedInSession />
              <EmailRequiredGuard />
            </>
          ),
          children: [
            lazyScreen(ACCOUNT_ROUTES.addEmail, async () => (await accountScreens()).AddEmailPage),
            {
              element: <OnboardingGuard />,
              children: [
                {
                  path: ONBOARDING_ROUTES.home,
                  Component: AppShell,
                  children: [
                    { index: true, Component: LearningPathPage },
                    { path: REVIEW_ROUTES.home, Component: ReviewPage },
                    { path: STATS_ROUTES.home, Component: StatsPage },
                    { path: ACCOUNT_ROUTES.profile, Component: ProfilePage },
                    { path: '*', Component: NotFoundPage },
                  ],
                },
                // Full screens without the app navigation: one task per screen (PRD 12.1).
                { path: '/lesson/:unitId', Component: LessonPage },
                { path: NEXT_LESSON_ROUTE, Component: NextLessonPage },
                { path: REVIEW_ROUTES.lesson, Component: ReviewLessonPage },
                { path: STATS_ROUTES.practice, Component: PracticeLessonPage },
                { path: CHECKPOINT_ROUTE, Component: CheckpointPage },
                { path: ONBOARDING_ROUTES.questions, Component: OnboardingPage },
                { path: ONBOARDING_ROUTES.placementIntro, Component: PlacementIntroPage },
                { path: ONBOARDING_ROUTES.placementTest, Component: PlacementTestPage },
                { path: ONBOARDING_ROUTES.placementResult(':testId'), Component: LevelRevealPage },
                { path: ONBOARDING_ROUTES.plan, Component: PlanPage },
                lazyScreen(
                  ACCOUNT_ROUTES.displayName,
                  async () => (await accountScreens()).ChangeDisplayNamePage,
                ),
                lazyScreen(
                  ACCOUNT_ROUTES.email,
                  async () => (await accountScreens()).ChangeEmailPage,
                ),
                lazyScreen(
                  ACCOUNT_ROUTES.password,
                  async () => (await accountScreens()).ChangePasswordPage,
                ),
                lazyScreen(
                  ACCOUNT_ROUTES.delete,
                  async () => (await accountScreens()).DeleteAccountPage,
                ),
                lazyScreen(
                  REMINDER_ROUTE,
                  async () => (await import('../features/reminders/RemindersPage')).RemindersPage,
                ),
              ],
            },
          ],
        },
      ],
    },
    // Public on purpose: the design catalog needs no account (and no backend).
    lazyScreen('/dev/ui', async () => (await import('../dev/ui/CatalogPage')).CatalogPage),
  ];
}
