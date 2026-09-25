/*
 * Answer helpers following "Answer normalisation and tokenisation" of docs/CONTENT_FORMAT.md, so a test
 * can derive the chips to tap and the text to type from the solutions of the lesson response.
 */

/** The Gheg letters of the special-character bar (PRD F5), lower case. */
export const GHEG_SPECIAL_CHARS = ['ë', 'ç', 'â', 'ê', 'î', 'ô', 'û'] as const;

const FOLDED: Readonly<Record<string, string>> = {
  ë: 'e',
  ç: 'c',
  â: 'a',
  ê: 'e',
  î: 'i',
  ô: 'o',
  û: 'u',
};

/** NFC, lower case, only letters, digits and single spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function isSpecialChar(char: string): boolean {
  return (GHEG_SPECIAL_CHARS as readonly string[]).includes(char.toLocaleLowerCase('sq'));
}

/** "Çka po bân?" → "Cka po ban?": what a learner types without the special-character bar. */
export function withoutDiacritics(text: string): string {
  return [...text.normalize('NFC')]
    .map((char) => {
      const lower = char.toLocaleLowerCase('sq');
      const base = FOLDED[lower];
      if (base === undefined) return char;
      return char === lower ? base : base.toLocaleUpperCase('sq');
    })
    .join('');
}

/**
 * The word-bank chips that spell `solution`, in answer order, each chip used at most once; undefined
 * when the bank lacks a word of it.
 */
export function chipsFor(solution: string, bank: readonly string[]): string[] | undefined {
  const free = bank.map((chip, index) => ({ index, key: normalizeAnswer(chip) }));
  const chips: string[] = [];
  for (const word of solution.split(/\s+/u).map(normalizeAnswer).filter(Boolean)) {
    const found = free.findIndex((chip) => chip.key === word);
    const chip = free[found];
    if (!chip) return undefined;
    chips.push(bank[chip.index] ?? '');
    free.splice(found, 1);
  }
  return chips;
}

/** The first solution that can be built from the bank, as chips. */
export function firstBuildableChips(solutions: readonly string[], bank: readonly string[]): string[] {
  for (const solution of solutions) {
    const chips = chipsFor(solution, bank);
    if (chips) return chips;
  }
  throw new Error(`No solution of ${JSON.stringify(solutions)} can be built from ${JSON.stringify(bank)}`);
}
