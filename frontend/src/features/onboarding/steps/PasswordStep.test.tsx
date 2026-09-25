import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PasswordStep } from './PasswordStep';

function renderStep() {
  const onSubmit = vi.fn();
  render(<PasswordStep displayName="Erza" onSubmit={onSubmit} pending={false} direction={1} />);
  return {
    onSubmit,
    password: screen.getByLabelText('Passwort'),
    confirmation: screen.getByLabelText('Passwort wiederholen'),
    submit: screen.getByRole('button', { name: 'Konto erstellen' }),
  };
}

describe('PasswordStep', () => {
  it('greets the learner by name', () => {
    renderStep();

    expect(screen.getByRole('heading')).toHaveTextContent('Freut mich, Erza!');
  });

  it('keeps the button disabled until both fields are filled', async () => {
    const user = userEvent.setup();
    const { password, confirmation, submit } = renderStep();

    expect(submit).toBeDisabled();
    await user.type(password, 'geheim123');
    expect(submit).toBeDisabled();
    await user.type(confirmation, 'g');
    expect(submit).toBeEnabled();
  });

  it('rejects a password shorter than 8 characters', async () => {
    const user = userEvent.setup();
    const { password, confirmation, submit, onSubmit } = renderStep();

    await user.type(password, 'kurz');
    await user.type(confirmation, 'kurz');
    await user.click(submit);

    expect(password).toHaveAccessibleDescription('Mindestens 8 Zeichen, bitte.');
    expect(password).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that differs and clears the error once it matches', async () => {
    const user = userEvent.setup();
    const { password, confirmation, submit, onSubmit } = renderStep();

    await user.type(password, 'geheim123');
    await user.type(confirmation, 'geheim12');
    await user.click(submit);

    expect(confirmation).toHaveAccessibleDescription('Die Passwörter stimmen nicht überein.');
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(confirmation, '3');
    expect(confirmation).toBeValid();
  });

  it('submits a valid password', async () => {
    const user = userEvent.setup();
    const { password, confirmation, onSubmit } = renderStep();

    await user.type(password, 'geheim123');
    await user.type(confirmation, 'geheim123{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('geheim123');
  });

  it('moves to the confirmation when Enter is pressed in the first field', async () => {
    const user = userEvent.setup();
    const { password, confirmation, onSubmit } = renderStep();

    await user.type(password, 'geheim123{Enter}');

    expect(confirmation).toHaveFocus();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
