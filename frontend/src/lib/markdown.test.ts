import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('reads the learner summary: a heading and a nested bullet list', () => {
    const source = [
      '# Lernstand Mira – 25.09.2026 (Gheg, Kosovo)',
      '- Niveau: A1 (Ziel C2), 2 Tage Streak, 12 Wörter',
      '- Letzte typische Fehler:',
      '  - „asht“ → „âsht“ (Zirkumflex fehlt)',
      '  - „është“ → „âsht“ (Standardform)',
      '',
    ].join('\n');

    expect(parseMarkdown(source)).toEqual([
      { type: 'heading', level: 1, text: 'Lernstand Mira – 25.09.2026 (Gheg, Kosovo)' },
      {
        type: 'list',
        items: [
          { text: 'Niveau: A1 (Ziel C2), 2 Tage Streak, 12 Wörter', children: [] },
          {
            text: 'Letzte typische Fehler:',
            children: [
              { text: '„asht“ → „âsht“ (Zirkumflex fehlt)', children: [] },
              { text: '„është“ → „âsht“ (Standardform)', children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it('joins consecutive lines into one paragraph and splits paragraphs at blank lines', () => {
    expect(parseMarkdown('Erste Zeile\nzweite Zeile\n\nNeuer Absatz\r\n')).toEqual([
      { type: 'paragraph', text: 'Erste Zeile zweite Zeile' },
      { type: 'paragraph', text: 'Neuer Absatz' },
    ]);
  });

  it('knows heading levels and drops closing hashes', () => {
    expect(parseMarkdown('## Stärken ##\n### Details')).toEqual([
      { type: 'heading', level: 2, text: 'Stärken' },
      { type: 'heading', level: 3, text: 'Details' },
    ]);
  });

  it('attaches an indented item without a parent to the top level', () => {
    expect(parseMarkdown('    - verirrt')).toEqual([
      { type: 'list', items: [{ text: 'verirrt', children: [] }] },
    ]);
  });

  it('continues the last item with a wrapped line', () => {
    expect(parseMarkdown('- Häufige Fehler:\n  Zirkumflex (3×)')).toEqual([
      { type: 'list', items: [{ text: 'Häufige Fehler: Zirkumflex (3×)', children: [] }] },
    ]);
  });

  it('keeps HTML as plain text', () => {
    expect(parseMarkdown('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'paragraph', text: '<img src=x onerror=alert(1)>' },
    ]);
  });
});
