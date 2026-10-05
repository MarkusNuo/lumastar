import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SAMPLE_MATCH_PAIRS } from '../sampleExercises';
import { MatchPairs } from './MatchPairs';

/** The tile's name gets the state appended while it flashes (e.g. "danke, falsch"). */
const named = (word: string) => (name: string) => name === word || name.startsWith(`${word},`);

function renderPairs() {
  const onSubmit = vi.fn();
  render(
    <MatchPairs
      exercise={SAMPLE_MATCH_PAIRS}
      retry={false}
      verdict={undefined}
      onAnswerChange={vi.fn()}
      onSubmit={onSubmit}
    />,
  );
  const gheg = (word: string) =>
    within(screen.getByRole('group', { name: 'Gheg' })).getByRole('button', { name: named(word) });
  const german = (word: string) =>
    within(screen.getByRole('group', { name: 'Deutsch' })).getByRole('button', {
      name: named(word),
    });
  return { onSubmit, gheg, german };
}

describe('MatchPairs', () => {
  it('shows every Gheg word on the left and every German meaning on the right', () => {
    const { gheg, german } = renderPairs();

    for (const pair of SAMPLE_MATCH_PAIRS.pairs) {
      expect(gheg(pair.left)).toHaveAttribute('lang', 'sq');
      expect(german(pair.right)).toHaveAttribute('lang', 'de');
    }
  });

  it('selects a tile and locks a correct pair', async () => {
    const user = userEvent.setup();
    const { gheg, german } = renderPairs();

    await user.click(gheg('mirëdita'));
    expect(gheg('mirëdita')).toHaveAttribute('aria-pressed', 'true');

    await user.click(german('guten Tag'));

    await waitFor(() => expect(gheg('mirëdita')).toBeDisabled());
    expect(german('guten Tag')).toBeDisabled();
  });

  it('keeps a wrong pair open', async () => {
    const user = userEvent.setup();
    const { gheg, german } = renderPairs();

    await user.click(gheg('mirëdita'));
    await user.click(german('danke'));

    expect(gheg('mirëdita')).toBeEnabled();
    expect(gheg('mirëdita')).toHaveAttribute('aria-pressed', 'false');
  });

  it('finishes by itself with the wrong matches as shown once all pairs are matched', async () => {
    const user = userEvent.setup();
    const { gheg, german, onSubmit } = renderPairs();

    await user.click(gheg('ju lutem'));
    await user.click(german('gute Nacht'));
    for (const pair of SAMPLE_MATCH_PAIRS.pairs) {
      await user.click(german(pair.right));
      await user.click(gheg(pair.left));
    }

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        kind: 'pairs',
        wrongMatches: [{ left: 'ju lutem', right: 'gute Nacht' }],
      }),
    );
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
