import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { playCue } from '../../../lib/effects/playCue';
import { renderWithQueryClient } from '../../../test/http';
import type { LessonResult } from '../model';
import { LessonEnd } from './LessonEnd';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));
vi.mock('../../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const RESULT: LessonResult = {
  kind: 'lesson',
  xp: { earned: 15, breakdown: { base: 10, perfectBonus: 0, speedBonus: 5 }, total: 115 },
  accuracy: 0.75,
  correctCount: 9,
  exerciseCount: 12,
  durationMs: 240_000,
  learnedItems: [],
  saved: true,
  dailyGoal: { minutesToday: 3, goalMinutes: 10, goalMet: false, justMet: false },
  streak: { current: 4, previous: 4, extendedToday: false, freezeUsed: false },
};

const GOAL_JUST_MET: Partial<LessonResult> = {
  dailyGoal: { minutesToday: 6, goalMinutes: 5, goalMet: true, justMet: true },
  streak: { current: 5, previous: 4, extendedToday: true, freezeUsed: false },
};

function renderEnd(result: LessonResult) {
  const handlers = { onContinue: vi.fn(), onRetrySave: vi.fn(), onStartFocus: vi.fn() };
  renderWithQueryClient(<LessonEnd result={result} retrying={false} {...handlers} />);
  return { user: userEvent.setup(), ...handlers };
}

const goalCard = () => screen.getByRole('region', { name: 'Tagesziel' });

describe('LessonEnd', () => {
  it('shows how far the daily goal is and leaves on "Weiter"', async () => {
    const { user, onContinue } = renderEnd(RESULT);

    expect(within(goalCard()).getByText('3 von 10 Min.')).toBeInTheDocument();
    expect(within(goalCard()).getByText('Noch 7 Min. bis zum Tagesziel.')).toBeInTheDocument();
    expect(within(goalCard()).getByRole('progressbar', { name: 'Tagesziel' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    );
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onContinue).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('streak-celebration')).not.toBeInTheDocument();
  });

  it('fills the ring with a burst and its own sound when the lesson meets the goal', async () => {
    renderEnd({ ...RESULT, ...GOAL_JUST_MET });

    expect(within(goalCard()).getByText('Tagesziel erreicht!')).toBeInTheDocument();
    expect(within(goalCard()).getByTestId('goal-burst')).toBeInTheDocument();
    await waitFor(() => expect(playCue).toHaveBeenCalledWith('goal'), { timeout: 2000 });
  });

  it('says so quietly when the goal was met by an earlier lesson', () => {
    renderEnd({
      ...RESULT,
      dailyGoal: { minutesToday: 14, goalMinutes: 10, goalMet: true, justMet: false },
    });

    expect(within(goalCard()).getByText('Tagesziel erreicht')).toBeInTheDocument();
    expect(within(goalCard()).getByText('Heute schon 14 Min. geübt.')).toBeInTheDocument();
    expect(screen.queryByTestId('goal-burst')).not.toBeInTheDocument();
  });

  it('lets the flame blaze with the grown streak after the lesson that met the goal', async () => {
    const { user, onContinue } = renderEnd({ ...RESULT, ...GOAL_JUST_MET });

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '5 Tage Streak!', level: 1 })).toBeInTheDocument();
    expect(onContinue).not.toHaveBeenCalled();
    await waitFor(() => expect(playCue).toHaveBeenCalledWith('streak'));
    expect(screen.queryByText(/Streak-Schutz/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('starts the suggested focus lesson after the flame', async () => {
    const focusSuggestion = {
      skillTag: 'grammar.definite_article',
      label: 'Bestimmter Artikel',
      unitId: 'focus_grammar.definite_article_1',
    };
    const { user, onContinue, onStartFocus } = renderEnd({
      ...RESULT,
      ...GOAL_JUST_MET,
      focusSuggestion,
    });

    await user.click(screen.getByRole('button', { name: 'Fokus-Lektion starten' }));
    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
    expect(onStartFocus).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onStartFocus).toHaveBeenCalledExactlyOnceWith(focusSuggestion.unitId);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('starts the focus lesson at once when the lesson did not meet the goal', async () => {
    const { user, onStartFocus } = renderEnd({
      ...RESULT,
      focusSuggestion: { skillTag: 'vocab.food', label: 'Essen', unitId: 'focus_vocab.food_1' },
    });

    await user.click(screen.getByRole('button', { name: 'Fokus-Lektion starten' }));

    expect(onStartFocus).toHaveBeenCalledExactlyOnceWith('focus_vocab.food_1');
    expect(screen.queryByTestId('streak-celebration')).not.toBeInTheDocument();
  });

  it('greets the first day of a streak', async () => {
    const { user } = renderEnd({
      ...RESULT,
      ...GOAL_JUST_MET,
      streak: { current: 1, previous: 0, extendedToday: true, freezeUsed: false },
    });

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByRole('heading', { name: '1 Tag Streak!' })).toBeInTheDocument();
    expect(screen.getByText(/deine Flamme brennt/)).toBeInTheDocument();
  });

  it('thanks the streak freeze that bridged the missed day', async () => {
    const { user } = renderEnd({
      ...RESULT,
      ...GOAL_JUST_MET,
      streak: { current: 9, previous: 7, extendedToday: true, freezeUsed: true },
    });

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(
      screen.getByText(/Dein Streak-Schutz hat den verpassten Tag überbrückt/),
    ).toBeInTheDocument();
  });

  it('shows the flame after a checkpoint too', async () => {
    const { user } = renderEnd({
      ...RESULT,
      ...GOAL_JUST_MET,
      kind: 'checkpoint',
      checkpoint: { level: 'A1.2', passed: false, requiredAccuracy: 0.8, badges: [] },
    });

    await user.click(screen.getByRole('button', { name: 'Später nochmals versuchen' }));

    expect(screen.getByTestId('streak-celebration')).toBeInTheDocument();
  });

  it('shows no daily goal for a result that could not be saved', () => {
    renderEnd({
      ...RESULT,
      xp: undefined,
      saved: false,
      dailyGoal: undefined,
      streak: undefined,
    });

    expect(screen.queryByRole('region', { name: 'Tagesziel' })).not.toBeInTheDocument();
  });
});
