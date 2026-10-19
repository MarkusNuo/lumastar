import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type { PlacementItem } from '../../api/types';
import { toSubmittedAnswer } from '../lesson/lessonApi';
import type { Answer, LessonExercise } from '../lesson/model';

/* The only place that knows the API shapes of the placement test. */

export interface PlacementStep {
  exercise: LessonExercise;
  /** 1-based position of the item in the test. */
  position: number;
}

export interface StartedPlacement extends PlacementStep {
  testId: string;
  /** The most items the test can take; it usually ends earlier. */
  maxItems: number;
}

export type PlacementProgress = { finished: false; next: PlacementStep } | { finished: true };

/** Starting abandons an unfinished test, so every visit of the test screen starts a new one. */
export async function startPlacement(): Promise<StartedPlacement> {
  const response = await unwrap(api.POST('/api/placement'));
  return {
    testId: response.testId,
    maxItems: response.maxItems,
    position: response.position,
    exercise: toPlacementExercise(response.item),
  };
}

export async function answerPlacementItem(
  testId: string,
  exerciseId: string,
  answer: Answer,
  responseTimeMs: number,
): Promise<PlacementProgress> {
  const response = await unwrap(
    api.POST('/api/placement/{testId}/answers', {
      params: { path: { testId } },
      body: { exerciseId, answer: toSubmittedAnswer(answer), responseTimeMs },
    }),
  );
  if (response.finished || !response.nextItem) return { finished: true };
  return {
    finished: false,
    next: { exercise: toPlacementExercise(response.nextItem), position: response.position },
  };
}

export function skipPlacement() {
  return unwrap(api.POST('/api/placement/skip'));
}

export function placementResultQuery(testId: string) {
  return queryOptions({
    queryKey: ['placement', 'result', testId],
    queryFn: () =>
      unwrap(api.GET('/api/placement/{testId}/result', { params: { path: { testId } } })),
    // A finished test never changes.
    staleTime: Infinity,
  });
}

function required<T>(value: T | undefined, field: string, item: PlacementItem): T {
  if (value === undefined)
    throw new Error(`Placement item ${item.id} (${item.type}) lacks ${field}`);
  return value;
}

/**
 * A placement item as an exercise of the lesson player, so the same components render it. Items
 * come without solutions and explanation: the test gives no feedback.
 */
export function toPlacementExercise(item: PlacementItem): LessonExercise {
  const need = <T>(value: T | undefined, field: string) => required(value, field, item);
  const base = {
    id: item.id,
    prompt: item.prompt,
    reviewed: item.reviewed,
    explanation: '',
    errorHints: [],
    skillTags: [],
  };
  const withoutSolutions = { solutions: [] };

  switch (item.type) {
    case 'multiple_choice':
      return {
        ...base,
        ...withoutSolutions,
        type: 'multiple_choice',
        choices: need(item.choices, 'choices'),
      };
    case 'translate_wordbank':
      return {
        ...base,
        ...withoutSolutions,
        type: 'translate_wordbank',
        answerLang: need(item.answerLang, 'answerLang'),
        wordBank: need(item.wordBank, 'wordBank'),
      };
    case 'translate_free':
      return {
        ...base,
        ...withoutSolutions,
        type: 'translate_free',
        answerLang: need(item.answerLang, 'answerLang'),
        standardForms: [],
      };
    case 'fill_gap':
      return {
        ...base,
        ...withoutSolutions,
        type: 'fill_gap',
        answerLang: need(item.answerLang, 'answerLang'),
        text: need(item.text, 'text'),
        choices: item.choices,
        standardForms: [],
      };
    case 'word_order':
      return {
        ...base,
        ...withoutSolutions,
        type: 'word_order',
        answerLang: need(item.answerLang, 'answerLang'),
        tokens: need(item.tokens, 'tokens'),
      };
    case 'match_pairs':
    case 'conjugation_drill':
    case 'declension_drill':
    case 'reading':
    case 'free_writing':
    case 'listen_select':
      throw new Error(`Placement items of type ${item.type} are not supported`);
  }
}
