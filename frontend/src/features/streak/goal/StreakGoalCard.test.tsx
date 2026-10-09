import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StreakGoal } from '../model';
import type { GoalChoice } from './GoalChooser';
import { StreakGoalCard } from './StreakGoalCard';

vi.mock('../../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const IN_PROGRESS: StreakGoal = { target: 20, progress: 12, reached: false, options: [30, 50, 75] };
const REACHED: StreakGoal = { target: 10, progress: 10, reached: true, options: [20, 30, 50] };

function idleChoice(choice: Partial<GoalChoice> = {}): GoalChoice {
  return { choose: vi.fn(), reset: vi.fn(), status: 'idle', ...choice };
}

function renderCard(goal: StreakGoal, choice: Partial<GoalChoice> = {}) {
  const fullChoice = idleChoice(choice);
  const rendered = render(<StreakGoalCard goal={goal} choice={fullChoice} />);
  return { choice: fullChoice, user: userEvent.setup(), ...rendered };
}

const heading = () => screen.getByRole('heading', { name: 'Streak-Ziel', level: 2 });

describe('StreakGoalCard', () => {
  it('shows the way to the goal', () => {
    renderCard(IN_PROGRESS);

    expect(screen.getByRole('region', { name: 'Streak-Ziel' })).toBeInTheDocument();
    expect(screen.getByText('Ziel: 20 Tage')).toBeInTheDocument();
    expect(screen.getByText('Noch 8 Tage')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Fortschritt zum Streak-Ziel' }),
    ).toHaveAttribute('aria-valuetext', '12 von 20 Tagen');
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(heading()).not.toHaveFocus();
  });

  it('switches to one of the goals the API offers, with the focus on the chips', async () => {
    const { choice, user } = renderCard(IN_PROGRESS);

    await user.click(screen.getByRole('button', { name: 'Ziel ändern' }));
    const chips = screen.getByRole('radiogroup', { name: 'Neues Ziel' });

    expect(choice.reset).toHaveBeenCalledOnce();
    expect(chips).toHaveTextContent('30 Tage50 Tage75 Tage');
    expect(screen.getByRole('radio', { name: '30 Tage' })).toHaveFocus();
    await user.click(screen.getByRole('radio', { name: '50 Tage' }));
    expect(choice.choose).toHaveBeenCalledWith(50);
  });

  it('keeps the goal on "Abbrechen" and gives the focus to the card', async () => {
    const { choice, user } = renderCard(IN_PROGRESS);
    await user.click(screen.getByRole('button', { name: 'Ziel ändern' }));

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(heading()).toHaveFocus();
    expect(choice.choose).not.toHaveBeenCalled();
  });

  it('offers no change when there is no other goal', () => {
    renderCard({ ...IN_PROGRESS, options: [] });

    expect(screen.queryByRole('button', { name: 'Ziel ändern' })).not.toBeInTheDocument();
  });

  it('offers the next goals once the goal is reached', async () => {
    const { choice, user } = renderCard(REACHED);

    expect(screen.getByText('Ziel erreicht: 10 Tage!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ziel ändern' })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '20 Tage' })).not.toHaveFocus();
    await user.click(screen.getByRole('radio', { name: '30 Tage' }));

    expect(choice.choose).toHaveBeenCalledWith(30);
  });

  it('saves only the goal chosen with Enter, not those the arrow keys pass', async () => {
    const { choice, user } = renderCard(REACHED);

    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowLeft}');
    expect(choice.choose).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');

    expect(choice.choose).toHaveBeenCalledExactlyOnceWith(30);
  });

  it('moves the focus to the card when the chips close on a save', async () => {
    const { user, rerender } = renderCard(REACHED);
    await user.tab();
    expect(screen.getByRole('radio', { name: '20 Tage' })).toHaveFocus();

    const saved = idleChoice({ status: 'saved', chosen: 30 });
    rerender(
      <StreakGoalCard
        goal={{ target: 30, progress: 10, reached: false, options: [20, 50, 75] }}
        choice={saved}
      />,
    );

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(heading()).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent('Neues Ziel: 30 Tage');
  });

  it('confirms the saved goal and closes the chips', () => {
    renderCard(IN_PROGRESS, { status: 'saved', chosen: 30 });

    expect(screen.getByRole('status')).toHaveTextContent('Neues Ziel: 30 Tage');
    expect(screen.getByRole('button', { name: 'Ziel ändern' })).toBeInTheDocument();
    expect(heading(), 'a goal saved before takes no focus').not.toHaveFocus();
  });

  it('says so when the goal could not be saved', () => {
    renderCard(REACHED, { status: 'failed', chosen: 20 });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Ziel konnte nicht gespeichert werden.',
    );
    expect(screen.getByRole('radio', { name: '20 Tage' })).not.toBeChecked();
  });
});
