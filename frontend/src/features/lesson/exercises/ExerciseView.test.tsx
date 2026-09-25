import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LessonExercise } from '../model';
import { SAMPLE_MATCH_PAIRS, SAMPLE_WORD_ORDER, SAMPLE_WORDBANK } from '../sampleExercises';
import { ExerciseView } from './ExerciseView';

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
    .map((button) => button.textContent);
  unmount();
  return order;
}

describe('ExerciseView shuffling', () => {
  it.each([SAMPLE_WORDBANK, SAMPLE_MATCH_PAIRS, SAMPLE_WORD_ORDER])(
    'keeps the tiles of $type in the same order for the same seed',
    (exercise) => {
      expect(tileOrder(exercise, 2026)).toEqual(tileOrder(exercise, 2026));
    },
  );

  it('shuffles with Math.random when no seed is given', () => {
    const random = vi.spyOn(Math, 'random');

    tileOrder(SAMPLE_WORDBANK);

    expect(random).toHaveBeenCalled();
  });
});
