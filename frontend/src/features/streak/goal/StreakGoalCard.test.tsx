import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { StreakGoal } from '../model';
import type { GoalChoice } from './GoalChooser';
import { StreakGoalCard } from './StreakGoalCard';

const IN_PROGRESS: StreakGoal = { target: 20, progress: 12, reached: false, options: [] };
const REACHED: StreakGoal = { target: 10, progress: 10, reached: true, options: [20, 30, 50] };

function renderCard(goal: StreakGoal, choice: Partial<GoalChoice> = {}, streak = goal.progress) {
  const fullChoice: GoalChoice = { choose: vi.fn(), reset: vi.fn(), status: 'idle', ...choice };
  render(<StreakGoalCard goal={goal} streak={streak} choice={fullChoice} />);
  return { choice: fullChoice, user: userEvent.setup() };
}

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
  });

  it('switches to another rung of the ladder above the streak', async () => {
    const { choice, user } = renderCard(IN_PROGRESS);

    await user.click(screen.getByRole('button', { name: 'Ziel ändern' }));
    const chips = screen.getByRole('radiogroup', { name: 'Neues Ziel' });

    expect(choice.reset).toHaveBeenCalledOnce();
    expect(chips).toHaveTextContent('30 Tage50 Tage75 Tage');
    await user.click(screen.getByRole('radio', { name: '50 Tage' }));
    expect(choice.choose).toHaveBeenCalledWith(50);

    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('offers the next goals once the goal is reached', async () => {
    const { choice, user } = renderCard(REACHED);

    expect(screen.getByText('Ziel erreicht: 10 Tage!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ziel ändern' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '30 Tage' }));

    expect(choice.choose).toHaveBeenCalledWith(30);
  });

  it('confirms the saved goal and closes the chips', () => {
    renderCard(IN_PROGRESS, { status: 'saved', chosen: 30 });

    expect(screen.getByRole('status')).toHaveTextContent('Neues Ziel: 30 Tage');
    expect(screen.getByRole('button', { name: 'Ziel ändern' })).toBeInTheDocument();
  });

  it('says so when the goal could not be saved', () => {
    renderCard(REACHED, { status: 'failed', chosen: 20 });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Ziel konnte nicht gespeichert werden.',
    );
    expect(screen.getByRole('radio', { name: '20 Tage' })).not.toBeChecked();
  });
});
