import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { buildLearningPath, type PathUnitModel } from './learningPath';
import { UnitPath } from './UnitPath';

const UNITS = buildLearningPath(SAMPLE_PATH).flatMap((stage) => stage.units);

function unit(id: string): PathUnitModel {
  const found = UNITS.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`No sample unit ${id}`);
  return found;
}

function renderUnit(model: PathUnitModel) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <UnitPath unit={model} /> },
      { path: '/lesson/:unitId', element: <h1>Lektion</h1> },
    ],
    { initialEntries: ['/'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('UnitPath', () => {
  it('is a region named after the unit title, holding its lesson nodes', () => {
    renderUnit(unit('a1_u06_home'));

    const region = screen.getByRole('region', { name: 'Zuhause' });
    expect(within(region).getByRole('heading', { name: 'Zuhause', level: 3 })).toBeInTheDocument();
    expect(within(region).getAllByRole('listitem')).toHaveLength(4);
  });

  it('starts a lesson of the unit from the current node', async () => {
    const router = renderUnit(unit('a1_u06_home'));

    await userEvent.click(screen.getByRole('button', { name: 'Lektion 3, als Nächstes' }));

    expect(router.state.location.pathname).toBe('/lesson/a1_u06_home');
  });

  it('does not start the locked lessons after the current one', async () => {
    const router = renderUnit(unit('a1_u06_home'));

    await userEvent.click(screen.getByRole('button', { name: 'Lektion 4, gesperrt' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('marks a skipped unit and still lets the learner practise it', async () => {
    const router = renderUnit(unit('a1_u05_food_drink'));

    expect(screen.getByText('Übersprungen')).toBeInTheDocument();
    expect(screen.getByText('Im Einstufungstest schon sicher (85 %)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lektion 1, verfügbar' }));

    expect(router.state.location.pathname).toBe('/lesson/a1_u05_food_drink');
  });

  it('shows a focus unit with its reason and starts it by its focus id', async () => {
    const router = renderUnit(unit('focus_grammar_definite_article'));

    expect(screen.getByText('Fehlerquote 45 % bei Bestimmter Artikel')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fokus-Lektion 1, verfügbar' }));

    expect(router.state.location.pathname).toBe('/lesson/focus_grammar_definite_article');
  });

  it('announces units without exercises as coming soon', () => {
    renderUnit(unit('b1_u01_imperfect'));

    expect(screen.getByText('Bald verfügbar')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button')
        .every((node) => node.getAttribute('aria-label')?.endsWith('gesperrt')),
    ).toBe(true);
  });
});
