import { at } from '../report.mjs';
import { missingFromMultiset, normalizeForComparison, tokenize } from '../text.mjs';
import { exercisesOf, isUnitDoc } from '../walk.mjs';

const GAP = '___';
const WORD_BANK_DISTRACTORS = { min: 2, max: 4 };

/** Per-type rules that JSON Schema cannot express, plus error-hint and standard-form sanity checks. */
export function checkExerciseRules(content, report) {
  for (const { doc, exercise, pointer } of exercisesOf(content)) {
    const findings = [
      ...(TYPE_RULES[exercise.type]?.(exercise) ?? []),
      ...errorHintProblems(exercise),
      ...standardFormProblems(exercise),
    ];
    for (const { path, message } of findings) report.error(doc.path, at(`${pointer}${path}`, exercise.id), message);
    if (isUnitDoc(doc)) warnOnUnitMismatch(doc, exercise, pointer, report);
  }
}

const TYPE_RULES = {
  multiple_choice: (exercise) =>
    exercise.choices.includes(exercise.solutions[0])
      ? []
      : [{ path: '/solutions/0', message: 'The solution must be one of the 4 choices.' }],

  translate_wordbank: (exercise) => {
    const tokens = tokenize(exercise.solutions[0]);
    const missing = missingFromMultiset(tokens, exercise.wordBank);
    if (missing.length > 0) {
      return [{ path: '/wordBank', message: `wordBank lacks token(s) of solutions[0]: ${quoteAll(missing)}.` }];
    }
    const distractors = exercise.wordBank.length - tokens.length;
    return distractors >= WORD_BANK_DISTRACTORS.min && distractors <= WORD_BANK_DISTRACTORS.max
      ? []
      : [{ path: '/wordBank', message: `wordBank needs ${WORD_BANK_DISTRACTORS.min}–${WORD_BANK_DISTRACTORS.max} distractors besides the tokens of solutions[0], found ${distractors}.` }];
  },

  fill_gap: (exercise) => {
    const problems = [];
    const gaps = exercise.text.match(/_+/gu) ?? [];
    if (gaps.length !== 1 || gaps[0] !== GAP) problems.push({ path: '/text', message: `text must contain exactly one gap "${GAP}".` });
    if (exercise.choices && !exercise.choices.includes(exercise.solutions[0])) {
      problems.push({ path: '/choices', message: 'choices must contain solutions[0].' });
    }
    return problems;
  },

  match_pairs: (exercise) =>
    ['left', 'right'].flatMap((side) => {
      const duplicates = duplicatesOf(exercise.pairs.map((pair) => normalizeForComparison(pair[side])));
      return duplicates.length > 0 ? [{ path: '/pairs', message: `Pairs need unique ${side} sides, duplicated: ${quoteAll(duplicates)}.` }] : [];
    }),

  word_order: (exercise) => {
    const problems = [];
    if (normalizeForComparison(exercise.tokens.join(' ')) !== normalizeForComparison(exercise.solutions[0])) {
      problems.push({ path: '/tokens', message: 'tokens joined in order must equal solutions[0] (ignoring case and punctuation).' });
    }
    for (const [index, solution] of exercise.solutions.entries()) {
      if (!isSameMultiset(tokenize(solution), exercise.tokens)) {
        problems.push({ path: `/solutions/${index}`, message: 'Every accepted ordering must use exactly the given tokens.' });
      }
    }
    return problems;
  },
};

function errorHintProblems(exercise) {
  return (exercise.errorHints ?? []).flatMap((hint, index) => {
    try {
      new RegExp(hint.pattern, 'iu');
      return [];
    } catch (error) {
      return [{ path: `/errorHints/${index}/pattern`, message: `Invalid regex: ${error.message}` }];
    }
  });
}

function standardFormProblems(exercise) {
  const solutions = new Set((exercise.solutions ?? []).map(normalizeForComparison));
  return (exercise.standardForms ?? []).flatMap((form, index) =>
    solutions.has(normalizeForComparison(form))
      ? [{ path: `/standardForms/${index}`, message: 'A standard form must not also be listed as a Gheg solution.' }]
      : [],
  );
}

function warnOnUnitMismatch(doc, exercise, pointer, report) {
  const { unitId, level } = doc.data;
  if (exercise.level !== level) {
    report.warn(doc.path, at(`${pointer}/level`, exercise.id), `Exercise level ${exercise.level} differs from unit level ${level}.`);
  }
  if (!exercise.id.startsWith(`ex_${unitId}_`)) {
    report.warn(doc.path, at(`${pointer}/id`, exercise.id), `Exercise id should start with "ex_${unitId}_".`);
  }
}

function isSameMultiset(left, right) {
  return left.length === right.length && missingFromMultiset(left, right).length === 0;
}

function duplicatesOf(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function quoteAll(values) {
  return values.map((value) => `"${value}"`).join(', ');
}
