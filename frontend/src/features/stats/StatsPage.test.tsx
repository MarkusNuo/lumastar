import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Stats } from '../../api/types';
import { todayProgress } from '../../test/fixtures';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { SAMPLE_STATS } from './sampleStats';
import { StatsPage } from './StatsPage';

type Routes = Parameters<typeof stubApi>[0];

function renderStats(stats: Stats = SAMPLE_STATS, routes: Routes = {}) {
  stubApi({
    'GET /api/stats': () => jsonResponse(stats),
    'GET /api/progress/today': () => jsonResponse(todayProgress({}, { current: 6, longest: 21 })),
    ...routes,
  });
  const router = createMemoryRouter(
    [
      { path: '/statistik', element: <StatsPage /> },
      { path: '/statistik/ueben/:skillTag', element: <h1>Gezielt üben</h1> },
      { path: '/wiederholen', element: <h1>Wiederholen</h1> },
    ],
    { initialEntries: ['/statistik'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

const region = (name: string) => screen.findByRole('region', { name });

describe('StatsPage', () => {
  it('leads with the streak, the record and the learned words', async () => {
    renderStats();

    expect(await screen.findByText('Streak: 6 Tage')).toBeInTheDocument();
    expect(screen.getByText('Längster Streak: 21 Tage')).toBeInTheDocument();
    expect(screen.getByText('128 Wörter gelernt')).toBeInTheDocument();
  });

  it('shows the level and the progress towards the checkpoint', async () => {
    renderStats();

    const level = await region('Niveau');
    expect(within(level).getByText('A1.2 · Alltag zu Hause')).toBeInTheDocument();
    expect(within(level).getByText('Danach: A1.3')).toBeInTheDocument();
    expect(
      within(level).getByRole('progressbar', { name: 'Fortschritt zur nächsten Stufe' }),
    ).toHaveAttribute('aria-valuetext', '57 %');
    expect(within(level).getByText('4 von 7 Einheiten geschafft')).toBeInTheDocument();
    expect(within(level).getByText('Checkpoint noch gesperrt')).toBeInTheDocument();
  });

  it('says so before the first placement', async () => {
    renderStats({ ...SAMPLE_STATS, level: undefined });

    expect(within(await region('Niveau')).getByText('Noch nicht eingestuft')).toBeInTheDocument();
  });

  it('measures the mastery of each of the five areas', async () => {
    renderStats();

    const mastery = await region('Können pro Bereich');
    const meters = within(mastery).getAllByRole('meter');
    expect(meters.map((meter) => meter.getAttribute('aria-label'))).toEqual([
      'Wortschatz',
      'Wendungen',
      'Grammatik',
      'Schreiben',
      'Lesen',
    ]);
    expect(within(mastery).getByRole('meter', { name: 'Wortschatz' })).toHaveAttribute(
      'aria-valuetext',
      '72 %',
    );
    expect(within(mastery).getByRole('meter', { name: 'Lesen' })).toHaveAttribute(
      'aria-valuetext',
      'noch keine Daten',
    );
  });

  it('lists the most frequent errors and starts a practice lesson for one of them', async () => {
    const { router, user } = renderStats();

    const errors = await region('Häufigste Fehler');
    expect(within(errors).getAllByRole('listitem')).toHaveLength(3);
    expect(within(errors).getByText('9 von 20 Antworten falsch · Artikel')).toBeVisible();
    expect(
      within(errors).getByRole('meter', { name: 'Fehlerquote Bestimmter Artikel' }),
    ).toHaveAttribute('aria-valuetext', '45 %');

    await user.click(within(errors).getByRole('button', { name: 'Gezielt üben: Nasalvokale' }));

    expect(router.state.location.pathname).toBe('/statistik/ueben/spelling.nasal_vowel');
  });

  it('offers no practice where no exercise at the level carries the tag', async () => {
    renderStats();

    const row = within(await region('Häufigste Fehler'))
      .getByText('Klitika')
      .closest('li') as HTMLElement;
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(within(row).getByText(/noch keine Übungen/)).toBeInTheDocument();
  });

  it('celebrates when nothing went wrong repeatedly', async () => {
    renderStats({ ...SAMPLE_STATS, topErrors: [] });

    const errors = await region('Häufigste Fehler');
    expect(within(errors).getByText('Keine häufigen Fehler')).toBeInTheDocument();
    expect(within(errors).queryByRole('button')).not.toBeInTheDocument();
  });

  it('summarises the learning days of the heatmap in words', async () => {
    renderStats();

    const days = await region('Lerntage');
    expect(
      within(days).getByText(
        /^An \d+ Tagen geübt · \d+-mal Tagesziel erreicht · 1 Tag mit Streak-Schutz überbrückt$/,
      ),
    ).toBeInTheDocument();
    const cells = within(days).getByTestId('heatmap-grid').children;
    expect(cells).toHaveLength(365);
    expect(within(days).getByTestId('heatmap-grid').querySelector('[data-today]')).toHaveAttribute(
      'data-level',
    );
  });

  it('forecasts tomorrow’s reviews and the next seven days', async () => {
    const { router, user } = renderStats();

    const forecast = await region('Wiederholungen');
    expect(within(forecast).getByText('Morgen fällig: 34')).toBeInTheDocument();
    expect(within(forecast).getByText('Jetzt fällig: 5')).toBeInTheDocument();
    const days = within(
      within(forecast).getByRole('list', { name: 'Fällige Wörter in den nächsten 7 Tagen' }),
    ).getAllByRole('listitem');
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveTextContent('Heute: 8 fällig');
    expect(days[1]).toHaveTextContent('Dienstag, 6. Oktober: 34 fällig');

    await user.click(within(forecast).getByRole('button', { name: 'Jetzt wiederholen' }));

    expect(router.state.location.pathname).toBe('/wiederholen');
  });

  it('hides the review button while nothing is due', async () => {
    renderStats({ ...SAMPLE_STATS, forecast: { ...SAMPLE_STATS.forecast, dueNow: 0 } });

    const forecast = await region('Wiederholungen');
    expect(within(forecast).getByText('Gerade ist nichts fällig.')).toBeInTheDocument();
    expect(within(forecast).queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers a retry when the statistics cannot be loaded', async () => {
    renderStats(SAMPLE_STATS, {
      'GET /api/stats': () => problemResponse({ status: 500, code: 'internal_error' }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deine Statistik konnte nicht geladen werden.',
    );
    expect(screen.getByRole('button', { name: 'Nochmals versuchen' })).toBeEnabled();
  });
});
