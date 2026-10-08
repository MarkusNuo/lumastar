import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from './Toggle';

describe('Toggle', () => {
  it('switches with a tap', async () => {
    const onChange = vi.fn();
    render(<Toggle label="Ton" checked={false} onChange={onChange} />);

    await userEvent.click(screen.getByRole('switch', { name: 'Ton' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('ignores taps while busy but keeps the focus', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<Toggle label="Ton" checked onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Ton' });
    await userEvent.click(toggle);
    onChange.mockClear();

    rerender(<Toggle label="Ton" checked onChange={onChange} busy />);
    await userEvent.click(toggle);
    await userEvent.keyboard(' ');

    expect(onChange).not.toHaveBeenCalled();
    expect(toggle).toHaveFocus();
    expect(toggle).toBeEnabled();
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(toggle).toHaveAttribute('aria-busy', 'true');
  });
});
