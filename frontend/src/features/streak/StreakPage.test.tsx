import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StreakOverview } from './model';
import { jsonResponse, problemResponse, stubApi } from '../../test/http';
import { renderRoutes, screenNamed } from '../../test/router';
import {
  SAMPLE_EMPTY_MONTH,
  SAMPLE_STREAK,
  SAMPLE_STREAK_COLD,
  SAMPLE_STREAK_GOAL_REACHED,
} from './sampleStreak';
import { StreakPage } from './StreakPage';

function renderPage(entry = '/streak') {
  const rendered = renderRoutes(
    [
      { path: '/', element: screenNamed('Lernpfad') },
      { path: '/streak', element: <StreakPage /> },
    ],
    entry,
  );
  return { user: userEvent.setup(), ...rendered };
}

/** Answers GET /api/streak per asked month; the current month without a parameter. */
function stubStreak(byMonth: Record<string, StreakOverview>) {
  return stubApi({
    'GET /api/streak': (request) => {
      const month = new URL(request.url).searchParams.get('month') ?? 'current';
      const overview = byMonth[month];
      return overview
        ? jsonResponse(overview)
        : problemResponse({ status: 400, code: 'bad_request', detail: 'month' });
    },
  });
}

describe('StreakPage', () => {
  it('shows the burning streak with its calendar, goal and freeze', async () => {
    stubStreak({ current: SAMPLE_STREAK });
    renderPage();

    expect(await screen.findByText('12 Tage Streak')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Streak', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Heute geschafft!')).toBeInTheDocument();
    expect(screen.getByText('Rekord: 21 Tage')).toBeInTheDocument();
    expect(screen.getByTestId('streak-hero').querySelector('[data-lit="true"]')).not.toBeNull();
    expect(screen.getByRole('table', { name: 'Oktober 2026' })).toBeInTheDocument();
    expect(screen.getByText('Ziel: 20 Tage')).toBeInTheDocument();
    const freeze = screen.getByRole('region', { name: 'Streak-Schutz' });
    expect(within(freeze).getByText('Diese Woche eingesetzt')).toBeInTheDocument();
    expect(
      within(freeze).getByText('Wird am Montag, 12. Oktober zurückgesetzt.'),
    ).toBeInTheDocument();
    expect(within(freeze).getByText('Zuletzt eingesetzt am Samstag, 3. Oktober.')).toBeVisible();
  });

  it('says how much is left today while the flame is grey', async () => {
    stubStreak({ current: SAMPLE_STREAK_COLD });
    renderPage();

    expect(await screen.findByText('Heute noch 6 Min. bis zum Tagesziel')).toBeInTheDocument();
    expect(screen.getByTestId('streak-hero').querySelector('[data-lit="false"]')).not.toBeNull();
  });

  it('opens earlier months through the URL and keeps the shown one while loading', async () => {
    const requests = stubStreak({
      current: SAMPLE_STREAK,
      '2026-09': { ...SAMPLE_STREAK, calendar: { ...SAMPLE_EMPTY_MONTH, month: '2026-09' } },
    });
    const { router, user } = renderPage();

    await user.click(await screen.findByRole('button', { name: 'Vorheriger Monat' }));

    expect(await screen.findByRole('table', { name: 'September 2026' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?month=2026-09');
    expect(new URL(requests.at(-1)?.url ?? '').searchParams.get('month')).toBe('2026-09');

    await user.click(screen.getByRole('button', { name: 'Nächster Monat' }));

    expect(await screen.findByRole('table', { name: 'Oktober 2026' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('opens the month in the URL and ignores one that is no month', async () => {
    stubStreak({
      current: SAMPLE_STREAK,
      '2026-09': { ...SAMPLE_STREAK, calendar: { ...SAMPLE_EMPTY_MONTH, month: '2026-09' } },
    });
    renderPage('/streak?month=2026-09');
    expect(await screen.findByRole('table', { name: 'September 2026' })).toBeInTheDocument();
  });

  it('saves the next goal and shows the fresh streak', async () => {
    let overview = SAMPLE_STREAK_GOAL_REACHED;
    const requests = stubApi({
      'GET /api/streak': () => jsonResponse(overview),
      'PUT /api/streak/goal': () => {
        overview = {
          ...overview,
          goal: { target: 30, progress: 10, reached: false, options: [] },
        };
        return jsonResponse(overview.goal);
      },
    });
    const { user } = renderPage();

    await user.click(await screen.findByRole('radio', { name: '30 Tage' }));

    expect(await screen.findByText('Ziel: 30 Tage')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Neues Ziel: 30 Tage');
    const put = requests.find((request) => request.method === 'PUT');
    expect(await put?.json()).toEqual({ target: 30 });
  });

  it('offers a retry when the streak cannot be loaded', async () => {
    stubApi({ 'GET /api/streak': () => Promise.reject(new TypeError('Failed to fetch')) });
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Dein Streak konnte nicht geladen werden.',
    );
    expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeEnabled();
  });

  it('goes back to the learning path when opened directly', async () => {
    stubStreak({ current: SAMPLE_STREAK });
    const { router, user } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Zurück' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
