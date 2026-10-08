import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderRoutes, screenNamed } from '../test/router';
import { TopBar, type TopBarProps } from './TopBar';

const STATS: TopBarProps = {
  level: 'A1',
  sublevel: 2,
  streakDays: 5,
  streakActive: false,
  streakFreezes: 1,
  xp: 120,
  minutesToday: 3,
  goalMinutes: 10,
};

describe('TopBar', () => {
  it('opens the streak screen with the flame, named as a screen reader reads the streak', async () => {
    const { router } = renderRoutes(
      [
        { path: '/', element: <TopBar {...STATS} /> },
        { path: '/streak', element: screenNamed('Streak') },
      ],
      '/',
    );
    const flame = screen.getByRole('link', {
      name: 'Streak: 5 Tage, heute noch nicht gelernt, Streak-Schutz bereit',
    });

    expect(flame).toHaveAttribute('href', '/streak');
    await userEvent.click(flame);

    expect(router.state.location.pathname).toBe('/streak');
    expect(screen.getByRole('heading', { name: 'Streak' })).toBeInTheDocument();
  });
});
