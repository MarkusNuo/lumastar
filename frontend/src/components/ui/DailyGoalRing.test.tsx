import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DailyGoalRing } from './DailyGoalRing';

describe('DailyGoalRing', () => {
  it('reports the reached share of the daily goal in percent', () => {
    render(<DailyGoalRing progress={0.6} />);

    const ring = screen.getByRole('progressbar', { name: 'Tagesziel' });
    expect(ring).toHaveAttribute('aria-valuemin', '0');
    expect(ring).toHaveAttribute('aria-valuemax', '100');
    expect(ring).toHaveAttribute('aria-valuenow', '60');
    expect(ring).toHaveAttribute('aria-valuetext', '60\u00a0%');
  });

  it('reads the minutes instead of the percentage when given', () => {
    render(<DailyGoalRing progress={0.6} valueText="3 von 5 Min." />);

    expect(screen.getByRole('progressbar', { name: 'Tagesziel' })).toHaveAttribute(
      'aria-valuetext',
      '3 von 5 Min.',
    );
  });

  it('bursts only once it is full', () => {
    const { rerender } = render(<DailyGoalRing progress={0.8} burst />);
    expect(screen.queryByTestId('goal-burst')).not.toBeInTheDocument();

    rerender(<DailyGoalRing progress={1} burst />);

    expect(screen.getByTestId('goal-burst')).toBeInTheDocument();
  });

  it.each([
    [1.7, '100'],
    [-0.4, '0'],
    [Number.NaN, '0'],
  ])('clamps progress %d to %s %%', (progress, expected) => {
    render(<DailyGoalRing progress={progress} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', expected);
  });
});
