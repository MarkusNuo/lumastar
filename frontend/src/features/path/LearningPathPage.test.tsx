import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { CheckpointStatus, LearningPath } from '../../api/types';
import { jsonResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { SAMPLE_PATH } from '../plan/samplePlan';
import { LearningPathPage } from './LearningPathPage';

/** The sample path with every unit of its first stage done and that stage's checkpoint. */
function pathWithFirstCheckpoint(
  status: CheckpointStatus,
  facts = { exerciseCount: 15, requiredAccuracy: 0.8 },
): LearningPath {
  const [first, ...rest] = SAMPLE_PATH.stages;
  if (!first) throw new Error('The sample path has stages');
  return {
    ...SAMPLE_PATH,
    stages: [
      {
        ...first,
        checkpoint: { status, ...facts },
        units: first.units.map((unit) => ({
          ...unit,
          status: 'completed',
          lessonsCompleted: unit.estimatedLessons,
        })),
      },
      ...rest,
    ],
  };
}

function renderPath(path: LearningPath) {
  stubApi({ 'GET /api/path': () => jsonResponse(path) });
  const router = createMemoryRouter(
    [
      { path: '/', element: <LearningPathPage /> },
      { path: '/checkpoint/:level', element: <h1>Checkpoint</h1> },
    ],
    { initialEntries: ['/'] },
  );
  renderWithQueryClient(<RouterProvider router={router} />);
  return { router, user: userEvent.setup() };
}

describe('LearningPathPage checkpoints', () => {
  it('makes an open checkpoint the next step and introduces it before it starts', async () => {
    const { router, user } = renderPath(pathWithFirstCheckpoint('available'));

    await user.click(await screen.findByRole('button', { name: 'Checkpoint A1.2, als Nächstes' }));

    const sheet = await screen.findByRole('dialog', { name: 'Checkpoint A1.2' });
    expect(within(sheet).getByText('~15 Aufgaben · 80 % zum Bestehen')).toBeInTheDocument();
    expect(sheet).toHaveAccessibleDescription(/Bestehst du, steigst du auf A1\.3 auf\./);
    await user.click(within(sheet).getByRole('button', { name: 'Checkpoint starten' }));

    expect(router.state.location.pathname).toBe('/checkpoint/A1.2');
  });

  it('tells the size and pass mark of the checkpoint as the plan reports them', async () => {
    const { user } = renderPath(
      pathWithFirstCheckpoint('available', { exerciseCount: 9, requiredAccuracy: 0.75 }),
    );

    await user.click(await screen.findByRole('button', { name: 'Checkpoint A1.2, als Nächstes' }));

    const sheet = await screen.findByRole('dialog', { name: 'Checkpoint A1.2' });
    expect(within(sheet).getByText('~9 Aufgaben · 75 % zum Bestehen')).toBeInTheDocument();
  });

  it('closes the intro without starting', async () => {
    const { router, user } = renderPath(pathWithFirstCheckpoint('available'));

    await user.click(await screen.findByRole('button', { name: 'Checkpoint A1.2, als Nächstes' }));
    await user.click(await screen.findByRole('button', { name: 'Später' }));

    expect(router.state.location.pathname).toBe('/');
  });

  it('keeps a locked checkpoint closed', async () => {
    const { user } = renderPath(SAMPLE_PATH);

    await user.click(await screen.findByRole('button', { name: 'Checkpoint A1.2, gesperrt' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a passed checkpoint as completed, with nothing more to take', async () => {
    const { user } = renderPath(pathWithFirstCheckpoint('passed'));

    await user.click(await screen.findByRole('button', { name: 'Checkpoint A1.2, abgeschlossen' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
