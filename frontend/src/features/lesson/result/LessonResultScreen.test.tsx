import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { celebrate } from '../../../lib/celebrate';
import type { LessonResult } from '../model';
import { LessonResultScreen } from './LessonResultScreen';

vi.mock('../../../lib/celebrate', () => ({ celebrate: vi.fn() }));

const SAVED: LessonResult = {
  kind: 'lesson',
  xp: { earned: 20, breakdown: { base: 10, perfectBonus: 5, speedBonus: 5 }, total: 140 },
  accuracy: 1,
  correctCount: 12,
  exerciseCount: 12,
  durationMs: 134_500,
  learnedItems: [
    { id: 'item_miredita', gheg: 'mirëdita', de: 'guten Tag, hallo' },
    { id: 'item_faleminderit', gheg: 'faleminderit', de: 'danke' },
  ],
  saved: true,
};

function renderResult(result: LessonResult) {
  const handlers = { onContinue: vi.fn(), onRetrySave: vi.fn(), onStartFocus: vi.fn() };
  render(<LessonResultScreen result={result} retrying={false} {...handlers} />);
  return { user: userEvent.setup(), ...handlers };
}

describe('LessonResultScreen', () => {
  it('celebrates with XP, accuracy, time and the practised words', () => {
    renderResult(SAVED);

    expect(screen.getByRole('heading', { name: 'Fehlerfrei!' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Maskottchen feiert' })).toBeInTheDocument();
    expect(screen.getByText('20 XP verdient')).toBeInTheDocument();
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getByText('2:15')).toBeInTheDocument();
    expect(screen.getByText('mirëdita')).toHaveAttribute('lang', 'sq');
    expect(screen.getByText('danke')).toBeInTheDocument();
    expect(celebrate).toHaveBeenCalledOnce();
  });

  it('lists only the XP bonuses that were earned', () => {
    renderResult({
      ...SAVED,
      xp: { earned: 15, breakdown: { base: 10, perfectBonus: 0, speedBonus: 5 }, total: 135 },
      accuracy: 0.75,
      correctCount: 9,
    });

    expect(screen.getByRole('heading', { name: 'Lektion geschafft!' })).toBeInTheDocument();
    expect(screen.getByText('75 %')).toBeInTheDocument();
    expect(screen.getByText('Tempo')).toBeInTheDocument();
    expect(screen.queryByText('Fehlerfrei')).not.toBeInTheDocument();
  });

  it('continues to the path', async () => {
    const { user, onContinue } = renderResult(SAVED);

    await user.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('shows the first six practised words and the rest on request', async () => {
    const learnedItems = Array.from({ length: 9 }, (_, index) => ({
      id: `item_${index}`,
      gheg: `fjalë ${index + 1}`,
      de: `Wort ${index + 1}`,
    }));
    const { user } = renderResult({ ...SAVED, learnedItems });
    const words = () => screen.getAllByText(/^fjalë \d$/u).map((word) => word.textContent);

    expect(words()).toEqual(learnedItems.slice(0, 6).map((item) => item.gheg));
    const toggle = screen.getByRole('button', { name: 'Alle 9 anzeigen' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(words()).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Weniger anzeigen' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it.each([
    ['focus', 'Fokus-Lektion geschafft!'],
    ['review', 'Wiederholung geschafft!'],
  ] as const)('names a finished %s lesson', (kind, title) => {
    renderResult({ ...SAVED, kind, correctCount: 10 });

    expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  });

  it('suggests a focus lesson and starts it', async () => {
    const { user, onStartFocus } = renderResult({
      ...SAVED,
      focusSuggestion: {
        skillTag: 'grammar.definite_article',
        label: 'Bestimmter Artikel',
        unitId: 'focus_grammar.definite_article_1',
      },
    });

    const card = screen.getByRole('region', {
      name: 'Fokus-Lektion vorgeschlagen: Bestimmter Artikel',
    });
    await user.click(within(card).getByRole('button', { name: 'Fokus-Lektion starten' }));

    expect(onStartFocus).toHaveBeenCalledWith('focus_grammar.definite_article_1');
  });

  it('shows no focus card without a suggestion', () => {
    renderResult(SAVED);

    expect(screen.queryByRole('region', { name: /Fokus-Lektion/ })).not.toBeInTheDocument();
  });

  it('lists a short set of words without a toggle', () => {
    renderResult(SAVED);

    expect(screen.queryByRole('button', { name: /anzeigen/ })).not.toBeInTheDocument();
  });

  it('offers to save again when the result could not be saved', async () => {
    const { user, onRetrySave } = renderResult({
      kind: 'lesson',
      accuracy: 0.5,
      correctCount: 6,
      exerciseCount: 12,
      durationMs: 60_000,
      learnedItems: [],
      saved: false,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('noch nicht gespeichert');
    expect(screen.getByText('XP noch offen')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nochmals speichern' }));

    expect(onRetrySave).toHaveBeenCalledOnce();
  });
});
