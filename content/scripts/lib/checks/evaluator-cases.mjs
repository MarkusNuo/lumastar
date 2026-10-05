import { at } from '../report.mjs';
import { isCircumflexVowel, missingDiacriticsOf, normalizeAnswer } from '../text.mjs';
import { evaluatorCasesOf } from '../walk.mjs';
import { exerciseProblems } from './exercise-rules.mjs';
import { stringsOf } from './unicode.mjs';

const TYPED = 'text';
const PICKED = 'choice';
const TILES = 'tokens';
const PAIRS = 'wrongMatches';
const KIND_LABELS = { [PICKED]: 'choices', [TILES]: 'tiles', [PAIRS]: 'pairs' };
const ALMOST_CORRECT_CATEGORIES = new Set(['spelling.nasal_vowel', 'spelling.diacritics', 'spelling.other']);
const DIACRITIC_CATEGORIES = new Set(['spelling.nasal_vowel', 'spelling.diacritics']);

/**
 * Well-formedness of content/fixtures/evaluator-cases.json beyond its schema: unique case ids, exercises that follow
 * the unit rules, an answer of the kind the exercise type takes and built from its options, and an expected result
 * that fits the contract (docs/CONTENT_FORMAT.md, "Answer normalisation and tokenisation"): correct exactly when the
 * answer equals a solution, tolerance only for typed answers, and missing diacritics classified as in point 4.
 * Answers may deliberately be decomposed (not NFC); every other string must be NFC.
 */
export function checkEvaluatorCases(content, report) {
  const seenIds = new Set();
  for (const { doc, testCase, pointer } of evaluatorCasesOf(content)) {
    const problems = [
      ...(seenIds.has(testCase.id) ? [{ path: '/id', message: 'Duplicate case id.' }] : []),
      ...nonNfcProblems(testCase),
      ...exerciseProblems(testCase.exercise).map(({ path, message }) => ({ path: `/exercise${path}`, message })),
      ...answerProblems(testCase),
    ];
    if (problems.length === 0) problems.push(...expectationProblems(testCase));
    seenIds.add(testCase.id);
    for (const { path, message } of problems) report.error(doc.path, at(`${pointer}${path}`, testCase.id), message);
  }
}

/** The answer kind of an exercise (contract points 6 and 8). */
function answerKindOf(exercise) {
  switch (exercise.type) {
    case 'translate_free':
      return TYPED;
    case 'fill_gap':
      return exercise.choices ? PICKED : TYPED;
    case 'multiple_choice':
      return PICKED;
    case 'translate_wordbank':
    case 'word_order':
      return TILES;
    case 'match_pairs':
      return PAIRS;
    default:
      return null;
  }
}

function nonNfcProblems(testCase) {
  const { answer, ...rest } = testCase;
  return [...stringsOf(rest, '')]
    .filter(({ text }) => text !== text.normalize('NFC'))
    .map(({ pointer, text }) => ({ path: pointer, message: `Text is not in Unicode NFC (only answers may be decomposed): "${text}".` }));
}

function answerProblems({ exercise, answer }) {
  const expectedKind = answerKindOf(exercise);
  const [kind] = Object.keys(answer);
  if (kind !== expectedKind) {
    return [{ path: `/answer/${kind}`, message: `A ${describeType(exercise)} answer is "${expectedKind}", not "${kind}".` }];
  }
  switch (kind) {
    case PICKED:
      return exercise.choices.includes(answer.choice) ? [] : [{ path: '/answer/choice', message: `"${answer.choice}" is not one of the choices.` }];
    case TILES: {
      const unavailable = notAvailable(answer.tokens, exercise.type === 'word_order' ? exercise.tokens : exercise.wordBank);
      return unavailable.length === 0 ? [] : [{ path: '/answer/tokens', message: `Tiles not available (or used too often): ${quoteAll(unavailable)}.` }];
    }
    case PAIRS:
      return wrongMatchProblems(exercise.pairs, answer.wrongMatches);
    default:
      return [];
  }
}

function describeType(exercise) {
  if (exercise.type !== 'fill_gap') return exercise.type;
  return exercise.choices ? 'fill_gap with choices' : 'fill_gap without choices';
}

/** A wrong match pairs an existing left side with an existing right side that is not its partner, each at most once. */
function wrongMatchProblems(pairs, wrongMatches) {
  const partner = new Map(pairs.map(({ left, right }) => [left, right]));
  const rights = new Set(pairs.map(({ right }) => right));
  const seen = new Set();
  return wrongMatches.flatMap(({ left, right }, index) => {
    const path = `/answer/wrongMatches/${index}`;
    const key = `${left}\u0000${right}`;
    const duplicate = seen.has(key);
    seen.add(key);
    if (!partner.has(left)) return [{ path, message: `"${left}" is not a left side of the pairs.` }];
    if (!rights.has(right)) return [{ path, message: `"${right}" is not a right side of the pairs.` }];
    if (partner.get(left) === right) return [{ path, message: `"${left}" – "${right}" is a correct match.` }];
    return duplicate ? [{ path, message: 'Duplicate wrong match.' }] : [];
  });
}

function expectationProblems(testCase) {
  return [...outcomeProblems(testCase), ...categoryProblems(testCase), ...missingDiacriticProblems(testCase)];
}

/**
 * "correct" exactly when the normalised answer equals a normalised solution (match_pairs: no wrong match); only typed
 * answers can be almost correct or a Standard form (contract point 6), and Standard forms exist for Gheg answers only.
 */
function outcomeProblems({ exercise, answer, expected }) {
  const kind = answerKindOf(exercise);
  const problems = [];
  if (kind !== TYPED && expected.outcome !== 'correct' && expected.outcome !== 'wrong') {
    problems.push({ path: '/expected/outcome', message: `Answers from ${KIND_LABELS[kind]} are exact: correct or wrong, not ${expected.outcome}.` });
  }
  if (expected.outcome === 'correct_standard_form' && exercise.answerLang !== 'sq') {
    problems.push({ path: '/expected/outcome', message: 'Standard forms exist only for Gheg answers (answerLang "sq").' });
  }
  const equalsSolution =
    kind === PAIRS ? answer.wrongMatches.length === 0 : exercise.solutions.map(normalizeAnswer).includes(normalizeAnswer(answerText(kind, answer)));
  if (equalsSolution !== (expected.outcome === 'correct')) {
    problems.push({
      path: '/expected/outcome',
      message: equalsSolution ? 'The answer equals a solution after normalisation, so it must be correct.' : 'Only an answer that equals a solution after normalisation is correct.',
    });
  }
  return problems;
}


function categoryProblems({ expected }) {
  const { outcome, errorCategory } = expected;
  if (outcome === 'almost_correct' && !ALMOST_CORRECT_CATEGORIES.has(errorCategory)) {
    return [{ path: '/expected/errorCategory', message: `An almost correct answer is a spelling slip (${quoteAll([...ALMOST_CORRECT_CATEGORIES])}), not ${errorCategory}.` }];
  }
  if (outcome === 'wrong' && errorCategory === 'variant.standard_form') {
    return [{ path: '/expected/errorCategory', message: 'A Standard form is correct_standard_form, never wrong.' }];
  }
  return [];
}

/**
 * Contract point 4: a typed answer that only lacks diacritics of a solution is almost correct, spelling.nasal_vowel when
 * only circumflexes are missing, else spelling.diacritics (unless a Standard form matched first); and only such an
 * answer may expect those two categories.
 */
function missingDiacriticProblems({ exercise, answer, expected }) {
  if (answerKindOf(exercise) !== TYPED || expected.outcome === 'correct') return [];
  const written = normalizeAnswer(answer.text);
  const missing = exercise.solutions.map((solution) => missingDiacriticsOf(written, normalizeAnswer(solution))).find((letters) => letters?.length > 0);
  const expectsMissingDiacritics = expected.outcome === 'almost_correct' && DIACRITIC_CATEGORIES.has(expected.errorCategory);
  if (!missing) {
    return expectsMissingDiacritics
      ? [{ path: '/expected/errorCategory', message: `${expected.errorCategory} needs an answer that only lacks diacritics of a solution (an added or wrong diacritic is an edit).` }]
      : [];
  }
  if (expected.outcome === 'correct_standard_form') return [];
  const category = missing.every(isCircumflexVowel) ? 'spelling.nasal_vowel' : 'spelling.diacritics';
  return expectsMissingDiacritics && expected.errorCategory === category
    ? []
    : [{ path: '/expected', message: `The answer only lacks ${quoteAll(missing)} of a solution, so it is almost_correct with ${category}.` }];
}

function answerText(kind, answer) {
  if (kind === TYPED) return answer.text;
  if (kind === PICKED) return answer.choice;
  return answer.tokens.join(' ');
}

/** Entries of `used` that exceed their count in `available` (exact strings, as the UI sends the tiles). */
function notAvailable(used, available) {
  const remaining = new Map();
  for (const tile of available) remaining.set(tile, (remaining.get(tile) ?? 0) + 1);
  return used.filter((tile) => {
    const count = remaining.get(tile) ?? 0;
    remaining.set(tile, count - 1);
    return count <= 0;
  });
}

function quoteAll(values) {
  return values.map((value) => `"${value}"`).join(', ');
}
