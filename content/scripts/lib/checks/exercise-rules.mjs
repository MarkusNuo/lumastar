import { at } from '../report.mjs';
import { ABSENT_AFTER_NORMALISATION, missingFromMultiset, normalizeAnswer, sameToken, tokenize } from '../text.mjs';
import { exercisesOf, isUnitDoc } from '../walk.mjs';

const GAP = '___';
const WORD_BANK_DISTRACTORS = { min: 2, max: 4 };
// Regex metacharacters plus the punctuation that quantifiers, groups and lookarounds use. Every other character
// that normalisation removes or turns into a space is a literal that can never match a normalised answer.
const REGEX_SYNTAX = new Set([...'\\^$.|?*+()[]{}-,:!=<>']);

/** Per-type rules that JSON Schema cannot express, plus error-hint and standard-form sanity checks. */
export function checkExerciseRules(content, report) {
  for (const { doc, exercise, pointer } of exercisesOf(content)) {
    for (const { path, message } of exerciseProblems(exercise)) report.error(doc.path, at(`${pointer}${path}`, exercise.id), message);
    if (isUnitDoc(doc)) warnOnUnitMismatch(doc, exercise, pointer, report);
  }
}

/** Problems of one exercise as `{ path, message }` (path relative to the exercise); also used for fixture exercises. */
export function exerciseProblems(exercise) {
  return [...(TYPE_RULES[exercise.type]?.(exercise) ?? []), ...errorHintProblems(exercise), ...standardFormProblems(exercise)];
}

const TYPE_RULES = {
  multiple_choice: (exercise) =>
    exercise.choices.includes(exercise.solutions[0])
      ? []
      : [{ path: '/solutions/0', message: 'The solution must be one of the 4 choices.' }],

  translate_wordbank: (exercise) => {
    const problems = uncleanTokenProblems(exercise.wordBank, '/wordBank');
    const tokens = tokenize(exercise.solutions[0]);
    const missing = missingFromMultiset(tokens, exercise.wordBank);
    if (missing.length > 0) {
      return [...problems, { path: '/wordBank', message: `wordBank lacks token(s) of solutions[0]: ${quoteAll(missing)}.` }];
    }
    const distractors = exercise.wordBank.length - tokens.length;
    if (distractors < WORD_BANK_DISTRACTORS.min || distractors > WORD_BANK_DISTRACTORS.max) {
      problems.push({ path: '/wordBank', message: `wordBank needs ${WORD_BANK_DISTRACTORS.min}–${WORD_BANK_DISTRACTORS.max} distractors besides the tokens of solutions[0], found ${distractors}.` });
    }
    return problems;
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
      const duplicates = duplicatesOf(exercise.pairs.map((pair) => normalizeAnswer(pair[side])));
      return duplicates.length > 0 ? [{ path: '/pairs', message: `Pairs need unique ${side} sides, duplicated: ${quoteAll(duplicates)}.` }] : [];
    }),

  word_order: (exercise) => {
    const problems = uncleanTokenProblems(exercise.tokens, '/tokens');
    const expected = tokenize(exercise.solutions[0]);
    const inOrder = expected.length === exercise.tokens.length && expected.every((token, index) => sameToken(token, exercise.tokens[index]));
    if (!inOrder) {
      problems.push({ path: '/tokens', message: `tokens must be the tokens of solutions[0] in order: ${quoteAll(expected)}.` });
    }
    for (const [index, solution] of exercise.solutions.entries()) {
      if (!isSameMultiset(tokenize(solution), exercise.tokens)) {
        problems.push({ path: `/solutions/${index}`, message: 'Every accepted ordering must use exactly the given tokens.' });
      }
    }
    return problems;
  },
};

/** Word-bank and word-order entries are single tokens without surrounding punctuation (contract step 5). */
function uncleanTokenProblems(entries, path) {
  return entries.flatMap((entry, index) => {
    const tokens = tokenize(entry);
    return tokens.length === 1 && tokens[0] === entry
      ? []
      : [{ path: `${path}/${index}`, message: `"${entry}" must be a single token without surrounding punctuation.` }];
  });
}

/**
 * Hint patterns are matched case-insensitively against the normalised wrong answer (diacritics kept).
 * A pattern must compile, must be able to match a normalised answer at all, and must not match a
 * solution: solutions never reach the hints, so such a pattern is too broad and misfires on near misses.
 * Matching a standard form is fine (e.g. "punuar" still catches the mixed form "tue punuar").
 */
function errorHintProblems(exercise) {
  const solutions = exercise.solutions ?? [];
  return (exercise.errorHints ?? []).flatMap((hint, index) => {
    const path = `/errorHints/${index}/pattern`;
    let regex;
    try {
      regex = new RegExp(hint.pattern, 'iu');
    } catch (error) {
      return [{ path, message: `Invalid regex: ${error.message}` }];
    }
    const removed = literalsRemovedByNormalisation(hint.pattern);
    if (removed.length > 0) {
      return [{ path, message: `Pattern contains ${quoteAll(removed)}, which normalisation removes (apostrophes) or turns into a space (other punctuation) in every answer, so it can never match.` }];
    }
    const matchedSolution = solutions.find((solution) => regex.test(normalizeAnswer(solution)));
    return matchedSolution
      ? [{ path, message: `Pattern matches the solution "${matchedSolution}"; hints only apply to wrong answers.` }]
      : [];
  });
}

function literalsRemovedByNormalisation(pattern) {
  return [...new Set([...pattern].filter((character) => ABSENT_AFTER_NORMALISATION.test(character) && !REGEX_SYNTAX.has(character)))];
}

/** Standard forms only count for typed answers (contract point 7) and must not repeat a Gheg solution. */
function standardFormProblems(exercise) {
  if (exercise.standardForms && isPickedAnswer(exercise)) {
    return [{ path: '/standardForms', message: 'Picked answers are exact (contract point 7), so standardForms are never evaluated here: remove them or drop the choices to make the answer typed.' }];
  }
  const solutions = new Set((exercise.solutions ?? []).map(normalizeAnswer));
  return (exercise.standardForms ?? []).flatMap((form, index) =>
    solutions.has(normalizeAnswer(form))
      ? [{ path: `/standardForms/${index}`, message: 'A standard form must not also be listed as a Gheg solution.' }]
      : [],
  );
}

/** multiple_choice and fill_gap with choices: the learner picks an option instead of typing (contract point 7). */
function isPickedAnswer(exercise) {
  return exercise.type === 'multiple_choice' || (exercise.type === 'fill_gap' && exercise.choices !== undefined);
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
