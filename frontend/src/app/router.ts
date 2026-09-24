import { createBrowserRouter } from 'react-router';
import { PathPreviewPage } from '../features/path/PathPreviewPage';
import { AppShell } from './AppShell';
import { PlaceholderPage } from './PlaceholderPage';
import { RouteFallback } from './RouteFallback';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppShell,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, Component: PathPreviewPage },
      { path: '*', Component: PlaceholderPage },
    ],
  },
  {
    path: '/dev/ui',
    HydrateFallback: RouteFallback,
    lazy: {
      Component: async () => (await import('../dev/ui/CatalogPage')).CatalogPage,
    },
  },
]);
