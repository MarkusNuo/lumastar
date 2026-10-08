import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { AttemptResponse, LessonResultResponse } from '../../api/types';
import { lessonResponse } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { CheckpointPage } from './CheckpointPage';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const CHECKPOINT = lessonResponse({ kind: 'checkpoint', unitId: 'checkpoint_A1.2' });
const SESSION = CHECKPOINT.sessionId;

const ATTEMPT: AttemptResponse = {
  exerciseId: 'ex_a1_u01_greetings_001',
  outcome: 'correct',
  countsAsCorrect: true,
  explanation: 'Erklärung',
  rating: 'good',
};

const RESULT: LessonResultResponse = {
  kind: 'checkpoint',
  xpEarned: 20,
  xpBreakdown: { base: 10, perfectBonus: 5, speedBonus: 5 },
  xpTotal: 320,
  accuracy: 1,
  correctCount: 1,
  exerciseCount: 1,
  durationMs: 40_000,
  learnedItems: [],
  learnedWordsTotal: 12,
  dailyGoal: { goalMet: false, goalMinutes: 10, justMet: false, minutesToday: 3 },
  streak: { current: 0, previous: 0, extendedToday: false, freezeUsed: false },
  checkpoint: {
    level: 'A1.2',
    passed: true,
    newLevel: 'A1.3',
    requiredAccuracy: 0.8,
    badges: [],
  },
};

function renderCheckpoint(level: string, start: () => Response) {
  const requests = stubApi({
    'POST /api/checkpoints': start,
    'GET /api/content/standard-forms': () => jsonResponse({ words: [], patterns: [] }),
    [`POST /api/lessons/${SESSION}/attempts`]: () => jsonResponse(ATTEMPT),
    [`POST /api/lessons/${SESSION}/complete`]: () => jsonResponse(RESULT),
  });
  const router = createMemoryRouter(
    [
      { path: '/checkpoint/:level', element: <CheckpointPage /> },
      { path: '/', element: <h1>Lernpfad</h1> },
    ],
    { initialEntries: [`/checkpoint/${level}`] },
  );
  const view = renderWithQueryClient(<RouterProvider router={router} />);
  return { ...view, router, requests, user: userEvent.setup() };
}

describe('CheckpointPage', () => {
  it('starts the checkpoint of the stage, plays it and ends with the level-up', async () => {
    const { requests, user, queryClient } = renderCheckpoint('A1.2', () =>
      jsonResponse(CHECKPOINT, 201),
    );
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await user.click(await screen.findByRole('button', { name: /mirëdita/ }));
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(await screen.findByRole('button', { name: 'Weiter' }));

    expect(await screen.findByText('Checkpoint A1.2 bestanden!')).toBeInTheDocument();
    expect(await requests[0]?.clone().json()).toEqual({ level: 'A1.2' });
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toContainEqual(['badges']);
  });

  it.each([
    ['checkpoint_locked', 'Schliesse zuerst alle Einheiten dieser Stufe ab.'],
    ['checkpoint_passed', 'Diesen Checkpoint hast du schon bestanden.'],
  ])('explains a refused start (%s) and leads back to the path', async (code, text) => {
    const { router, user } = renderCheckpoint('A1.2', () =>
      problemResponse({ status: 409, code, detail: 'Refused' }),
    );

    expect(await screen.findByText(text)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zum Lernpfad' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('does not ask the server for a level that does not exist', async () => {
    const { requests } = renderCheckpoint('Z9', () => jsonResponse(CHECKPOINT, 201));

    expect(
      await screen.findByText('Diese Stufe gehört nicht zu deinem Lernplan.'),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});
