import { describe, expect, it } from 'vitest';
import blocklistFile from '../../../../../content/gheg_blocklist.json?raw';
import casesFile from '../../../../../content/fixtures/evaluator-cases.json?raw';
import type { StandardForms } from '../../../api/types';
import type {
  Answer,
  ErrorCategory,
  ErrorHint,
  Lang,
  LessonExercise,
  Outcome,
  WordPair,
} from '../model';
import { normalizeAnswer } from './normalize';
import { precheck } from './precheck';
import { createStandardFormLexicon } from './standardFormLexicon';

/*
 * The shared evaluator cases (docs/CONTENT_FORMAT.md, "Answer normalisation and tokenisation"):
 * the backend runs the same file in JUnit, so the pre-check and the binding verdict agree.
 */

interface FixtureExercise {
  type: LessonExercise['type'];
  skillTags: string[];
  errorHints?: ErrorHint[];
  answerLang?: Lang;
  solutions?: string[];
  standardForms?: string[];
  choices?: string[];
  text?: string;
  wordBank?: string[];
  tokens?: string[];
  pairs?: WordPair[];
}

interface FixtureCase {
  id: string;
  description: string;
  exercise: FixtureExercise;
  answer: { text?: string; choice?: string; tokens?: string[]; wrongMatches?: WordPair[] };
  expected: { outcome: Outcome; errorCategory?: ErrorCategory };
}

interface BlocklistFile {
  words: { standard: string; gheg: string }[];
  patterns: { id: string; pattern: string; gheg: string; exceptions?: { word: string }[] }[];
}

const { cases } = JSON.parse(casesFile) as { cases: FixtureCase[] };

/**
 * content/gheg_blocklist.json in the shape of GET /api/content/standard-forms, read like the
 * backend's GhegBlocklistReader: "kânë / kjenë" lists alternatives, "(…)" are remarks, "-ue"
 * replaces an ending, "shpi-" a beginning; words, values and exceptions are normalised.
 */
function standardFormsFromBlocklist(json: string): StandardForms {
  const blocklist = JSON.parse(json) as BlocklistFile;
  const alternatives = (gheg: string) =>
    gheg
      .replace(/\([^)]*\)/gu, '')
      .split('/')
      .map((alternative) => alternative.trim())
      .filter((alternative) => alternative !== '');
  return {
    words: blocklist.words.map((word) => ({
      standard: normalizeAnswer(word.standard),
      gheg: alternatives(word.gheg).map(normalizeAnswer),
    })),
    patterns: blocklist.patterns.map((pattern) => ({
      id: pattern.id,
      pattern: pattern.pattern,
      gheg: alternatives(pattern.gheg).map((alternative) => {
        if (alternative.startsWith('-')) {
          return { kind: 'suffix' as const, value: normalizeAnswer(alternative.slice(1)) };
        }
        if (alternative.endsWith('-')) {
          return { kind: 'prefix' as const, value: normalizeAnswer(alternative.slice(0, -1)) };
        }
        return { kind: 'word' as const, value: normalizeAnswer(alternative) };
      }),
      exceptions: (pattern.exceptions ?? []).map((exception) => normalizeAnswer(exception.word)),
    })),
  };
}

const lexicon = createStandardFormLexicon(standardFormsFromBlocklist(blocklistFile));

function required<T>(value: T | undefined, field: string, id: string): T {
  if (value === undefined) throw new Error(`Case ${id} lacks ${field}`);
  return value;
}

function toExercise({ id, exercise }: FixtureCase): LessonExercise {
  const need = <T>(value: T | undefined, field: string) => required(value, field, id);
  const base = {
    id,
    prompt: { lang: 'de' as const, text: id },
    explanation: '',
    reviewed: false,
    errorHints: exercise.errorHints ?? [],
    skillTags: exercise.skillTags,
  };
  switch (exercise.type) {
    case 'multiple_choice':
      return {
        ...base,
        type: 'multiple_choice',
        choices: need(exercise.choices, 'choices'),
        solutions: need(exercise.solutions, 'solutions'),
      };
    case 'translate_wordbank':
      return {
        ...base,
        type: 'translate_wordbank',
        answerLang: need(exercise.answerLang, 'answerLang'),
        wordBank: need(exercise.wordBank, 'wordBank'),
        solutions: need(exercise.solutions, 'solutions'),
      };
    case 'translate_free':
      return {
        ...base,
        type: 'translate_free',
        answerLang: need(exercise.answerLang, 'answerLang'),
        solutions: need(exercise.solutions, 'solutions'),
        standardForms: exercise.standardForms ?? [],
      };
    case 'fill_gap':
      return {
        ...base,
        type: 'fill_gap',
        answerLang: need(exercise.answerLang, 'answerLang'),
        text: need(exercise.text, 'text'),
        solutions: need(exercise.solutions, 'solutions'),
        choices: exercise.choices,
        standardForms: exercise.standardForms ?? [],
      };
    case 'word_order':
      return {
        ...base,
        type: 'word_order',
        answerLang: need(exercise.answerLang, 'answerLang'),
        tokens: need(exercise.tokens, 'tokens'),
        solutions: need(exercise.solutions, 'solutions'),
      };
    case 'match_pairs':
      return { ...base, type: 'match_pairs', pairs: need(exercise.pairs, 'pairs') };
  }
}

function toAnswer({ id, answer }: FixtureCase): Answer {
  if (answer.text !== undefined) return { kind: 'text', text: answer.text };
  if (answer.choice !== undefined) return { kind: 'choice', choice: answer.choice };
  if (answer.tokens !== undefined) return { kind: 'tokens', tokens: answer.tokens };
  if (answer.wrongMatches !== undefined)
    return { kind: 'pairs', wrongMatches: answer.wrongMatches };
  throw new Error(`Case ${id} has no answer`);
}

describe('shared evaluator cases', () => {
  it('are all there', () => {
    expect(cases.length).toBeGreaterThanOrEqual(82);
  });

  it.each(cases.map((fixture) => [`${fixture.id}: ${fixture.description}`, fixture] as const))(
    '%s',
    (_, fixture) => {
      const verdict = precheck(toExercise(fixture), toAnswer(fixture), lexicon);

      expect({ outcome: verdict.outcome, errorCategory: verdict.errorCategory }).toEqual(
        fixture.expected,
      );
    },
  );
});
