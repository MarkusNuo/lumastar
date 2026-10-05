import { describe, expect, it } from 'vitest';
import { PLAN_COPY } from './copy';
import { bandEstimates, daysUntil, formatDay, nextGoal, parseDay } from './estimates';
import { SAMPLE_PATH } from './samplePlan';

describe('plan estimates', () => {
  it('reads an ISO day as that local day, whatever the time zone', () => {
    const day = parseDay('2026-11-16');
    expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([2026, 10, 16]);
    expect(formatDay('2026-11-16')).toBe('16. Nov. 2026');
  });

  it('counts whole days from today, never below zero', () => {
    const today = new Date(2026, 9, 5, 21, 30);
    expect(daysUntil('2026-10-05', today)).toBe(0);
    expect(daysUntil('2026-10-12', today)).toBe(7);
    expect(daysUntil('2026-09-30', today)).toBe(0);
  });

  it('orders the estimates by band and finds the next goal', () => {
    expect(
      bandEstimates({ ...SAMPLE_PATH, estimates: { C2: '2029-03-05', A1: '2026-11-16' } }),
    ).toEqual([
      { band: 'A1', day: '2026-11-16' },
      { band: 'C2', day: '2029-03-05' },
    ]);
    expect(nextGoal(SAMPLE_PATH)).toEqual({ band: 'A1', day: '2026-11-16' });
    expect(nextGoal({ ...SAMPLE_PATH, currentLevel: 'A0' })).toEqual({
      band: 'A1',
      day: '2026-11-16',
    });
    expect(nextGoal({ ...SAMPLE_PATH, currentLevel: 'A2.3' })).toEqual({
      band: 'A2',
      day: '2027-02-08',
    });
  });

  it('says how far away a goal is in the coarsest useful unit', () => {
    const say = (days: number) => PLAN_COPY.estimate('1. Jan. 2027', days);
    expect(say(0)).toBe('ca. 1. Jan. 2027 · schon fast geschafft');
    expect(say(1)).toBe('ca. 1. Jan. 2027 · in ca. 1 Tag');
    expect(say(10)).toBe('ca. 1. Jan. 2027 · in ca. 10 Tagen');
    expect(say(42)).toBe('ca. 1. Jan. 2027 · in ca. 6 Wochen');
    expect(say(150)).toBe('ca. 1. Jan. 2027 · in ca. 5 Monaten');
    expect(say(900)).toBe('ca. 1. Jan. 2027 · in ca. 2 Jahren');
  });
});
