import type { LessonExercise } from '../model';
import type { ExerciseProps } from './exerciseProps';
import { FillGap } from './FillGap';
import { MatchPairs } from './MatchPairs';
import { MultipleChoice } from './MultipleChoice';
import { TranslateFree } from './TranslateFree';
import { TranslateWordbank } from './TranslateWordbank';
import { WordOrder } from './WordOrder';

/** Renders the component of the exercise's type. */
export function ExerciseView({ exercise, ...props }: ExerciseProps<LessonExercise>) {
  switch (exercise.type) {
    case 'multiple_choice':
      return <MultipleChoice exercise={exercise} {...props} />;
    case 'translate_wordbank':
      return <TranslateWordbank exercise={exercise} {...props} />;
    case 'translate_free':
      return <TranslateFree exercise={exercise} {...props} />;
    case 'fill_gap':
      return <FillGap exercise={exercise} {...props} />;
    case 'match_pairs':
      return <MatchPairs exercise={exercise} {...props} />;
    case 'word_order':
      return <WordOrder exercise={exercise} {...props} />;
  }
}
