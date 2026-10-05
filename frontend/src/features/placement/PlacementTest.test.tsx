import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, problemResponse, renderWithQueryClient, stubApi } from '../../test/http';
import { toPlacementExercise, type StartedPlacement } from './placementApi';
import { PlacementTest } from './PlacementTest';
import { SAMPLE_PLACEMENT_CHOICE, SAMPLE_PLACEMENT_GAP } from './samplePlacement';

const ANSWERS = 'POST /api/placement/t-1/answers';

const STARTED: StartedPlacement = {
  testId: 't-1',
  maxItems: 20,
  position: 1,
  exercise: toPlacementExercise(SAMPLE_PLACEMENT_CHOICE),
};

function renderTest() {
  const onFinished = vi.fn(() => Promise.resolve());
  const onQuit = vi.fn();
  const onRestart = vi.fn();
  renderWithQueryClient(
    <PlacementTest
      started={STARTED}
      onFinished={onFinished}
      onQuit={onQuit}
      onRestart={onRestart}
      restarting={false}
    />,
  );
  return { user: userEvent.setup(), onFinished, onQuit, onRestart };
}

const progress = () => screen.getByRole('progressbar', { name: 'Fortschritt der Einstufung' });
const next = () => screen.getByRole('button', { name: 'Weiter' });
const shownItem = () =>
  document.querySelector('[data-exercise-id]')?.getAttribute('data-exercise-id');

describe('PlacementTest', () => {
  it('moves from item to item without any verdict and opens the result at the end', async () => {
    let answered = 0;
    const requests = stubApi({
      [ANSWERS]: () =>
        jsonResponse(
          ++answered === 1
            ? { finished: false, position: 2, nextItem: SAMPLE_PLACEMENT_GAP }
            : { finished: true, position: 2 },
        ),
    });
    const { user, onFinished } = renderTest();

    expect(progress()).toHaveAttribute('aria-valuetext', 'Frage 1 von höchstens 20');
    expect(next()).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Guten Tag/ }));
    await user.click(next());

    await waitFor(() => expect(shownItem()).toBe('pl_a0_004'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText(/Richtig|Nicht ganz/)).not.toBeInTheDocument();
    expect(progress()).toHaveAttribute('aria-valuetext', 'Frage 2 von höchstens 20');
    expect(progress()).toHaveAttribute('aria-valuenow', '1');

    await user.click(screen.getByRole('button', { name: 'Unë' }));
    await user.keyboard('{Enter}');

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith('t-1'));
    expect(screen.getByRole('status')).toHaveTextContent('Ergebnis wird geladen');
    expect(await requests[0]?.json()).toMatchObject({
      exerciseId: 'pl_a0_001',
      answer: { choice: 'Guten Tag' },
      responseTimeMs: expect.any(Number) as number,
    });
  });

  it('keeps the item and its answer when the answer did not arrive, and sends it again', async () => {
    let attempts = 0;
    stubApi({
      [ANSWERS]: () =>
        ++attempts === 1
          ? Promise.reject(new TypeError('offline'))
          : jsonResponse({ finished: false, position: 2, nextItem: SAMPLE_PLACEMENT_GAP }),
    });
    const { user } = renderTest();

    await user.click(screen.getByRole('button', { name: /Guten Tag/ }));
    await user.click(next());

    expect(await screen.findByRole('alert')).toHaveTextContent('nicht angekommen');
    expect(shownItem()).toBe('pl_a0_001');
    await user.click(next());

    await waitFor(() => expect(shownItem()).toBe('pl_a0_004'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers a new test when this one cannot go on', async () => {
    stubApi({ [ANSWERS]: () => problemResponse({ status: 409, code: 'placement_finished' }) });
    const { user, onRestart } = renderTest();

    await user.click(screen.getByRole('button', { name: /Guten Tag/ }));
    await user.click(next());

    expect(
      await screen.findByRole('heading', { name: 'Der Test wurde unterbrochen' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Neu starten' }));
    expect(onRestart).toHaveBeenCalledOnce();
  });

  it('asks before quitting and stays when the learner changes their mind', async () => {
    stubApi({});
    const { user, onQuit } = renderTest();

    await user.click(screen.getByRole('button', { name: 'Einstufung abbrechen' }));
    expect(screen.getByRole('alertdialog', { name: 'Einstufung abbrechen?' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Weitermachen' }));
    expect(onQuit).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    await user.click(await screen.findByRole('button', { name: 'Abbrechen' }));
    expect(onQuit).toHaveBeenCalledOnce();
  });
});
