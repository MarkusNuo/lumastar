import type { RouteObject } from 'react-router';
import { AuthGuard } from '../features/auth/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { CheckpointPage } from '../features/checkpoint/CheckpointPage';
import { CHECKPOINT_ROUTE } from '../features/checkpoint/checkpointRoutes';
import { LessonPage } from '../features/lesson/LessonPage';
import { OnboardingGuard } from '../features/onboarding/OnboardingGuard';
import { OnboardingPage } from '../features/onboarding/OnboardingPage';
import { ONBOARDING_ROUTES } from '../features/onboarding/onboardingRoutes';
import { SetupPage } from '../features/onboarding/SetupPage';
import { LearningPathPage } from '../features/path/LearningPathPage';
import { PlacementIntroPage } from '../features/placement/PlacementIntroPage';
import { PlacementTestPage } from '../features/placement/PlacementTestPage';
import { LevelRevealPage } from '../features/placement/reveal/LevelRevealPage';
import { PlanPage } from '../features/plan/PlanPage';
import { ReviewLessonPage } from '../features/review/ReviewLessonPage';
import { ReviewPage } from '../features/review/ReviewPage';
import { REVIEW_ROUTES } from '../features/review/reviewRoutes';
import { ProfilePage } from '../features/settings/ProfilePage';
import { PracticeLessonPage } from '../features/stats/PracticeLessonPage';
import { StatsPage } from '../features/stats/StatsPage';
import { STATS_ROUTES } from '../features/stats/statsRoutes';
import { AppShell } from './AppShell';
import { NotFoundPage } from './NotFoundPage';
import { SplashScreen } from './SplashScreen';

export const routes: RouteObject[] = [
  {
    element: <AuthGuard area="setup" />,
    children: [{ path: '/setup', Component: SetupPage }],
  },
  {
    element: <AuthGuard area="signedOut" />,
    children: [{ path: '/login', Component: LoginPage }],
  },
  {
    element: <AuthGuard area="signedIn" />,
    children: [
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
              { path: 'profil', Component: ProfilePage },
              { path: '*', Component: NotFoundPage },
            ],
          },
          // Full screens without the app navigation: one task per screen (PRD 12.1).
          { path: '/lesson/:unitId', Component: LessonPage },
          { path: REVIEW_ROUTES.lesson, Component: ReviewLessonPage },
          { path: STATS_ROUTES.practice, Component: PracticeLessonPage },
          { path: CHECKPOINT_ROUTE, Component: CheckpointPage },
          { path: ONBOARDING_ROUTES.questions, Component: OnboardingPage },
          { path: ONBOARDING_ROUTES.placementIntro, Component: PlacementIntroPage },
          { path: ONBOARDING_ROUTES.placementTest, Component: PlacementTestPage },
          { path: ONBOARDING_ROUTES.placementResult(':testId'), Component: LevelRevealPage },
          { path: ONBOARDING_ROUTES.plan, Component: PlanPage },
        ],
      },
    ],
  },
  {
    // Public on purpose: the design catalog needs no account (and no backend).
    path: '/dev/ui',
    HydrateFallback: SplashScreen,
    lazy: {
      Component: async () => (await import('../dev/ui/CatalogPage')).CatalogPage,
    },
  },
];
