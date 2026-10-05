import { describe, expect, it } from 'vitest';
import type { Answer, LessonExercise, TranslateFreeExercise } from '../model';
import {
  SAMPLE_FILL_GAP_CHOICES,
  SAMPLE_FILL_GAP_NASAL,
  SAMPLE_FILL_GAP_TYPED,
  SAMPLE_MATCH_PAIRS,
  SAMPLE_MULTIPLE_CHOICE,
  SAMPLE_TRANSLATE_FREE,
  SAMPLE_TRANSLATE_FREE_NASAL,
  SAMPLE_WORD_ORDER,
  SAMPLE_WORDBANK,
} from '../sampleExercises';
import { precheck } from './precheck';
import { EMPTY_LEXICON } from './standardFormLexicon';

/* Hint texts and solutions shown; content/fixtures/evaluator-cases.json covers the outcomes. */

const check = (exercise: LessonExercise, answer: Answer) =>
  precheck(exercise, answer, EMPTY_LEXICON);

const text = (value: string): Answer => ({ kind: 'text', text: value });
const choice = (value: string): Answer => ({ kind: 'choice', choice: value });
const tokens = (...values: string[]): Answer => ({ kind: 'tokens', tokens: values });

const LONG_SENTENCE: TranslateFreeExercise = {
  id: 'ex_long_001',
  reviewed: false,
  skillTags: ['phrase.politeness'],
  errorHints: [],
  type: 'translate_free',
  prompt: { lang: 'de', text: 'Vielen Dank, bis morgen!' },
  answerLang: 'sq',
  solutions: ['Faleminderit shumë, shihemi nesër!'],
  standardForms: [],
  explanation: '„Shihemi“ heisst „wir sehen uns“.',
};

describe('precheck of typed answers', () => {
  it('accepts the exact solution and reports it', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('Nji kafe, ju lutem.'));

    expect(verdict).toMatchObject({
      outcome: 'correct',
      countsAsCorrect: true,
      solution: 'Nji kafe, ju lutem.',
      source: 'precheck',
      explanation: SAMPLE_TRANSLATE_FREE.explanation,
    });
    expect(verdict.hint).toBeUndefined();
  });

  it('ignores case, punctuation and extra whitespace', () => {
    expect(check(SAMPLE_TRANSLATE_FREE, text('  nji KAFE ju lutem ')).outcome).toBe('correct');
    expect(check(SAMPLE_TRANSLATE_FREE, text('Nji kafe – ju lutem!!')).outcome).toBe('correct');
  });

  it('accepts every listed solution and answers with the one that matched', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('të lutem nji kafe'));

    expect(verdict).toMatchObject({ outcome: 'correct', solution: 'Të lutem, nji kafe.' });
  });

  it('removes apostrophes', () => {
    const exercise: TranslateFreeExercise = {
      ...SAMPLE_TRANSLATE_FREE,
      solutions: ["S'ka përse."],
      standardForms: [],
    };

    expect(check(exercise, text('ska përse')).outcome).toBe('correct');
    expect(check(exercise, text('s’ka përse')).outcome).toBe('correct');
  });

  it('reads punctuation between words as a space: "Jo,faleminderit"', () => {
    const exercise: TranslateFreeExercise = {
      ...SAMPLE_TRANSLATE_FREE,
      solutions: ['Jo, faleminderit.'],
      standardForms: [],
    };

    expect(check(exercise, text('Jo,faleminderit')).outcome).toBe('correct');
    expect(check(exercise, text('Jofaleminderit')).outcome).toBe('almost_correct');
  });

  it('counts a missing circumflex as almost correct: "asht" for "âsht"', () => {
    const verdict = check(SAMPLE_FILL_GAP_NASAL, text('asht'));

    expect(verdict).toMatchObject({
      outcome: 'almost_correct',
      countsAsCorrect: true,
      solution: 'âsht',
      hint: 'Achte auf den Zirkumflex: **âsht**',
    });
  });

  it('counts a missing ç as almost correct and names the word: "c" for "ç"', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE_NASAL, text('Cka po bân?'));

    expect(verdict).toMatchObject({
      outcome: 'almost_correct',
      solution: 'Çka po bân?',
      hint: 'Achte auf die Sonderzeichen: **Çka**',
    });
  });

  it('names every word with missing diacritics', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE_NASAL, text('cka po ban'));

    expect(verdict.hint).toBe('Achte auf die Sonderzeichen: **Çka**, **bân**');
  });

  it('never counts an added diacritic as almost correct: "jâm" for "jam"', () => {
    const verdict = check(SAMPLE_FILL_GAP_TYPED, text('jâm'));

    expect(verdict).toMatchObject({ outcome: 'wrong', solution: 'jam' });
  });

  it('counts a wrong diacritic as a typo, not as a missing one', () => {
    const exercise: TranslateFreeExercise = {
      ...SAMPLE_TRANSLATE_FREE,
      solutions: ['mirëdita'],
      standardForms: [],
    };

    expect(check(exercise, text('mirêdita'))).toMatchObject({
      outcome: 'almost_correct',
      hint: 'Achte auf die Schreibweise: **mirëdita**',
    });
    expect(check(exercise, text('mirêditê')).outcome).toBe('wrong');
  });

  it('recognises a listed Standard form: "është" for "âsht"', () => {
    const verdict = check(SAMPLE_FILL_GAP_NASAL, text('është'));

    expect(verdict).toMatchObject({
      outcome: 'correct_standard_form',
      countsAsCorrect: true,
      solution: 'âsht',
      hint: 'Auf Gheg sagt man eher **âsht** statt **është**.',
    });
  });

  it('recognises a Standard form in a sentence and suggests the closest Gheg solution', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('Ju lutem, një kafe'));

    expect(verdict).toMatchObject({
      outcome: 'correct_standard_form',
      solution: 'Ju lutem, nji kafe.',
      hint: 'Auf Gheg sagt man eher **nji** statt **një**.',
    });
  });

  it('recognises a Standard form typed without diacritics', () => {
    expect(check(SAMPLE_FILL_GAP_NASAL, text('eshte')).outcome).toBe('correct_standard_form');
    expect(check(SAMPLE_TRANSLATE_FREE, text('nje kafe ju lutem')).outcome).toBe(
      'correct_standard_form',
    );
  });

  it('keeps a Gheg answer without diacritics apart from the listed Standard forms', () => {
    expect(check(SAMPLE_TRANSLATE_FREE_NASAL, text('Cka po ban')).outcome).toBe('almost_correct');
  });

  it('forgives one typo from six letters on', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('Nji kafe, ju lutm.'));

    expect(verdict).toMatchObject({
      outcome: 'almost_correct',
      solution: 'Nji kafe, ju lutem.',
      hint: 'Achte auf die Schreibweise: **lutem**',
    });
  });

  it('forgives a swap of two adjacent letters as one typo', () => {
    expect(check(SAMPLE_TRANSLATE_FREE, text('Nji kaef, ju lutem')).outcome).toBe('almost_correct');
  });

  it('rejects two typos below sixteen letters', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('Nji kaf, ju lutm'));

    expect(verdict).toMatchObject({
      outcome: 'wrong',
      countsAsCorrect: false,
      solution: 'Nji kafe, ju lutem.',
    });
  });

  it('forgives two typos from sixteen letters on, but not three', () => {
    expect(check(LONG_SENTENCE, text('Falemindrit shumë, shihem nesër')).outcome).toBe(
      'almost_correct',
    );
    expect(check(LONG_SENTENCE, text('Falemindrit shum, shihem nesër')).outcome).toBe('wrong');
  });

  it('forgives no typo in words shorter than six letters', () => {
    expect(check(SAMPLE_FILL_GAP_TYPED, text('jan')).outcome).toBe('wrong');
  });

  it('counts the typo after folding the diacritics', () => {
    expect(check(SAMPLE_TRANSLATE_FREE_NASAL, text('Cka po bn')).outcome).toBe('almost_correct');
  });

  it('marks a wrong word as wrong and shows the closest solution', () => {
    const verdict = check(SAMPLE_TRANSLATE_FREE, text('Nji caj, ju lutem'));

    expect(verdict).toMatchObject({ outcome: 'wrong', solution: 'Nji kafe, ju lutem.' });
    expect(verdict.hint).toBeUndefined();
  });

  it('marks an empty answer as wrong', () => {
    expect(check(SAMPLE_TRANSLATE_FREE, text('  ?! ')).outcome).toBe('wrong');
  });
});

describe('precheck of word chips', () => {
  it('joins the chips into the sentence they form', () => {
    const verdict = check(SAMPLE_WORDBANK, tokens('Mirëdita', 'Si', 'je'));

    expect(verdict).toMatchObject({ outcome: 'correct', solution: 'Mirëdita! Si je?' });
  });

  it('marks a distractor as wrong, even when it is one letter away', () => {
    expect(check(SAMPLE_WORDBANK, tokens('Mirëdita', 'Si', 'jeni')).outcome).toBe('wrong');
    expect(check(SAMPLE_WORD_ORDER, tokens('Mirë', 'se', 'vjen', 'në', 'Prishtina'))).toMatchObject(
      { outcome: 'wrong', solution: 'Mirë se vjen në Prishtinë!' },
    );
  });

  it('never tolerates missing diacritics in chips', () => {
    expect(check(SAMPLE_WORDBANK, tokens('Miredita', 'Si', 'je')).outcome).toBe('wrong');
  });

  it('marks reordered word-bank chips as a word-order mistake and shows that solution', () => {
    expect(check(SAMPLE_WORDBANK, tokens('Mirëdita', 'je', 'Qysh'))).toMatchObject({
      outcome: 'wrong',
      solution: 'Mirëdita! Qysh je?',
      hint: 'Die Wörter stimmen, aber die Reihenfolge noch nicht.',
    });
  });

  it('marks the right words in the wrong order as wrong with a word-order hint', () => {
    const verdict = check(SAMPLE_WORD_ORDER, tokens('se', 'Mirë', 'vjen', 'në', 'Prishtinë'));

    expect(verdict).toMatchObject({
      outcome: 'wrong',
      solution: 'Mirë se vjen në Prishtinë!',
      hint: 'Die Wörter stimmen, aber die Reihenfolge noch nicht.',
    });
  });

  it('accepts the correct order', () => {
    expect(check(SAMPLE_WORD_ORDER, tokens('Mirë', 'se', 'vjen', 'në', 'Prishtinë')).outcome).toBe(
      'correct',
    );
  });
});

describe('precheck of picked options', () => {
  it('accepts the solution among the choices', () => {
    expect(check(SAMPLE_MULTIPLE_CHOICE, choice('mirëdita'))).toMatchObject({
      outcome: 'correct',
      solution: 'mirëdita',
    });
  });

  it('rejects another option and shows the solution', () => {
    expect(check(SAMPLE_MULTIPLE_CHOICE, choice('natën e mirë'))).toMatchObject({
      outcome: 'wrong',
      countsAsCorrect: false,
      solution: 'mirëdita',
    });
  });

  it('never tolerates diacritics in a picked option', () => {
    expect(check(SAMPLE_MULTIPLE_CHOICE, choice('miredita')).outcome).toBe('wrong');
  });

  it('checks gap chips like options', () => {
    expect(check(SAMPLE_FILL_GAP_CHOICES, choice('po')).outcome).toBe('correct');
    expect(check(SAMPLE_FILL_GAP_CHOICES, choice('jo')).outcome).toBe('wrong');
  });

  it('checks a gap without chips as typed text', () => {
    expect(check(SAMPLE_FILL_GAP_TYPED, text('Jam')).outcome).toBe('correct');
  });
});

describe('precheck of matched pairs', () => {
  const pairs = (...wrongMatches: { left: string; right: string }[]): Answer => ({
    kind: 'pairs',
    wrongMatches,
  });

  it('is correct without a wrong match', () => {
    const verdict = check(SAMPLE_MATCH_PAIRS, pairs());

    expect(verdict).toMatchObject({ outcome: 'correct', countsAsCorrect: true });
    expect(verdict.solution).toBeUndefined();
    expect(verdict.errorCategory).toBeUndefined();
  });

  it('is wrong after any wrong match and names the correct pairs of the confused items', () => {
    const [first, second] = SAMPLE_MATCH_PAIRS.pairs;
    if (!first || !second) throw new Error('The sample needs two pairs');

    expect(
      check(SAMPLE_MATCH_PAIRS, pairs({ left: first.left, right: second.right })),
    ).toMatchObject({
      outcome: 'wrong',
      errorCategory: 'vocab.confused',
      countsAsCorrect: false,
      hint: `Richtig ist: **${first.left}** = ${first.right} und **${second.left}** = ${second.right}.`,
    });
  });
});

it('rejects an answer that does not fit the exercise type', () => {
  expect(() => check(SAMPLE_MULTIPLE_CHOICE, text('mirëdita'))).toThrow(/choice/);
});
