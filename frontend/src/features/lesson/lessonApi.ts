import { queryOptions } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import type {
  AttemptResponse,
  LessonExerciseResponse,
  LessonResponse,
  LessonResultResponse,
  SubmittedAnswer,
} from '../../api/types';
import type {
  Answer,
  AttemptSubmission,
  Lesson,
  LessonExercise,
  LessonResult,
  Verdict,
} from './model';
import { createStandardFormLexicon } from './evaluation/standardFormLexicon';

/* The only place that knows the API shapes of the lesson player; everything else uses model.ts. */

const DAY_MS = 86_400_000;

/** The Standard-form lexicon of the pre-check; it changes only with the content (cached a day). */
export const standardFormsQuery = queryOptions({
  queryKey: ['content', 'standardForms'],
  queryFn: () => unwrap(api.GET('/api/content/standard-forms')),
  staleTime: DAY_MS,
  select: createStandardFormLexicon,
});

export async function startLesson(unitId: string): Promise<Lesson> {
  return toLesson(await unwrap(api.POST('/api/lessons', { body: { unitId } })));
}

export async function submitAttempt(
  sessionId: string,
  submission: AttemptSubmission,
): Promise<Verdict> {
  const response = await unwrap(
    api.POST('/api/lessons/{sessionId}/attempts', {
      params: { path: { sessionId } },
      body: {
        exerciseId: submission.exerciseId,
        answer: toSubmittedAnswer(submission.answer),
        responseTimeMs: submission.responseTimeMs,
        retry: submission.retry,
      },
    }),
  );
  return toVerdict(response);
}

export async function completeLesson(sessionId: string): Promise<LessonResult> {
  const response = await unwrap(
    api.POST('/api/lessons/{sessionId}/complete', { params: { path: { sessionId } } }),
  );
  return toLessonResult(response);
}

export function toLesson(response: LessonResponse): Lesson {
  return {
    sessionId: response.sessionId,
    unitId: response.unitId,
    exercises: response.exercises.map(toExercise),
  };
}

function required<T>(value: T | undefined, field: string, exercise: LessonExerciseResponse): T {
  // Every exercise has to be answered before the lesson can be completed, so none may be skipped.
  if (value === undefined)
    throw new Error(`Exercise ${exercise.id} (${exercise.type}) lacks ${field}`);
  return value;
}

export function toExercise(response: LessonExerciseResponse): LessonExercise {
  const base = {
    id: response.id,
    prompt: response.prompt,
    explanation: response.explanation,
    reviewed: response.reviewed,
    errorHints: response.errorHints,
    skillTags: response.skillTags,
  };
  const need = <T>(value: T | undefined, field: string) => required(value, field, response);

  switch (response.type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        choices: need(response.choices, 'choices'),
        solutions: need(response.solutions, 'solutions'),
      };
    case 'translate_wordbank':
      return {
        ...base,
        type: 'translate_wordbank',
        answerLang: need(response.answerLang, 'answerLang'),
        wordBank: need(response.wordBank, 'wordBank'),
        solutions: need(response.solutions, 'solutions'),
      };
    case 'translate_free':
      return {
        ...base,
        type: 'translate_free',
        answerLang: need(response.answerLang, 'answerLang'),
        solutions: need(response.solutions, 'solutions'),
        standardForms: response.standardForms ?? [],
      };
    case 'fill_gap':
      return {
        ...base,
        type: 'fill_gap',
        answerLang: need(response.answerLang, 'answerLang'),
        text: need(response.text, 'text'),
        solutions: need(response.solutions, 'solutions'),
        choices: response.choices,
        standardForms: response.standardForms ?? [],
      };
    case 'match_pairs':
      return { ...base, type: 'match_pairs', pairs: need(response.pairs, 'pairs') };
    case 'word_order':
      return {
        ...base,
        type: 'word_order',
        answerLang: need(response.answerLang, 'answerLang'),
        tokens: need(response.tokens, 'tokens'),
        solutions: need(response.solutions, 'solutions'),
      };
    case 'conjugation_drill':
    case 'declension_drill':
    case 'reading':
    case 'free_writing':
    case 'listen_select':
      throw new Error(`Exercise type ${response.type} is not playable yet`);
  }
}

export function toSubmittedAnswer(answer: Answer): SubmittedAnswer {
  switch (answer.kind) {
    case 'choice':
      return { choice: answer.choice };
    case 'text':
      return { text: answer.text };
    case 'tokens':
      return { tokens: answer.tokens };
    case 'pairs':
      return { wrongMatches: answer.wrongMatches };
  }
}

export function toVerdict(response: AttemptResponse): Verdict {
  return {
    outcome: response.outcome,
    errorCategory: response.errorCategory,
    countsAsCorrect: response.countsAsCorrect,
    solution: response.solution,
    hint: response.hint,
    explanation: response.explanation,
    source: 'server',
  };
}

export function toLessonResult(response: LessonResultResponse): LessonResult {
  return {
    xp: { earned: response.xpEarned, breakdown: response.xpBreakdown, total: response.xpTotal },
    accuracy: response.accuracy,
    correctCount: response.correctCount,
    exerciseCount: response.exerciseCount,
    durationMs: response.durationMs,
    learnedItems: response.learnedItems,
    saved: true,
  };
}
