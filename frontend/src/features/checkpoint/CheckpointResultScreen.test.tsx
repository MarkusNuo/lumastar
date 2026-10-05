import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { celebrate } from '../../lib/celebrate';
import { playCue } from '../../lib/effects/playCue';
import { REVEAL_DELAY_MS } from '../../lib/useRevealMoment';
import type { LessonResult } from '../lesson/model';
import { CheckpointResultScreen } from './CheckpointResultScreen';
import {
  SAMPLE_CHECKPOINT_FAILED,
  SAMPLE_CHECKPOINT_LEVEL_UP,
  SAMPLE_CHECKPOINT_PASSED,
} from './sampleCheckpoint';

vi.mock('../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(celebrate).mockClear();
  vi.mocked(playCue).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderResult(result: LessonResult) {
  const { checkpoint } = result;
  if (!checkpoint) throw new Error('A checkpoint result is needed');
  const handlers = { onContinue: vi.fn(), onStartFocus: vi.fn() };
  render(<CheckpointResultScreen result={result} checkpoint={checkpoint} {...handlers} />);
  return handlers;
}

const passTime = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const continueButton = () => screen.getByRole('button', { name: 'Weiter' });

describe('CheckpointResultScreen', () => {
  it('celebrates a pass with the new level, confetti and the level-up cue', () => {
    renderResult(SAMPLE_CHECKPOINT_LEVEL_UP);

    expect(screen.getByText('Checkpoint A1.2 bestanden!')).toBeInTheDocument();
    expect(continueButton()).toBeDisabled();
    passTime(REVEAL_DELAY_MS);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Du bist jetzt auf A1.3');
    expect(screen.getByRole('img', { name: 'Niveau A1.3' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Maskottchen feiert' })).toBeInTheDocument();
    expect(celebrate).toHaveBeenCalledOnce();
    expect(playCue).toHaveBeenCalledWith('levelUp');
    expect(continueButton()).toBeEnabled();
  });

  it('continues straight on when the pass earned no badge', () => {
    const { onContinue } = renderResult(SAMPLE_CHECKPOINT_LEVEL_UP);
    passTime(REVEAL_DELAY_MS);

    fireEvent.click(continueButton());

    expect(onContinue).toHaveBeenCalledOnce();
    expect(screen.queryByText('Neues Abzeichen!')).not.toBeInTheDocument();
  });

  it('reveals the badge of a completed band on its own screen after the level-up', () => {
    const { onContinue } = renderResult(SAMPLE_CHECKPOINT_PASSED);
    passTime(REVEAL_DELAY_MS);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Du bist jetzt auf A2.1');

    fireEvent.click(continueButton());
    expect(onContinue).not.toHaveBeenCalled();
    passTime(REVEAL_DELAY_MS);

    expect(screen.getByText('Neues Abzeichen!')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Abzeichen A1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Niveau A1 geschafft!');
    expect(playCue).toHaveBeenLastCalledWith('complete');
    expect(celebrate).toHaveBeenCalledTimes(2);

    fireEvent.click(continueButton());
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('shows every badge when a pass completes two bands', () => {
    const result: LessonResult = {
      ...SAMPLE_CHECKPOINT_PASSED,
      checkpoint: {
        level: 'A2.3',
        passed: true,
        newLevel: 'B1.1',
        requiredAccuracy: 0.8,
        badges: ['A1', 'A2'],
      },
    };
    renderResult(result);
    passTime(REVEAL_DELAY_MS);
    fireEvent.click(continueButton());
    passTime(REVEAL_DELAY_MS);

    expect(screen.getByText('2 neue Abzeichen!')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /^Abzeichen A[12]$/ })).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Niveau A1 & A2 geschafft!',
    );
  });

  it('encourages after a fail: accuracy against the pass mark, no confetti, try again later', () => {
    const { onContinue, onStartFocus } = renderResult(SAMPLE_CHECKPOINT_FAILED);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Noch nicht ganz');
    expect(screen.getByRole('img', { name: 'Maskottchen ermutigt dich' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Du hattest 67 % richtig, zum Bestehen brauchst du 80 %. Übe noch etwas, dann klappt es!',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Deine Genauigkeit: 67\u00a0%, 80\u00a0% zum Bestehen' }),
    ).toBeInTheDocument();
    expect(celebrate).not.toHaveBeenCalled();

    const focus = screen.getByRole('region', {
      name: 'Fokus-Lektion vorgeschlagen: Bestimmter Artikel',
    });
    fireEvent.click(within(focus).getByRole('button', { name: 'Fokus-Lektion starten' }));
    expect(onStartFocus).toHaveBeenCalledWith('focus_grammar.definite_article_1');

    fireEvent.click(screen.getByRole('button', { name: 'Später nochmals versuchen' }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('names the mastered stage when the last checkpoint brings no new level', () => {
    renderResult({
      ...SAMPLE_CHECKPOINT_PASSED,
      checkpoint: {
        level: 'C2.3',
        passed: true,
        newLevel: 'C2.3',
        requiredAccuracy: 0.8,
        badges: ['C2'],
      },
    });
    passTime(REVEAL_DELAY_MS);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Du hast C2.3 gemeistert!');
  });
});
