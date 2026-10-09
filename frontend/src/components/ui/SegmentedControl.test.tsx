import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl, type SegmentedControlProps } from './SegmentedControl';

vi.mock('../../lib/effects/playCue', () => ({ playCue: vi.fn() }));

const GOALS = [20, 30, 50].map((days) => ({ value: days, label: `${days} Tage` }));

function renderControl(props: Partial<SegmentedControlProps<number>> = {}) {
  const onChange = vi.fn();
  render(
    <>
      <p id="label">Nächstes Ziel</p>
      <SegmentedControl
        aria-labelledby="label"
        options={GOALS}
        value={undefined}
        onChange={onChange}
        {...props}
      />
    </>,
  );
  return { onChange, user: userEvent.setup() };
}

const chip = (days: number) => screen.getByRole('radio', { name: `${days} Tage` });

describe('SegmentedControl', () => {
  it('chooses with the arrow keys, as radio buttons do', async () => {
    const { onChange, user } = renderControl({ value: 20 });

    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(onChange.mock.calls).toEqual([[30], [50]]);
  });

  describe('with manual activation', () => {
    it('only moves the focus with the arrow keys, round the chips', async () => {
      const { onChange, user } = renderControl({ activation: 'manual' });

      await user.tab();
      expect(chip(20)).toHaveFocus();
      await user.keyboard('{ArrowRight}{ArrowDown}');
      expect(chip(50)).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      expect(chip(20)).toHaveFocus();
      await user.keyboard('{ArrowLeft}{ArrowUp}');

      expect(chip(30)).toHaveFocus();
      expect(onChange).not.toHaveBeenCalled();
      for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    });

    it('chooses the focused chip with Enter or Space, and on a tap', async () => {
      const { onChange, user } = renderControl({ activation: 'manual' });

      await user.tab();
      await user.keyboard('{ArrowRight}{Enter}');
      await user.keyboard('{ArrowRight} ');
      await user.click(chip(20));

      expect(onChange.mock.calls).toEqual([[30], [50], [20]]);
    });

    it('does not choose the chosen chip again', async () => {
      const { onChange, user } = renderControl({ activation: 'manual', value: 30 });

      await user.tab();
      expect(chip(30)).toHaveFocus();
      await user.keyboard('{Enter}');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('ignores Enter while a choice is being saved', async () => {
      const { onChange, user } = renderControl({ activation: 'manual', busy: true });

      await user.tab();
      await user.keyboard('{Enter}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('takes the focus on the chosen chip when asked to', () => {
    renderControl({ value: 50, focusOnMount: true });

    expect(chip(50)).toHaveFocus();
  });

  it('takes the focus on the first chip when none is chosen', () => {
    renderControl({ focusOnMount: true });

    expect(chip(20)).toHaveFocus();
  });
});
