import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it } from 'vitest';
import { SpecialCharBar } from './SpecialCharBar';

function AnswerHarness({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        aria-label="Antwort"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <SpecialCharBar inputRef={inputRef} onChange={setValue} />
    </>
  );
}

function setup(initialValue?: string) {
  const user = userEvent.setup();
  render(<AnswerHarness initialValue={initialValue} />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Antwort' });
  return { user, input };
}

describe('SpecialCharBar', () => {
  it('inserts the character at the cursor and places the cursor after it', async () => {
    const { user, input } = setup();
    await user.type(input, 'sht');
    input.setSelectionRange(0, 0);

    await user.click(screen.getByRole('button', { name: 'â einfügen' }));

    expect(input).toHaveValue('âsht');
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(1);
  });

  it('replaces the selected text', async () => {
    const { user, input } = setup('shtepi');
    await user.click(input);
    input.setSelectionRange(3, 4);

    await user.click(screen.getByRole('button', { name: 'ë einfügen' }));

    expect(input).toHaveValue('shtëpi');
    expect(input.selectionStart).toBe(4);
  });

  it('keeps the focus in the text field', async () => {
    const { user, input } = setup();
    await user.click(input);

    await user.click(screen.getByRole('button', { name: 'ç einfügen' }));

    expect(input).toHaveFocus();
  });

  it('inserts uppercase characters while shift is on and lowercase again after turning it off', async () => {
    const { user, input } = setup();
    const shift = screen.getByRole('button', { name: 'Grossbuchstaben' });
    expect(shift).toHaveAttribute('aria-pressed', 'false');

    await user.click(shift);
    expect(shift).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Ë einfügen' }));
    await user.click(screen.getByRole('button', { name: 'Ç einfügen' }));

    await user.click(shift);
    await user.click(screen.getByRole('button', { name: 'ë einfügen' }));

    expect(input).toHaveValue('ËÇë');
  });

  it('offers all Gheg special characters', () => {
    setup();
    for (const char of ['ë', 'ç', 'â', 'ê', 'î', 'ô', 'û']) {
      expect(screen.getByRole('button', { name: `${char} einfügen` })).toBeInTheDocument();
    }
  });
});
