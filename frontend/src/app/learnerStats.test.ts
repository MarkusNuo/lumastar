import { describe, expect, it } from 'vitest';
import type { Profile } from '../api/types';
import { todayProgress } from '../test/fixtures';
import { isLevel, parseLevel, topBarStats } from './learnerStats';

const PROFILE: Profile = {
  displayName: 'Erza',
  dailyGoalMinutes: 10,
  motivations: [],
  onboardingCompleted: true,
  onboardingStep: 'done',
  xpTotal: 420,
  email: 'erza@example.ch',
  emailVerified: true,
  emailRequired: false,
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
    expect(topBarStats({ ...PROFILE, currentLevel: 'A1.2' }, undefined)).toMatchObject({
      level: 'A1',
      sublevel: 2,
      levelLocked: false,
      xp: 420,
    });
  });

  it('greys the level out before the placement test', () => {
    expect(topBarStats(PROFILE, undefined)).toMatchObject({ level: 'A0', levelLocked: true });
  });

  it('starts at zero while profile and progress load', () => {
    expect(topBarStats(undefined, undefined)).toMatchObject({
      xp: 0,
      streakDays: 0,
      streakActive: false,
      streakFreezes: 0,
      minutesToday: 0,
      goalMinutes: 0,
    });
  });

  it("takes the goal from the profile until today's progress is there", () => {
    expect(topBarStats(PROFILE, undefined)).toMatchObject({ minutesToday: 0, goalMinutes: 10 });
  });

  it("shows the streak, its freeze and today's minutes", () => {
    const today = todayProgress(
      { minutesToday: 6, goalMinutes: 5, goalMet: true },
      { current: 4, extendedToday: true, freezesLeft: 1 },
    );

    expect(topBarStats(PROFILE, today)).toMatchObject({
      streakDays: 4,
      streakActive: true,
      streakFreezes: 1,
      minutesToday: 6,
      goalMinutes: 5,
    });
  });
});
