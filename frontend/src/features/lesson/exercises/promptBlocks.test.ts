import { describe, expect, it } from 'vitest';
import { promptBlocks } from './promptBlocks';

describe('promptBlocks', () => {
  it('keeps a one-paragraph prompt in its language', () => {
    expect(promptBlocks('Si je?', 'sq')).toEqual([{ text: 'Si je?', lang: 'sq' }]);
  });

  it('separates the Gheg reading text from the German question', () => {
    const text =
      '– A e njeh Blerimin?\n– Po, e njoh. E takova dje në kafe.\n\nFrage: Was sagt die zweite Person?';

    expect(promptBlocks(text, 'sq')).toEqual([
      { text: '– A e njeh Blerimin?\n– Po, e njoh. E takova dje në kafe.', lang: 'sq' },
      { text: 'Frage: Was sagt die zweite Person?', lang: 'de' },
    ]);
  });

  it('leaves UI titles without a language', () => {
    expect(promptBlocks('Fülle die Lücke')).toEqual([{ text: 'Fülle die Lücke' }]);
  });

  it('ignores blank lines around and between paragraphs', () => {
    expect(promptBlocks('\nUnë jam Drita.\n \n\nFrage: Wer ist das?\n', 'sq')).toEqual([
      { text: 'Unë jam Drita.', lang: 'sq' },
      { text: 'Frage: Wer ist das?', lang: 'de' },
    ]);
  });
});
