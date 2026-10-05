import type { CheckpointResult, ErrorCategory, FocusSuggestion, LessonKind } from '../../api/types';

/*
 * View model of the lesson player. Screens and logic only depend on these types; lessonApi.ts maps
 * the generated API types onto them, so a contract change stays in that one file.
 */

export type { CheckpointResult, ErrorCategory, FocusSuggestion, LessonKind };

/** "sq" is Gheg (the app never teaches Standard Albanian), "de" German. */
export type Lang = 'sq' | 'de';

export interface ExercisePrompt {
  lang: Lang;
  text: string;
}

/** A typical wrong answer of an exercise; `pattern` is matched against the normalised answer. */
export interface ErrorHint {
  pattern: string;
  category: ErrorCategory;
  /** German hint for the feedback sheet. */
  hint?: string;
}

/**
 * The lesson player's exercises. Placement items use the same shapes with empty `solutions` and
 * `explanation`, because the placement test gives no feedback.
 */
interface ExerciseBase {
  id: string;
  prompt: ExercisePrompt;
  /** German explanation for the feedback sheet. */
  explanation: string;
  /** False until the author has checked the content (PRD chapter 4); shown as a small marker. */
  reviewed: boolean;
  /** Classify a wrong answer: the first matching hint, else the first grammar tag (PRD F6). */
  errorHints: ErrorHint[];
  skillTags: string[];
}

export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple_choice';
  choices: string[];
  solutions: string[];
}

export interface TranslateWordbankExercise extends ExerciseBase {
  type: 'translate_wordbank';
  answerLang: Lang;
  /** Word chips including distractors, in content order (the player shuffles them). */
  wordBank: string[];
  solutions: string[];
}

export interface TranslateFreeExercise extends ExerciseBase {
  type: 'translate_free';
  answerLang: Lang;
  solutions: string[];
  standardForms: string[];
}

export interface FillGapExercise extends ExerciseBase {
  type: 'fill_gap';
  answerLang: Lang;
  /** Sentence with exactly one {@link GAP_MARKER}. */
  text: string;
  solutions: string[];
  /** Picked as chips when present; otherwise the gap is typed. */
  choices?: string[];
  standardForms: string[];
}

export interface WordPair {
  /** Gheg expression. */
  left: string;
  /** German meaning. */
  right: string;
}

export interface MatchPairsExercise extends ExerciseBase {
  type: 'match_pairs';
  pairs: WordPair[];
}

export interface WordOrderExercise extends ExerciseBase {
  type: 'word_order';
  answerLang: Lang;
  /** The words of the first solution in the correct order (the player shuffles them). */
  tokens: string[];
  solutions: string[];
}

export type LessonExercise =
  | MultipleChoiceExercise
  | TranslateWordbankExercise
  | TranslateFreeExercise
  | FillGapExercise
  | MatchPairsExercise
  | WordOrderExercise;

export type ExerciseType = LessonExercise['type'];

export const GAP_MARKER = '___';

export interface Lesson {
  sessionId: string;
  /** The unit or focus unit played; "review" or "checkpoint_<level>" for those kinds. */
  unitId: string;
  kind: LessonKind;
  exercises: LessonExercise[];
}

/** What the learner submitted; exactly one shape per exercise type. */
export type Answer =
  | { kind: 'choice'; choice: string }
  | { kind: 'text'; text: string }
  | { kind: 'tokens'; tokens: string[] }
  /** Every wrong match before all pairs were matched, as shown: a Gheg side with a German one. */
  | { kind: 'pairs'; wrongMatches: WordPair[] };

export type Outcome = 'correct' | 'almost_correct' | 'correct_standard_form' | 'wrong';

export interface Verdict {
  outcome: Outcome;
  /** What went wrong (PRD F6); absent for a correct answer. */
  errorCategory?: ErrorCategory;
  /** Correct, almost correct and standard-form answers count; only wrong ones are repeated. */
  countsAsCorrect: boolean;
  /** The accepted solution closest to the answer; absent for match_pairs. */
  solution?: string;
  /** Short German hint; words to look at are marked as **bold**. */
  hint?: string;
  explanation: string;
  /** The instant pre-check is replaced by the binding evaluation of the backend. */
  source: 'precheck' | 'server';
}

export interface AttemptSubmission {
  exerciseId: string;
  answer: Answer;
  responseTimeMs: number;
  retry: boolean;
}

export interface LearnedItem {
  id: string;
  gheg: string;
  de: string;
}

export interface XpBreakdown {
  base: number;
  perfectBonus: number;
  speedBonus: number;
}

export interface LessonResult {
  kind: LessonKind;
  /** Absent when the result could not be saved and was computed on the device. */
  xp?: { earned: number; breakdown: XpBreakdown; total: number };
  /** Share of exercises answered correctly at the first attempt, 0 to 1. */
  accuracy: number;
  correctCount: number;
  exerciseCount: number;
  durationMs: number;
  learnedItems: LearnedItem[];
  saved: boolean;
  /** A focus lesson on a skill tag answered wrongly three times or more (PRD F7). */
  focusSuggestion?: FocusSuggestion;
  /** Passed or not, the new level and the badges earned; only for a saved checkpoint. */
  checkpoint?: CheckpointResult;
}
