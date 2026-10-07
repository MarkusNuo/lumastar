import { describe, expect, it } from 'vitest';
import { reminderTimesProblem } from './reminderTimes';

describe('reminderTimesProblem', () => {
  it('accepts a streak rescue after the daily reminder', () => {
    expect(
      reminderTimesProblem({ time: '19:00', rescueEnabled: true, rescueTime: '21:30' }),
    ).toBeUndefined();
  });

  it.each(['19:00', '18:59'])('rejects a streak rescue at %s for a reminder at 19:00', (rescue) => {
    expect(reminderTimesProblem({ time: '19:00', rescueEnabled: true, rescueTime: rescue })).toBe(
      'rescueNotAfterTime',
    );
  });

  it('ignores the rescue time while the streak rescue is off', () => {
    expect(
      reminderTimesProblem({ time: '22:00', rescueEnabled: false, rescueTime: '21:30' }),
    ).toBeUndefined();
  });

  it('asks for a time when a field was cleared', () => {
    expect(reminderTimesProblem({ time: '', rescueEnabled: false, rescueTime: '21:30' })).toBe(
      'missingTime',
    );
    expect(reminderTimesProblem({ time: '19:00', rescueEnabled: true, rescueTime: '' })).toBe(
      'missingTime',
    );
  });
});
