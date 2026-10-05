import { describe, expect, it } from 'vitest';
import type { Profile } from '../api/types';
import { isLevel, parseLevel, topBarStats } from './learnerStats';

const PROFILE: Profile = {
  displayName: 'Erza',
  dailyGoalMinutes: 10,
  motivations: [],
  onboardingCompleted: true,
  onboardingStep: 'done',
  xpTotal: 420,
};

describe('parseLevel', () => {
  it('splits a sub-stage into level and sublevel', () => {
    expect(parseLevel('B2.3')).toEqual({ level: 'B2', sublevel: 3 });
  });

  it('keeps A0 without sub-stage', () => {
    expect(parseLevel('A0')).toEqual({ level: 'A0' });
  });
});

describe('isLevel', () => {
  it.each(['A0', 'A1.1', 'B2.3', 'C2.3'])('accepts %s', (value) => {
    expect(isLevel(value)).toBe(true);
  });

  it.each(['', 'A1', 'A0.1', 'D1.1', 'C3.1', 'A1.4', 'a1.2', 'A1.2x'])('rejects %j', (value) => {
    expect(isLevel(value)).toBe(false);
  });
});

describe('topBarStats', () => {
  it('shows the level and XP of the profile', () => {
    expect(topBarStats({ ...PROFILE, currentLevel: 'A1.2' })).toMatchObject({
      level: 'A1',
      sublevel: 2,
      levelLocked: false,
      xp: 420,
    });
  });

  it('greys the level out before the placement test', () => {
    expect(topBarStats(PROFILE)).toMatchObject({ level: 'A0', levelLocked: true });
  });

  it('starts at zero while the profile loads', () => {
    expect(topBarStats(undefined)).toMatchObject({ xp: 0, streakDays: 0, dailyGoalProgress: 0 });
  });
});
