import type { ErrorCategory, ErrorHint } from '../model';

/*
 * Error category and hint of a wrong answer from the exercise metadata, as in the
 * backend's WrongAnswers and SkillTagErrorCategories. The shared fixture
 * content/fixtures/evaluator-cases.json keeps both implementations in step.
 */

/** The first error hint whose pattern is found in the normalised answer (diacritics kept). */
export function matchingHint(
  errorHints: readonly ErrorHint[],
  normalizedAnswer: string,
): ErrorHint | undefined {
  return errorHints.find((hint) => hintMatches(hint.pattern, normalizedAnswer));
}

function hintMatches(pattern: string, normalizedAnswer: string): boolean {
  try {
    return new RegExp(pattern, 'iu').test(normalizedAnswer);
  } catch {
    // A pattern only Java understands must not break the lesson; the backend still classifies it.
    return false;
  }
}

/** Grammar tag prefixes and their categories; the first matching prefix wins. */
const CATEGORY_BY_TAG_PREFIX: readonly (readonly [string, ErrorCategory])[] = [
  ['grammar.definite_article', 'grammar.definite_article'],
  ['grammar.linking_article', 'grammar.linking_article'],
  ['grammar.case', 'grammar.case'],
  ['grammar.clitics', 'grammar.clitics'],
  ['grammar.adjective_agreement', 'grammar.gender'],
  ['grammar.infinitive', 'grammar.infinitive'],
  ['grammar.verbs.infinitive', 'grammar.infinitive'],
  ['grammar.participle', 'grammar.participle'],
  ['grammar.verbs.participle', 'grammar.participle'],
  ['grammar.verbs.past_simple', 'grammar.verb_tense'],
  ['grammar.verbs.perfect', 'grammar.verb_tense'],
  ['grammar.verbs.imperfect', 'grammar.verb_tense'],
  ['grammar.verbs.future', 'grammar.verb_tense'],
  ['grammar.verbs.subjunctive', 'grammar.verb_tense'],
  ['grammar.verbs.conditional', 'grammar.verb_tense'],
  ['grammar.verbs.admirative', 'grammar.verb_tense'],
  ['grammar.verbs.optative', 'grammar.verb_tense'],
  ['grammar.verbs', 'grammar.verb_conjugation'],
];

/** The category of the first skill tag that maps to one, in tag order, else `fallback`. */
export function categoryFromSkillTags(
  skillTags: readonly string[],
  fallback: ErrorCategory,
): ErrorCategory {
  for (const tag of skillTags) {
    const entry = CATEGORY_BY_TAG_PREFIX.find(([prefix]) => tag.startsWith(prefix));
    if (entry) return entry[1];
  }
  return fallback;
}

/** What an exercise knows about its wrong answers. */
export interface WrongAnswerRules {
  errorHints: readonly ErrorHint[];
  skillTags: readonly string[];
}

/** The matching hint, else the category of the skill tags or `fallback`. */
export function classifyWrong(
  rules: WrongAnswerRules,
  normalizedAnswer: string,
  fallback: ErrorCategory,
): { errorCategory: ErrorCategory; hint?: string } {
  const hint = matchingHint(rules.errorHints, normalizedAnswer);
  return hint
    ? { errorCategory: hint.category, hint: hint.hint }
    : { errorCategory: categoryFromSkillTags(rules.skillTags, fallback) };
}
