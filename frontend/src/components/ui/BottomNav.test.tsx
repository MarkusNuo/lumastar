import { ArrowsClockwiseIcon, PathIcon } from '@phosphor-icons/react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BottomNav, type NavItem } from './BottomNav';

function renderNav(items: NavItem[]) {
  const router = createMemoryRouter([{ path: '*', element: <BottomNav items={items} /> }]);
  render(<RouterProvider router={router} />);
}

const learn: NavItem = { to: '/', label: 'Lernen', icon: PathIcon, end: true };
const review = (count: number): NavItem => ({
  to: '/wiederholen',
  label: 'Wiederholen',
  icon: ArrowsClockwiseIcon,
  badge: { count, description: `${count} Wörter fällig` },
});

describe('BottomNav', () => {
  it('shows a count on the tab and keeps the tab name as its accessible name', () => {
    renderNav([learn, review(3)]);

    const tab = screen.getByRole('link', { name: 'Wiederholen' });
    expect(tab).toHaveAccessibleDescription('3 Wörter fällig');
    expect(screen.getByTestId('nav-badge')).toHaveTextContent('3');
    expect(screen.getByRole('link', { name: 'Lernen' })).not.toHaveAccessibleDescription();
  });

  it('caps the count at 99+', () => {
    renderNav([review(140)]);

    expect(screen.getByTestId('nav-badge')).toHaveTextContent('99+');
  });
});
