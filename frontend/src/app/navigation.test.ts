import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, navItems } from './navigation';

describe('navItems', () => {
  it('shows no badge while nothing is due', () => {
    expect(navItems(0)).toBe(NAV_ITEMS);
  });

  it('puts the due count on the review tab only', () => {
    const items = navItems(3);

    expect(items.find((item) => item.label === 'Wiederholen')?.badge).toEqual({
      count: 3,
      description: '3 Karten fällig',
    });
    expect(items.filter((item) => item.badge)).toHaveLength(1);
  });

  it('names a single due card in the singular', () => {
    expect(navItems(1)[1]?.badge?.description).toBe('1 Karte fällig');
  });
});
