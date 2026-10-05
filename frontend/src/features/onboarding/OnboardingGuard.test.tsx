import { screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { OnboardingStep } from '../../api/types';
import { profile } from '../../test/fixtures';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { OnboardingGuard } from './OnboardingGuard';

function renderAt(path: string, step: OnboardingStep) {
  stubApi({ 'GET /api/me': () => jsonResponse(profile({ onboardingStep: step })) });
  const router = createMemoryRouter(
    [
      {
        element: <OnboardingGuard />,
        children: [
          { path: '/', element: <h1>Lernpfad</h1> },
          { path: '/onboarding', element: <h1>Fragen</h1> },
          { path: '/einstufung', element: <h1>Einstufung</h1> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return router;
}

describe('OnboardingGuard', () => {
  it('asks the onboarding questions before anything else', async () => {
    const router = renderAt('/', 'profile');

    expect(await screen.findByRole('heading', { name: 'Fragen' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });

  it('continues with the placement once the questions are answered', async () => {
    const router = renderAt('/', 'placement');

    expect(await screen.findByRole('heading', { name: 'Einstufung' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/einstufung');
  });

  it('opens the app after the onboarding and closes the questions', async () => {
    const router = renderAt('/onboarding', 'done');

    expect(await screen.findByRole('heading', { name: 'Lernpfad' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows the connection screen when the profile cannot be loaded', async () => {
    stubApi({});
    const router = createMemoryRouter([{ path: '/', element: <OnboardingGuard /> }]);
    renderWithQueryClient(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Keine Verbindung' })).toBeInTheDocument();
  });
});
