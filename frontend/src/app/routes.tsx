import type { RouteObject } from 'react-router';
import { AuthGuard } from '../features/auth/AuthGuard';
import { LoginPage } from '../features/auth/LoginPage';
import { SetupPage } from '../features/onboarding/SetupPage';
import { PathPreviewPage } from '../features/path/PathPreviewPage';
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
          { index: true, Component: PathPreviewPage },
          { path: 'profil', Component: ProfilePage },
          { path: '*', Component: PlaceholderPage },
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
