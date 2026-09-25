import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseEmphasis } from './emphasis';
import { EmphasisText } from './EmphasisText';

describe('parseEmphasis', () => {
  it('splits bold words from the plain text', () => {
    expect(parseEmphasis('Achte auf **Çka**, **bân**!')).toEqual([
      { text: 'Achte auf ', strong: false },
      { text: 'Çka', strong: true },
      { text: ', ', strong: false },
      { text: 'bân', strong: true },
      { text: '!', strong: false },
    ]);
  });

  it('keeps text without markup and unmatched asterisks as they are', () => {
    expect(parseEmphasis('Gut gemacht')).toEqual([{ text: 'Gut gemacht', strong: false }]);
    expect(parseEmphasis('5 ** 2')).toEqual([{ text: '5 ** 2', strong: false }]);
    expect(parseEmphasis('')).toEqual([]);
  });
});

describe('EmphasisText', () => {
  it('renders bold words as strong text and never as HTML', () => {
    render(<EmphasisText text="**<b>âsht</b>** und mehr" />);

    expect(screen.getByText('<b>âsht</b>').tagName).toBe('STRONG');
    expect(document.querySelector('b')).toBeNull();
  });
});
