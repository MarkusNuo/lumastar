import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { LessonResult } from './model';
import { refreshLearnerData } from './refreshLearnerData';

const RESULT: LessonResult = {
  kind: 'checkpoint',
  accuracy: 0.9,
  correctCount: 9,
  exerciseCount: 10,
  durationMs: 60_000,
  learnedItems: [],
  saved: true,
};

function invalidatedKeys(result: LessonResult): unknown[] {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  refreshLearnerData(queryClient, result);
  return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
}

describe('refreshLearnerData', () => {
  it('refreshes profile, plan, reviews, daily progress and statistics after every lesson', () => {
    expect(invalidatedKeys({ ...RESULT, kind: 'lesson' })).toEqual([
      ['me'],
      ['plan'],
      ['review'],
      ['progress'],
      ['stats'],
    ]);
  });

  it('also refreshes the badges after a passed checkpoint', () => {
    const passed = invalidatedKeys({
      ...RESULT,
      checkpoint: {
        level: 'A1.3',
        passed: true,
        newLevel: 'A2.1',
        requiredAccuracy: 0.8,
        badges: ['A1'],
      },
    });

    expect(passed).toContainEqual(['badges']);
  });

  it('leaves the badges alone after a failed checkpoint', () => {
    const failed = invalidatedKeys({
      ...RESULT,
      accuracy: 0.5,
      checkpoint: { level: 'A1.3', passed: false, requiredAccuracy: 0.8, badges: [] },
    });

    expect(failed).not.toContainEqual(['badges']);
  });
});
