import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ReviewSummary } from '../../api/types';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { ReviewPage } from './ReviewPage';

function renderReview(summary: () => Response) {
  stubApi({ 'GET /api/review/summary': summary });
  const router = createMemoryRouter(
    [
      { path: '/wiederholen', element: <ReviewPage /> },
      { path: '/wiederholen/lektion', element: <h1>Wiederholungslektion</h1> },
      { path: '/', element: <h1>Lernpfad</h1> },
    ],
    { initialEntries: ['/wiederholen'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

const summary = (fields: Partial<ReviewSummary>) => () =>
  jsonResponse({ dueNow: 0, dueTomorrow: 0, totalCards: 0, ...fields });

describe('ReviewPage', () => {
  it('shows what is due and starts a review lesson', async () => {
    const { router, user } = renderReview(summary({ dueNow: 12, dueTomorrow: 8, totalCards: 54 }));

    expect(screen.getByRole('heading', { name: 'Wiederholen', level: 1 })).toBeInTheDocument();
    const card = await screen.findByRole('region', { name: '12 Wörter fällig' });
    expect(within(card).getByText('Morgen fällig').nextSibling).toHaveTextContent('8');
    expect(within(card).getByText('Wörter gesamt').nextSibling).toHaveTextContent('54');
    expect(within(card).getByRole('img', { name: 'Maskottchen ermutigt dich' })).toBeVisible();

    await user.click(within(card).getByRole('button', { name: 'Wiederholung starten' }));

    expect(router.state.location.pathname).toBe('/wiederholen/lektion');
  });

  it('celebrates when everything is reviewed and offers new lessons instead', async () => {
    const { router, user } = renderReview(summary({ dueNow: 0, dueTomorrow: 5, totalCards: 30 }));

    const card = await screen.findByRole('region', { name: 'Alles wiederholt!' });
    expect(within(card).getByText('Morgen fällig: 5')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Maskottchen feiert' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Wiederholung starten' })).not.toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Neue Lektion lernen' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('says when nothing is due tomorrow either', async () => {
    renderReview(summary({ dueNow: 0, dueTomorrow: 0, totalCards: 30 }));

    expect(await screen.findByText('Morgen ist nichts fällig.')).toBeInTheDocument();
  });

  it('explains the tab before the first lesson', async () => {
    renderReview(summary({}));

    const card = await screen.findByRole('region', { name: 'Noch nichts zu wiederholen' });
    expect(within(card).queryByText('Wörter gesamt')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Zur ersten Lektion' })).toBeInTheDocument();
  });

  it('offers a retry when the counts cannot be loaded', async () => {
    renderReview(() =>
      problemResponse({ status: 503, code: 'unavailable', detail: 'Nicht erreichbar' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('nicht geladen werden');
    expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeInTheDocument();
  });
});
