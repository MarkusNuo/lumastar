import { afterEach, describe, expect, it } from 'vitest';
import { rememberTrophy, SHOWN_TROPHIES_KEY, trophyShown } from './shownTrophies';

const MORNING = new Date(2026, 9, 8, 9, 0);
const EVENING = new Date(2026, 9, 8, 21, 0);
const NEXT_DAY = new Date(2026, 9, 9, 9, 0);

afterEach(() => {
  localStorage.clear();
});

describe('shown trophies', () => {
  it('remembers a goal celebrated today', () => {
    expect(trophyShown(10, MORNING)).toBe(false);

    rememberTrophy(10, MORNING);

    expect(trophyShown(10, EVENING)).toBe(true);
    expect(trophyShown(20, EVENING)).toBe(false);
  });

  it('celebrates the same goal again on another day and forgets older days', () => {
    rememberTrophy(10, MORNING);

    expect(trophyShown(10, NEXT_DAY)).toBe(false);
    rememberTrophy(20, NEXT_DAY);
    expect(JSON.parse(localStorage.getItem(SHOWN_TROPHIES_KEY) ?? '[]')).toEqual(['2026-10-09:20']);
  });

  it('treats unreadable entries as none', () => {
    localStorage.setItem(SHOWN_TROPHIES_KEY, '{broken');

    expect(trophyShown(10, MORNING)).toBe(false);
  });
});
