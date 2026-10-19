import type { Lesson, LessonExercise, Verdict } from '../model';

/*
 * Order of play: every exercise once, then the wrongly answered ones again at the end
 * until they are answered correctly. The backend's verdict wins over the pre-check, also after
 * the learner moved on: a late "wrong" queues the exercise again, a late "correct" removes a
 * repetition that has not been played yet.
 */

export interface QueueEntry {
  /** Stable id of this appearance of the exercise. */
  key: number;
  exercise: LessonExercise;
  /** Repeated at the end after a wrong answer. */
  retry: boolean;
  /** Set once the answer was checked. */
  verdict?: Verdict;
}

export interface LessonQueueState {
  entries: QueueEntry[];
  /** Index of the entry on screen; equals `entries.length` when everything is answered. */
  current: number;
  nextKey: number;
  /** The result is being saved: late verdicts no longer change the order. */
  finalized: boolean;
}

export type LessonQueueAction =
  | { type: 'checked'; verdict: Verdict }
  | { type: 'continued' }
  | { type: 'serverVerdict'; key: number; verdict: Verdict }
  | { type: 'finalized' };

export type LessonPhase = 'answering' | 'feedback' | 'done';

export function createLessonQueue(lesson: Lesson): LessonQueueState {
  return {
    entries: lesson.exercises.map((exercise, index) => ({ key: index, exercise, retry: false })),
    current: 0,
    nextKey: lesson.exercises.length,
    finalized: false,
  };
}

export function lessonQueueReducer(
  state: LessonQueueState,
  action: LessonQueueAction,
): LessonQueueState {
  switch (action.type) {
    case 'checked': {
      const entry = state.entries[state.current];
      if (!entry || entry.verdict) return state;
      return replaceEntry(state, state.current, { ...entry, verdict: action.verdict });
    }
    case 'continued': {
      const entry = state.entries[state.current];
      if (!entry?.verdict) return state;
      const next = { ...state, current: state.current + 1 };
      return entry.verdict.countsAsCorrect ? next : appendRetry(next, entry.exercise);
    }
    case 'serverVerdict':
      return applyServerVerdict(state, action.key, action.verdict);
    case 'finalized':
      return { ...state, finalized: true };
  }
}

function applyServerVerdict(
  state: LessonQueueState,
  key: number,
  verdict: Verdict,
): LessonQueueState {
  const index = state.entries.findIndex((entry) => entry.key === key);
  const entry = state.entries[index];
  if (!entry?.verdict) return state;
  const updated = replaceEntry(state, index, { ...entry, verdict });
  // While the feedback is open, "Weiter" decides with the new verdict.
  const movedOn = index < state.current;
  if (!movedOn || state.finalized || entry.verdict.countsAsCorrect === verdict.countsAsCorrect) {
    return updated;
  }
  return verdict.countsAsCorrect
    ? removeUnplayedRetry(updated, entry.exercise.id)
    : appendRetry(updated, entry.exercise);
}

function appendRetry(state: LessonQueueState, exercise: LessonExercise): LessonQueueState {
  return {
    ...state,
    entries: [...state.entries, { key: state.nextKey, exercise, retry: true }],
    nextKey: state.nextKey + 1,
  };
}

/** Only entries after the one on screen: an exercise never disappears while it is shown. */
function removeUnplayedRetry(state: LessonQueueState, exerciseId: string): LessonQueueState {
  const index = state.entries.findIndex(
    (entry, position) => position > state.current && entry.exercise.id === exerciseId,
  );
  if (index < 0) return state;
  return { ...state, entries: state.entries.filter((_, position) => position !== index) };
}

function replaceEntry(state: LessonQueueState, index: number, entry: QueueEntry) {
  return { ...state, entries: state.entries.map((old, i) => (i === index ? entry : old)) };
}

export function currentEntry(state: LessonQueueState): QueueEntry | undefined {
  return state.entries[state.current];
}

export function lessonPhase(state: LessonQueueState): LessonPhase {
  const entry = currentEntry(state);
  if (!entry) return 'done';
  return entry.verdict ? 'feedback' : 'answering';
}

export interface LessonProgress {
  /** Exercises answered correctly at some attempt. */
  completed: number;
  total: number;
}

export function lessonProgress(state: LessonQueueState): LessonProgress {
  const exerciseIds = new Set(state.entries.map((entry) => entry.exercise.id));
  const completed = new Set(
    state.entries
      .filter((entry) => entry.verdict?.countsAsCorrect)
      .map((entry) => entry.exercise.id),
  );
  return { completed: completed.size, total: exerciseIds.size };
}

/**
 * Answers in a row that counted as correct, ending with the one on screen once it is checked.
 * Repetitions count like any other answer.
 */
export function correctStreak(state: LessonQueueState): number {
  let streak = 0;
  for (const entry of state.entries.slice(0, state.current + 1)) {
    if (!entry.verdict) break;
    streak = entry.verdict.countsAsCorrect ? streak + 1 : 0;
  }
  return streak;
}

/** Runs that earn the combo badge: 3, then every fifth answer (5, 10, 15, ...). */
export function isComboMilestone(streak: number): boolean {
  return streak === 3 || (streak >= 5 && streak % 5 === 0);
}

export interface FirstAttemptSummary {
  exerciseCount: number;
  correctCount: number;
}

/** Local stand-in for the backend's accuracy when the result cannot be saved. */
export function firstAttemptSummary(state: LessonQueueState): FirstAttemptSummary {
  const firstAttempts = state.entries.filter((entry) => !entry.retry);
  return {
    exerciseCount: firstAttempts.length,
    correctCount: firstAttempts.filter((entry) => entry.verdict?.countsAsCorrect).length,
  };
}
