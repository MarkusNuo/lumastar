import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LessonExercise } from '../model';
import {
  SAMPLE_FILL_GAP_CHOICES,
  SAMPLE_MATCH_PAIRS,
  SAMPLE_MULTIPLE_CHOICE,
  SAMPLE_WORD_ORDER,
  SAMPLE_WORDBANK,
} from '../sampleExercises';
import { ExerciseView } from './ExerciseView';
import { seedFrom } from './shuffle';

/** The words on the option cards and tiles in display order (number markers dropped). */
function tileOrder(exercise: LessonExercise, shuffleSeed?: number): string[] {
  const { unmount } = render(
    <ExerciseView
      exercise={exercise}
      retry={false}
      verdict={undefined}
      onAnswerChange={vi.fn()}
      onSubmit={vi.fn()}
      shuffleSeed={shuffleSeed}
    />,
  );
  const order = screen
    .getAllByRole('group')
    .flatMap((group) => within(group).queryAllByRole('button'))
    .map((button) => button.textContent.replace(/^\d+/u, ''));
  unmount();
  return order;
}

describe('ExerciseView shuffling', () => {
  it.each([
    SAMPLE_MULTIPLE_CHOICE,
    SAMPLE_FILL_GAP_CHOICES,
    SAMPLE_WORDBANK,
    SAMPLE_MATCH_PAIRS,
    SAMPLE_WORD_ORDER,
  ])('keeps the options of $type in the same order for the same seed', (exercise) => {
    expect(tileOrder(exercise, 2026)).toEqual(tileOrder(exercise, 2026));
  });

  it.each([SAMPLE_MULTIPLE_CHOICE, SAMPLE_FILL_GAP_CHOICES])(
    'does not always offer the solution of $type first',
    (exercise) => {
      const firstOptions = new Set(
        Array.from(
          { length: 12 },
          (_, session) => tileOrder(exercise, seedFrom(`session-${session}:${exercise.id}`))[0],
        ),
      );

      expect(firstOptions.size).toBeGreaterThan(1);
    },
  );

  it('shuffles with Math.random when no seed is given', () => {
    const random = vi.spyOn(Math, 'random');

    tileOrder(SAMPLE_WORDBANK);

    expect(random).toHaveBeenCalled();
  });
});
