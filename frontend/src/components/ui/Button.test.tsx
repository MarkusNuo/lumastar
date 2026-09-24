import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { BUTTON_VARIANTS } from './buttonStyles';

describe('Button', () => {
  it.each(BUTTON_VARIANTS)('renders the %s variant', (variant) => {
    render(<Button variant={variant}>Weiter</Button>);

    const button = screen.getByRole('button', { name: 'Weiter' });
    expect(button).toHaveAttribute('data-variant', variant);
    expect(button).toHaveAttribute('type', 'button');
  });

  it('uses the tone of its variant', () => {
    render(<Button variant="danger">Weiter</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('data-tone', 'danger');
  });

  it('fires onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Prüfen</Button>);

    await user.click(screen.getByRole('button', { name: 'Prüfen' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled, greyed out and ignores clicks', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button variant="success" disabled onClick={onClick}>
        Prüfen
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Prüfen' });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-tone', 'locked');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('stays focusable but ignores clicks while loading', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Speichern
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Speichern' });
    await user.click(button);

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});
