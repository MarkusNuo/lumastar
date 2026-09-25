import { describe, expect, it } from 'vitest';
import { editDistance } from './editDistance';
import { foldDiacritics, normalizeAnswer, wordsOf, writtenWordsOf } from './normalize';

describe('normalizeAnswer', () => {
  it.each([
    ['Mirëdita! Si je?', 'mirëdita si je'],
    ['  Nji   kafe,\tju lutem. ', 'nji kafe ju lutem'],
    ["S'ka përse.", 'ska përse'],
    ['ç’kemi?', 'çkemi'],
    ['„Âsht“ – «mirë»', 'âsht mirë'],
    ['Numri 42!', 'numri 42'],
    ['ÇKA PO BÂN?', 'çka po bân'],
    ['', ''],
    ['?!', ''],
  ])('normalises %j to %j', (text, expected) => {
    expect(normalizeAnswer(text)).toBe(expected);
  });

  it('composes decomposed characters (NFC) before comparing', () => {
    const decomposed = 'natën e mirë';

    expect(normalizeAnswer(decomposed)).toBe('natën e mirë');
  });
});

describe('foldDiacritics', () => {
  it('replaces the Gheg special characters by their base letter', () => {
    expect(foldDiacritics('ë ç â ê î ô û')).toBe('e c a e i o u');
    expect(foldDiacritics('çka po bân')).toBe('cka po ban');
  });

  it('keeps every other character and the length', () => {
    const text = 'shpija âsht e madhe';

    expect(foldDiacritics(text)).toHaveLength(text.length);
    expect(foldDiacritics('äöü')).toBe('äöü');
  });
});

describe('words', () => {
  it('splits a normalised text into words', () => {
    expect(wordsOf('mirë jam faleminderit')).toEqual(['mirë', 'jam', 'faleminderit']);
    expect(wordsOf('')).toEqual([]);
  });

  it('keeps the written form without edge punctuation', () => {
    expect(writtenWordsOf('Çka po bân?')).toEqual(['Çka', 'po', 'bân']);
    expect(writtenWordsOf("Mirë, s'ka përse!")).toEqual(['Mirë', "s'ka", 'përse']);
    expect(writtenWordsOf('Mirë – po ti?')).toEqual(['Mirë', 'po', 'ti']);
  });
});

describe('editDistance', () => {
  it.each([
    ['', '', 0],
    ['abc', '', 3],
    ['', 'abc', 3],
    ['kafe', 'kafe', 0],
    ['kafe', 'kafr', 1],
    ['kafe', 'kfe', 1],
    ['kafe', 'kaffe', 1],
    ['kafe', 'akfe', 1],
    ['kitten', 'sitting', 3],
    ['ca', 'abc', 3],
  ])('between %j and %j is %i', (a, b, expected) => {
    expect(editDistance(a, b)).toBe(expected);
  });
});
