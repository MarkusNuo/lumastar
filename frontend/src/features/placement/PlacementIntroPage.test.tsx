import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Profile } from '../../api/types';
import { ONBOARDING_OPTIONS, profile } from '../../test/fixtures';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { PlacementIntroPage } from './PlacementIntroPage';
import { SAMPLE_PLACEMENT_RESULT } from './samplePlacement';

type Routes = Parameters<typeof stubApi>[0];

const SKIPPED = {
  ...SAMPLE_PLACEMENT_RESULT,
  testId: 'skip-1',
  level: 'A0',
  skipped: true,
} as const;

function renderIntro(learner: Profile, routes: Routes = {}) {
  const requests = stubApi({
    'GET /api/me': () => jsonResponse(learner),
    'GET /api/onboarding/options': () => jsonResponse(ONBOARDING_OPTIONS),
    ...routes,
  });
  const router = createMemoryRouter(
    [
      { path: '/einstufung', element: <PlacementIntroPage /> },
      { path: '/einstufung/test', element: <h1>Test</h1> },
      { path: '/einstufung/ergebnis/:testId', element: <h1>Ergebnis</h1> },
      { path: '/onboarding', element: <h1>Fragen</h1> },
      { path: '/', element: <h1>Lernpfad</h1> },
    ],
    { initialEntries: ['/einstufung'] },
  );
  const view = renderWithQueryClient(<RouterProvider router={router} />);
  return { ...view, requests, router, user: userEvent.setup() };
}

const beginner = profile({
  onboardingStep: 'placement',
  motivations: ['family'],
  selfAssessment: 'nothing',
});

describe('PlacementIntroPage', () => {
  it('starts the test', async () => {
    const { user, router } = renderIntro(profile({ ...beginner, selfAssessment: 'few_words' }));

    expect(
      await screen.findByRole('heading', { name: 'Finden wir dein Niveau' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ich fange bei null an' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Test starten' }));

    expect(router.state.location.pathname).toBe('/einstufung/test');
  });

  it('lets a learner who knows no word start at A0 and shows the result right away', async () => {
    const { user, router, requests, queryClient } = renderIntro(beginner, {
      'POST /api/placement/skip': () => jsonResponse(SKIPPED),
    });

    await user.click(await screen.findByRole('button', { name: 'Ich fange bei null an' }));

    expect(await screen.findByRole('heading', { name: 'Ergebnis' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/einstufung/ergebnis/skip-1');
    expect(queryClient.getQueryData(['placement', 'result', 'skip-1'])).toEqual(SKIPPED);
    expect(requests.some((request) => request.url.endsWith('/api/placement/skip'))).toBe(true);
  });

  it('leads back to the questions before the first test', async () => {
    const { user, router } = renderIntro(beginner);

    await user.click(await screen.findByRole('button', { name: 'Zurück' }));

    expect(router.state.location.pathname).toBe('/onboarding');
  });

  it('explains a new placement to a placed learner and never offers the skip', async () => {
    renderIntro(
      profile({
        onboardingStep: 'done',
        onboardingCompleted: true,
        currentLevel: 'A2.1',
        selfAssessment: 'nothing',
      }),
    );

    expect(await screen.findByRole('heading', { name: 'Neu einstufen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ich fange bei null an' })).not.toBeInTheDocument();
  });
});
