import { describe, expect, it } from 'vitest';
import type { Lesson, Outcome, Verdict } from '../model';
import {
  SAMPLE_FILL_GAP_CHOICES,
  SAMPLE_MULTIPLE_CHOICE,
  SAMPLE_WORDBANK,
} from '../sampleExercises';
import {
  createLessonQueue,
  currentEntry,
  firstAttemptSummary,
  lessonPhase,
  lessonProgress,
  lessonQueueReducer,
  type LessonQueueAction,
  type LessonQueueState,
} from './lessonQueue';

const LESSON: Lesson = {
  sessionId: 'session-1',
  unitId: 'a1_u01_greetings',
  exercises: [SAMPLE_MULTIPLE_CHOICE, SAMPLE_WORDBANK, SAMPLE_FILL_GAP_CHOICES],
};

function verdict(outcome: Outcome, source: Verdict['source'] = 'precheck'): Verdict {
  return { outcome, countsAsCorrect: outcome !== 'wrong', explanation: 'Erklärung', source };
}

function play(...actions: LessonQueueAction[]): LessonQueueState {
  return actions.reduce(lessonQueueReducer, createLessonQueue(LESSON));
}

const answer = (outcome: Outcome): LessonQueueAction[] => [
  { type: 'checked', verdict: verdict(outcome) },
  { type: 'continued' },
];

const playedIds = (state: LessonQueueState) => state.entries.map((entry) => entry.exercise.id);

describe('lesson queue', () => {
  it('starts with the first exercise, waiting for an answer', () => {
    const state = createLessonQueue(LESSON);

    expect(currentEntry(state)?.exercise).toBe(SAMPLE_MULTIPLE_CHOICE);
    expect(lessonPhase(state)).toBe('answering');
    expect(lessonProgress(state)).toEqual({ completed: 0, total: 3 });
  });

  it('shows the feedback after checking and counts a correct answer right away', () => {
    const state = play({ type: 'checked', verdict: verdict('correct') });

    expect(lessonPhase(state)).toBe('feedback');
    expect(lessonProgress(state).completed).toBe(1);
  });

  it('ignores a second check of the same answer', () => {
    const first = verdict('wrong');
    const state = play(
      { type: 'checked', verdict: first },
      { type: 'checked', verdict: verdict('correct') },
    );

    expect(currentEntry(state)?.verdict).toBe(first);
  });

  it('ignores "continue" before the answer was checked', () => {
    expect(play({ type: 'continued' }).current).toBe(0);
  });

  it('plays every exercise once and is done when all were answered correctly', () => {
    const state = play(...answer('correct'), ...answer('almost_correct'), ...answer('correct'));

    expect(lessonPhase(state)).toBe('done');
    expect(state.entries).toHaveLength(3);
    expect(lessonProgress(state)).toEqual({ completed: 3, total: 3 });
  });

  it('repeats a wrong exercise at the end until it is answered correctly', () => {
    const state = play(
      ...answer('wrong'),
      ...answer('correct'),
      ...answer('correct_standard_form'),
      ...answer('wrong'),
    );

    expect(playedIds(state)).toEqual([
      SAMPLE_MULTIPLE_CHOICE.id,
      SAMPLE_WORDBANK.id,
      SAMPLE_FILL_GAP_CHOICES.id,
      SAMPLE_MULTIPLE_CHOICE.id,
      SAMPLE_MULTIPLE_CHOICE.id,
    ]);
    expect(currentEntry(state)).toMatchObject({ exercise: SAMPLE_MULTIPLE_CHOICE, retry: true });
    expect(lessonProgress(state)).toEqual({ completed: 2, total: 3 });

    const finished = [...answer('correct')].reduce(lessonQueueReducer, state);
    expect(lessonPhase(finished)).toBe('done');
    expect(lessonProgress(finished)).toEqual({ completed: 3, total: 3 });
  });

  it('does not repeat almost correct and Standard-form answers', () => {
    const state = play(
      ...answer('almost_correct'),
      ...answer('correct_standard_form'),
      ...answer('correct'),
    );

    expect(state.entries).toHaveLength(3);
  });

  it('gives every appearance of an exercise its own key', () => {
    const state = play(...answer('wrong'), ...answer('wrong'));
    const keys = state.entries.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('summarises the first attempts only', () => {
    const state = play(
      ...answer('wrong'),
      ...answer('correct'),
      ...answer('correct'),
      ...answer('correct'),
    );

    expect(firstAttemptSummary(state)).toEqual({ exerciseCount: 3, correctCount: 2 });
  });
});

describe('backend verdict', () => {
  it('replaces the pre-check while the feedback is open, and decides the order', () => {
    let state = play({ type: 'checked', verdict: verdict('wrong') });
    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 0,
      verdict: verdict('correct_standard_form', 'server'),
    });

    expect(currentEntry(state)?.verdict).toMatchObject({
      outcome: 'correct_standard_form',
      source: 'server',
    });

    state = lessonQueueReducer(state, { type: 'continued' });
    expect(state.entries).toHaveLength(3);
  });

  it('removes the repetition when a late verdict turns wrong into correct', () => {
    let state = play(...answer('wrong'));
    expect(state.entries).toHaveLength(4);

    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 0,
      verdict: verdict('almost_correct', 'server'),
    });

    expect(state.entries).toHaveLength(3);
    expect(lessonProgress(state).completed).toBe(1);
  });

  it('queues a repetition when a late verdict turns correct into wrong', () => {
    let state = play(...answer('correct'));
    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 0,
      verdict: verdict('wrong', 'server'),
    });

    expect(playedIds(state).at(-1)).toBe(SAMPLE_MULTIPLE_CHOICE.id);
    expect(state.entries.at(-1)?.retry).toBe(true);
    expect(lessonProgress(state).completed).toBe(0);
  });

  it('brings a finished lesson back to the repetition when a late verdict says wrong', () => {
    let state = play(...answer('correct'), ...answer('correct'), ...answer('correct'));
    expect(lessonPhase(state)).toBe('done');

    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 2,
      verdict: verdict('wrong', 'server'),
    });

    expect(lessonPhase(state)).toBe('answering');
    expect(currentEntry(state)?.exercise).toBe(SAMPLE_FILL_GAP_CHOICES);
  });

  it('keeps a repetition that is already on screen', () => {
    let state = play(...answer('wrong'), ...answer('correct'), ...answer('correct'));
    expect(currentEntry(state)?.retry).toBe(true);

    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 0,
      verdict: verdict('correct', 'server'),
    });

    expect(currentEntry(state)).toMatchObject({ exercise: SAMPLE_MULTIPLE_CHOICE, retry: true });
  });

  it('no longer changes the order once the result is being saved', () => {
    let state = play(...answer('correct'), ...answer('correct'), ...answer('correct'), {
      type: 'finalized',
    });
    state = lessonQueueReducer(state, {
      type: 'serverVerdict',
      key: 1,
      verdict: verdict('wrong', 'server'),
    });

    expect(lessonPhase(state)).toBe('done');
    expect(state.entries[1]?.verdict?.outcome).toBe('wrong');
  });

  it('ignores a verdict for an unknown or unchecked entry', () => {
    const state = createLessonQueue(LESSON);

    expect(
      lessonQueueReducer(state, { type: 'serverVerdict', key: 0, verdict: verdict('correct') }),
    ).toBe(state);
    expect(
      lessonQueueReducer(state, { type: 'serverVerdict', key: 99, verdict: verdict('correct') }),
    ).toBe(state);
  });
});
