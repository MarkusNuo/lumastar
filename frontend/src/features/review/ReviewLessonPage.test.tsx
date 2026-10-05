import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { lessonResponse } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { ReviewLessonPage } from './ReviewLessonPage';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));

function renderReviewLesson(start: () => Response) {
  const requests = stubApi({
    'POST /api/review/lessons': start,
    'GET /api/content/standard-forms': () => jsonResponse({ words: [], patterns: [] }),
  });
  const router = createMemoryRouter(
    [
      { path: '/wiederholen/lektion', element: <ReviewLessonPage /> },
      { path: '/wiederholen', element: <h1>Wiederholen</h1> },
    ],
    { initialEntries: ['/wiederholen/lektion'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, requests, user: userEvent.setup() };
}

describe('ReviewLessonPage', () => {
  it('plays the review lesson in the lesson player', async () => {
    const { requests } = renderReviewLesson(() =>
      jsonResponse(lessonResponse({ kind: 'review', unitId: 'review' }), 201),
    );

    expect(
      await screen.findByRole('heading', { name: 'Wie sagt man „guten Tag“?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lektionsfortschritt' })).toBeInTheDocument();
    expect(requests.filter((request) => request.method === 'POST')).toHaveLength(1);
  });

  it('explains when nothing practicable is due and leads back to the tab', async () => {
    const { router, user } = renderReviewLesson(() =>
      problemResponse({ status: 409, code: 'no_reviews_due', detail: 'Nothing due' }),
    );

    expect(await screen.findByText(/Gerade ist nichts fällig/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nochmals versuchen' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Zurück zu Wiederholen' }));

    expect(router.state.location.pathname).toBe('/wiederholen');
  });
});
