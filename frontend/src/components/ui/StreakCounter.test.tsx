import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StreakCounter } from './StreakCounter';

describe('StreakCounter', () => {
  it('names the streak of a day whose goal is met', () => {
    render(<StreakCounter days={5} active />);

    expect(screen.getByText('Streak: 5 Tage')).toBeInTheDocument();
    expect(screen.queryByTestId('streak-freeze')).not.toBeInTheDocument();
  });

  it('says when today is still open and a freeze is ready', () => {
    render(<StreakCounter days={1} active={false} freezes={1} />);

    expect(
      screen.getByText('Streak: 1 Tag, heute noch nicht gelernt, Streak-Schutz bereit'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('streak-freeze')).toBeInTheDocument();
  });
});
