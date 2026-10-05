import type { LessonResult } from '../lesson/model';

/*
 * Checkpoint results as the lesson player maps them from POST /api/lessons/{id}/complete, for unit
 * tests and the component catalog. The app itself only shows results from the API.
 */

/** The last checkpoint of A1 passed: up to A2.1 with the A1 badge. */
export const SAMPLE_CHECKPOINT_PASSED: LessonResult = {
  kind: 'checkpoint',
  xp: { earned: 25, breakdown: { base: 10, perfectBonus: 0, speedBonus: 15 }, total: 1265 },
  accuracy: 13 / 15,
  correctCount: 13,
  exerciseCount: 15,
  durationMs: 312_000,
  learnedItems: [],
  saved: true,
  checkpoint: {
    level: 'A1.3',
    passed: true,
    newLevel: 'A2.1',
    requiredAccuracy: 0.8,
    badges: ['A1'],
  },
};

/** A checkpoint within a band: a new level without a badge. */
export const SAMPLE_CHECKPOINT_LEVEL_UP: LessonResult = {
  ...SAMPLE_CHECKPOINT_PASSED,
  checkpoint: {
    level: 'A1.2',
    passed: true,
    newLevel: 'A1.3',
    requiredAccuracy: 0.8,
    badges: [],
  },
};

export const SAMPLE_CHECKPOINT_FAILED: LessonResult = {
  kind: 'checkpoint',
  xp: { earned: 10, breakdown: { base: 10, perfectBonus: 0, speedBonus: 0 }, total: 1250 },
  accuracy: 10 / 15,
  correctCount: 10,
  exerciseCount: 15,
  durationMs: 355_000,
  learnedItems: [],
  saved: true,
  focusSuggestion: {
    skillTag: 'grammar.definite_article',
    label: 'Bestimmter Artikel',
    unitId: 'focus_grammar.definite_article_1',
  },
  checkpoint: { level: 'A1.2', passed: false, requiredAccuracy: 0.8, badges: [] },
};
