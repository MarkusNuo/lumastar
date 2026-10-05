import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { PlanPage } from './PlanPage';
import { SAMPLE_PATH, SAMPLE_PLAN_CHANGES } from './samplePlan';

function renderPlan() {
  stubApi({
    'GET /api/path': () => jsonResponse(SAMPLE_PATH),
    'GET /api/plan/changes': () => jsonResponse(SAMPLE_PLAN_CHANGES),
  });
  const router = createMemoryRouter(
    [
      { path: '/plan', element: <PlanPage /> },
      { path: '/', element: <h1>Lernpfad</h1> },
    ],
    { initialEntries: ['/plan'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

/** The timeline entry of a band, found by its heading. */
async function bandItem(name: string) {
  const heading = await screen.findByRole('heading', { name, level: 2 });
  const item = heading.closest('li');
  if (!item) throw new Error(`${name} is not in a list item`);
  return item;
}

describe('PlanPage', () => {
  it('shows the plan as a timeline up to C2 with an expected date per band', async () => {
    renderPlan();

    expect(await screen.findByText('Von A1.2 bis C2')).toBeInTheDocument();
    expect(screen.getByText('bei 10 Min. pro Tag')).toBeInTheDocument();
    const timeline = screen.getByRole('list', { name: 'Zeitleiste bis C2' });
    expect(
      within(timeline)
        .getAllByRole('heading', { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      'A1 · Einstieg',
      'A2 · Grundlagen',
      'B1 · Mittelstufe',
      'C2 · Fast wie Muttersprache',
    ]);
    expect(await bandItem('A1 · Einstieg')).toHaveTextContent(/ca\. 16\. Nov\. 2026 · in ca\./);
    expect(screen.getByText('Ziel: C2')).toBeInTheDocument();
  });

  it('marks where the learner is and opens that band, with skipped and focus units', async () => {
    renderPlan();

    const current = await bandItem('A1 · Einstieg');
    expect(current).toHaveAttribute('aria-current', 'step');
    const a1 = within(current);
    expect(a1.getAllByText('Du bist hier')).toHaveLength(2);
    expect(a1.getByRole('progressbar', { name: 'Lektionen in A1' })).toHaveAttribute(
      'aria-valuetext',
      '2 von 16 Lektionen',
    );
    expect(a1.getByText('Übersprungen')).toBeInTheDocument();
    expect(a1.getByText('Im Einstufungstest schon sicher (85 %)')).toBeInTheDocument();
    expect(a1.getByText('Fokus-Lektion · Geplant · 2 Lektionen')).toBeInTheDocument();
    expect(a1.getByText('Als Nächstes · 4 Lektionen')).toBeInTheDocument();
  });

  it('shows the units of a later band on request', async () => {
    const { user } = renderPlan();

    const b1 = within(await bandItem('B1 · Mittelstufe'));
    expect(b1.queryByText('Wie es früher war')).not.toBeInTheDocument();
    await user.click(b1.getByRole('button', { name: '1 Einheit anzeigen', expanded: false }));

    expect(b1.getByText('Wie es früher war')).toBeInTheDocument();
    expect(b1.getByText('Bald verfügbar')).toBeInTheDocument();
    expect(b1.getByRole('button', { name: 'Einheiten ausblenden', expanded: true })).toBeVisible();
  });

  it('lists the plan history, newest plan version first', async () => {
    renderPlan();

    const history = await screen.findByRole('region', { name: 'Plan-Verlauf' });
    const entries = await within(history).findAllByRole('listitem');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveTextContent('Fokus-Lektion eingefügt');
    expect(entries[0]).toHaveTextContent('Fehlerquote 45 %');
    expect(entries[1]).toHaveTextContent('Plan erstellt');
    expect(entries[2]).toHaveTextContent('Einheit übersprungen');
  });

  it('leads to the learning path', async () => {
    const { user, router } = renderPlan();

    await user.click(await screen.findByRole('button', { name: 'Zum Lernpfad' }));

    expect(router.state.location.pathname).toBe('/');
  });
});
