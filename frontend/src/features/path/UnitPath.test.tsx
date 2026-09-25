import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { PathUnit } from './learningPath';
import { UnitPath } from './UnitPath';

const UNIT: PathUnit = {
  id: 'a1_u01_greetings',
  title: 'Begrüssung',
  description: 'Hallo sagen und nach dem Befinden fragen',
  eyebrow: 'A1 · Einheit 1',
  color: 'teal',
  playable: true,
  nodes: [
    { id: 'a1_u01_greetings-1', status: 'current', label: 'Lektion 1' },
    { id: 'a1_u01_greetings-2', status: 'locked', label: 'Lektion 2' },
  ],
};

describe('UnitPath', () => {
  it('is a region named after the unit title, holding its lesson nodes', () => {
    render(
      <MemoryRouter>
        <UnitPath unit={UNIT} />
      </MemoryRouter>,
    );

    const unit = screen.getByRole('region', { name: 'Begrüssung' });
    expect(within(unit).getByRole('heading', { name: 'Begrüssung', level: 3 })).toBeInTheDocument();
    expect(within(unit).getAllByRole('listitem')).toHaveLength(2);
  });
});
