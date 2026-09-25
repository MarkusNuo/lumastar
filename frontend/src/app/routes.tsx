import type { RouteObject } from 'react-router';
import { AuthGuard } from '../features/auth/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { LessonPage } from '../features/lesson/LessonPage';
import { SetupPage } from '../features/onboarding/SetupPage';
import { LearningPathPage } from '../features/path/LearningPathPage';
import { ProfilePage } from '../features/settings/ProfilePage';
import { AppShell } from './AppShell';
import { PlaceholderPage } from './PlaceholderPage';
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
        path: '/',
        Component: AppShell,
        children: [
          { index: true, Component: LearningPathPage },
          { path: 'profil', Component: ProfilePage },
          { path: '*', Component: PlaceholderPage },
        ],
      },
      // Full screen without the app navigation: one task per screen (PRD 12.1).
      { path: '/lesson/:unitId', Component: LessonPage },
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
