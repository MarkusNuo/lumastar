import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { PlacementResult } from '../../../api/types';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../../test/http';
import { ONBOARDING_ROUTES } from '../../onboarding/onboardingRoutes';
import { SAMPLE_PLACEMENT_RESULT } from '../samplePlacement';
import { LevelRevealPage } from './LevelRevealPage';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const { testId } = SAMPLE_PLACEMENT_RESULT;

function renderReveal(result: PlacementResult) {
  stubApi({ [`GET /api/placement/${testId}/result`]: () => jsonResponse(result) });
  const router = createMemoryRouter(
    [
      { path: ONBOARDING_ROUTES.placementResult(':testId'), element: <LevelRevealPage /> },
      { path: ONBOARDING_ROUTES.plan, element: <h1>Lernplan</h1> },
    ],
    { initialEntries: [ONBOARDING_ROUTES.placementResult(testId)] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

async function leaveReveal(user: ReturnType<typeof userEvent.setup>) {
  const toPlan = await screen.findByRole('button', { name: 'Meinen Lernplan ansehen' });
  await waitFor(() => expect(toPlan).toBeEnabled());
  await user.click(toPlan);
}

describe('LevelRevealPage', () => {
  it('lets the streak flame blaze after the reveal of a test that met today’s goal', async () => {
    const { router, user } = renderReveal({
      ...SAMPLE_PLACEMENT_RESULT,
      dailyGoal: { minutesToday: 6, goalMinutes: 5, goalMet: true, justMet: true },
      streak: { current: 1, extendedToday: true, freezeUsed: false },
    });

    await leaveReveal(user);

    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 Tag Streak!', level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(router.state.location.pathname).toBe(ONBOARDING_ROUTES.plan);
  });

  it('goes straight to the plan while today’s goal is still open', async () => {
    const { router, user } = renderReveal(SAMPLE_PLACEMENT_RESULT);

    await leaveReveal(user);

    expect(screen.queryByTestId('streak-celebration')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe(ONBOARDING_ROUTES.plan);
  });

  it('celebrates no streak that an earlier lesson of the day extended already', async () => {
    const { router, user } = renderReveal({
      ...SAMPLE_PLACEMENT_RESULT,
      dailyGoal: { minutesToday: 14, goalMinutes: 10, goalMet: true, justMet: false },
      streak: { current: 3, extendedToday: true, freezeUsed: false },
    });

    await leaveReveal(user);

    expect(router.state.location.pathname).toBe(ONBOARDING_ROUTES.plan);
  });
});
