import { describe, expect, it } from 'vitest';
import { insertAtSelection } from './insertText';

describe('insertAtSelection', () => {
  it('inserts at a collapsed cursor', () => {
    expect(insertAtSelection('asht', 1, 1, 'x')).toEqual({ value: 'axsht', caret: 2 });
  });

  it('replaces a selection', () => {
    expect(insertAtSelection('shtepi', 3, 4, 'ë')).toEqual({ value: 'shtëpi', caret: 4 });
  });

  it('handles a backwards selection', () => {
    expect(insertAtSelection('abc', 2, 1, 'X')).toEqual({ value: 'aXc', caret: 2 });
  });

  it('clamps positions beyond the text', () => {
    expect(insertAtSelection('ab', 9, 9, 'ç')).toEqual({ value: 'abç', caret: 3 });
  });
});
