import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Verdict } from '../model';
import { SAMPLE_WORD_ORDER, SAMPLE_WORDBANK } from '../sampleExercises';
import { TranslateWordbank } from './TranslateWordbank';
import { WordOrder } from './WordOrder';

function renderWordBank(verdict?: Verdict) {
  const onAnswerChange = vi.fn();
  const view = render(
    <TranslateWordbank
      exercise={SAMPLE_WORDBANK}
      retry={false}
      verdict={verdict}
      onAnswerChange={onAnswerChange}
      onSubmit={vi.fn()}
    />,
  );
  const answerLine = () => screen.getByRole('group', { name: 'Deine Antwort' });
  const bank = () => screen.getByRole('group', { name: 'Wortbausteine' });
  return { ...view, onAnswerChange, answerLine, bank };
}

const tile = (container: HTMLElement, word: string) =>
  within(container).getByRole('button', { name: word });

describe('TranslateWordbank', () => {
  it('shows the prompt and every word of the bank', () => {
    const { bank } = renderWordBank();

    expect(screen.getByText('Guten Tag! Wie geht es dir?')).toBeInTheDocument();
    expect(within(bank()).getAllByRole('button')).toHaveLength(SAMPLE_WORDBANK.wordBank.length);
  });

  it('moves a tapped word into the answer line and reports the answer', async () => {
    const user = userEvent.setup();
    const { answerLine, bank, onAnswerChange } = renderWordBank();

    await user.click(tile(bank(), 'Mirëdita'));
    await user.click(tile(bank(), 'Si'));

    expect(
      within(answerLine())
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Mirëdita', 'Si']);
    expect(within(bank()).queryByRole('button', { name: 'Mirëdita' })).not.toBeInTheDocument();
    expect(onAnswerChange).toHaveBeenLastCalledWith({ kind: 'tokens', tokens: ['Mirëdita', 'Si'] });
  });

  it('sends a tapped word from the answer line back to the bank', async () => {
    const user = userEvent.setup();
    const { answerLine, bank, onAnswerChange } = renderWordBank();

    await user.click(tile(bank(), 'Mirëdita'));
    await user.click(tile(bank(), 'Si'));
    await user.click(tile(bank(), 'je'));
    await user.click(tile(answerLine(), 'Si'));

    expect(onAnswerChange).toHaveBeenLastCalledWith({
      kind: 'tokens',
      tokens: ['Mirëdita', 'je'],
    });
    expect(tile(bank(), 'Si')).toBeEnabled();
  });

  it('has no answer again once the answer line is empty', async () => {
    const user = userEvent.setup();
    const { answerLine, bank, onAnswerChange } = renderWordBank();

    await user.click(tile(bank(), 'jam'));
    await user.click(tile(answerLine(), 'jam'));

    expect(onAnswerChange).toHaveBeenLastCalledWith(null);
  });

  it('is read-only after checking and marks the answer', async () => {
    const user = userEvent.setup();
    const verdict: Verdict = {
      outcome: 'wrong',
      countsAsCorrect: false,
      explanation: SAMPLE_WORDBANK.explanation,
      source: 'precheck',
    };
    const { bank, onAnswerChange } = renderWordBank(verdict);

    await user.click(tile(bank(), 'Mirëdita'));

    expect(onAnswerChange).not.toHaveBeenCalled();
    expect(tile(bank(), 'Mirëdita')).toBeDisabled();
  });
});

describe('WordOrder', () => {
  it('offers exactly the words of the sentence and never starts in a solved order', () => {
    render(
      <WordOrder
        exercise={SAMPLE_WORD_ORDER}
        retry={false}
        verdict={undefined}
        onAnswerChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const words = within(screen.getByRole('group', { name: 'Wortbausteine' }))
      .getAllByRole('button')
      .map((button) => button.textContent);
    expect([...words].sort()).toEqual([...SAMPLE_WORD_ORDER.tokens].sort());
    expect(words.join(' ')).not.toBe(SAMPLE_WORD_ORDER.tokens.join(' '));
  });
});
