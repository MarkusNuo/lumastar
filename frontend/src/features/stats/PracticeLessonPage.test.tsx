import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { lessonResponse } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { PracticeLessonPage } from './PracticeLessonPage';
import { practiceRoute } from './statsRoutes';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));

function renderPractice(start: () => Response) {
  const requests = stubApi({
    'POST /api/lessons': start,
    'GET /api/content/standard-forms': () => jsonResponse({ words: [], patterns: [] }),
  });
  const router = createMemoryRouter(
    [
      { path: '/statistik/ueben/:skillTag', element: <PracticeLessonPage /> },
      { path: '/statistik', element: <h1>Statistik</h1> },
    ],
    { initialEntries: [practiceRoute('grammar.definite_article')] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, requests, user: userEvent.setup() };
}

describe('PracticeLessonPage', () => {
  it('starts a practice lesson on the skill tag and plays it', async () => {
    const { requests } = renderPractice(() =>
      jsonResponse(
        lessonResponse({ kind: 'practice', unitId: 'practice_grammar.definite_article' }),
        201,
      ),
    );

    expect(
      await screen.findByRole('heading', { name: 'Wie sagt man „guten Tag“?' }),
    ).toBeInTheDocument();
    const starts = requests.filter((request) => request.method === 'POST');
    expect(starts).toHaveLength(1);
    expect(await starts[0]?.json()).toEqual({
      kind: 'practice',
      skillTag: 'grammar.definite_article',
    });
  });

  it('explains when no exercise at the level carries the tag and leads back', async () => {
    const { router, user } = renderPractice(() =>
      problemResponse({ status: 409, code: 'no_practice_exercises', detail: 'None' }),
    );

    expect(await screen.findByText(/gibt es auf deinem Niveau noch keine Übungen/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nochmals versuchen' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zur Statistik' }));

    expect(router.state.location.pathname).toBe('/statistik');
  });
});
