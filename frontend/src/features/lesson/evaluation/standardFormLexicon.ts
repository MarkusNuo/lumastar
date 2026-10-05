import type { StandardForms } from '../../../api/types';
import { foldDiacritics } from './normalize';

/*
 * The Standard-form lexicon of content/gheg_blocklist.json as GET /api/content/standard-forms serves
 * it (docs/CONTENT_FORMAT.md point 8), applied exactly like the backend's StandardFormLexicon: it
 * recognises a learner's word as the Standard counterpart of a Gheg solution word, e.g. "është" for
 * "âsht" (listed word), "punuar" for "punue" or "shtëpia" for "shpija" (word patterns).
 */

type Replacement = StandardForms['patterns'][number]['gheg'][number];

export interface StandardFormLexicon {
  /**
   * Whether `answerWord` is the Standard form of `ghegWord`. Both are normalised words; with
   * `folded` both are folded too, so a Standard form without its diacritics is recognised as well.
   */
  isStandardFormOf(answerWord: string, ghegWord: string, folded: boolean): boolean;
}

const VOWELS = 'aeëiouyâêîôû';
// Gheg inserts a glide between a stem ending in -i and a vowel ending: shpi + a → shpija.
const GLIDE = 'j';

interface CompiledPattern {
  regex: RegExp;
  gheg: Replacement[];
  exceptions: Set<string>;
}

interface Forms {
  ghegByStandard: Map<string, Set<string>>;
  patterns: CompiledPattern[];
}

export function createStandardFormLexicon(forms: StandardForms): StandardFormLexicon {
  const exact = compile(forms, (text) => text);
  const folded = compile(forms, foldDiacritics);
  return {
    isStandardFormOf: (answerWord, ghegWord, foldedWords) =>
      links(foldedWords ? folded : exact, answerWord, ghegWord),
  };
}

/** Knows no Standard forms; the backend's verdict still recognises them. */
export const EMPTY_LEXICON: StandardFormLexicon = createStandardFormLexicon({
  words: [],
  patterns: [],
});

function compile(forms: StandardForms, form: (text: string) => string): Forms {
  const ghegByStandard = new Map<string, Set<string>>();
  for (const word of forms.words) {
    const standard = form(word.standard);
    const gheg = ghegByStandard.get(standard) ?? new Set<string>();
    for (const alternative of word.gheg) gheg.add(form(alternative));
    ghegByStandard.set(standard, gheg);
  }
  const patterns = forms.patterns.map((pattern) => ({
    regex: new RegExp(form(pattern.pattern), 'u'),
    gheg: pattern.gheg.map((replacement) => ({ ...replacement, value: form(replacement.value) })),
    exceptions: new Set(pattern.exceptions.map(form)),
  }));
  return { ghegByStandard, patterns };
}

function links(forms: Forms, answerWord: string, ghegWord: string): boolean {
  return (
    forms.ghegByStandard.get(answerWord)?.has(ghegWord) === true ||
    forms.patterns.some((pattern) => patternLinks(pattern, answerWord, ghegWord))
  );
}

function patternLinks(pattern: CompiledPattern, answerWord: string, ghegWord: string): boolean {
  if (pattern.exceptions.has(answerWord)) return false;
  const match = pattern.regex.exec(answerWord);
  if (!match) return false;
  const start = match.index;
  const end = start + match[0].length;
  return pattern.gheg.some((replacement) =>
    replacementLinks(replacement, answerWord, start, end, ghegWord),
  );
}

/** Whether replacing the matched part [start, end) of the Standard word yields the Gheg word. */
function replacementLinks(
  { kind, value }: Replacement,
  standardWord: string,
  start: number,
  end: number,
  ghegWord: string,
): boolean {
  switch (kind) {
    // The Gheg word may carry its own inflection after the replaced ending (punuem, punuemi).
    case 'suffix':
      return ghegWord.startsWith(standardWord.slice(0, start) + value);
    case 'prefix': {
      const ending = standardWord.slice(end);
      return (
        ghegWord === value + ending ||
        (ending !== '' && VOWELS.includes(ending.charAt(0)) && ghegWord === value + GLIDE + ending)
      );
    }
    case 'word':
      return ghegWord === value;
  }
}
