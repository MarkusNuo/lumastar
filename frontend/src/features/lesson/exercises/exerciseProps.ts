import type { MascotExpression } from '../../../components/ui/Mascot';
import type { Answer, LessonExercise, Verdict } from '../model';

export interface ExerciseProps<E extends LessonExercise> {
  exercise: E;
  /** Shown again at the end of the lesson after a wrong answer. */
  retry: boolean;
  /** Set once the answer was checked; the exercise is read-only from then on. */
  verdict: Verdict | undefined;
  /** The answer so far, or null while there is nothing to check. */
  onAnswerChange: (answer: Answer | null) => void;
  /** Checks right away, for exercises that finish by themselves (match_pairs). */
  onSubmit: (answer: Answer) => void;
  /** Puts the cursor into a text field on start; off where several exercises share a page. */
  focusOnStart?: boolean;
  /**
   * Fixes the order of shuffled options and tiles. The lesson player derives it from session and
   * exercise, so a retry shows the same order; the catalog uses a constant for stable screenshots.
   * Without it every mount shuffles anew.
   */
  shuffleSeed?: number;
}

export type Reaction = 'idle' | 'success' | 'error';

export function reactionOf(verdict: Verdict | undefined): Reaction {
  if (!verdict) return 'idle';
  return verdict.countsAsCorrect ? 'success' : 'error';
}

/** The mascot reacts to the verdict; a wrong answer gets encouragement, never sadness. */
export function mascotFor(verdict: Verdict | undefined): MascotExpression {
  if (!verdict) return 'happy';
  if (verdict.outcome === 'correct') return 'celebrating';
  return verdict.countsAsCorrect ? 'happy' : 'encouraging';
}

/** The mascot speaks these prompts in a bubble; the other types show it in the feedback sheet. */
export function hasPromptBubble(exercise: LessonExercise): boolean {
  return exercise.type !== 'multiple_choice' && exercise.type !== 'match_pairs';
}

/** Match pairs finish by themselves; every other type is checked with "Prüfen". */
export function needsCheckButton(exercise: LessonExercise): boolean {
  return exercise.type !== 'match_pairs';
}
