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
}

export type Reaction = 'idle' | 'success' | 'error';

export function reactionOf(verdict: Verdict | undefined): Reaction {
  if (!verdict) return 'idle';
  return verdict.countsAsCorrect ? 'success' : 'error';
}

/** The mascot in the speech bubble reacts to the verdict (PRD F9). */
export function mascotFor(verdict: Verdict | undefined): MascotExpression {
  if (!verdict) return 'happy';
  if (verdict.outcome === 'correct') return 'celebrating';
  return verdict.countsAsCorrect ? 'encouraging' : 'sad';
}

/** Match pairs finish by themselves; every other type is checked with "Prüfen". */
export function needsCheckButton(exercise: LessonExercise): boolean {
  return exercise.type !== 'match_pairs';
}
