import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type SubmitEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from '../components/ui/TextField';
import { moveToNextFieldOnEnter } from './moveToNextField';
import { useFormErrors } from './useFormErrors';

function NameForm({ onValid }: { onValid: () => void }) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [formRef, form] = useFormErrors({
    first: first ? undefined : 'Vorname fehlt',
    last: last ? undefined : 'Nachname fehlt',
  });

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (form.check()) onValid();
  };

  return (
    <form ref={formRef} noValidate onSubmit={submit}>
      <TextField
        label="Vorname"
        value={first}
        error={form.errors.first}
        onChange={(event) => setFirst(event.target.value)}
        onKeyDown={moveToNextFieldOnEnter}
      />
      <TextField
        label="Nachname"
        value={last}
        error={form.errors.last}
        onChange={(event) => {
          setLast(event.target.value);
          form.clear('last');
        }}
      />
      <button type="submit">Senden</button>
      <button type="button" onClick={() => form.rejectFields({ last: 'Vom Server abgelehnt' })}>
        Ablehnen
      </button>
    </form>
  );
}

function renderForm() {
  const onValid = vi.fn();
  render(<NameForm onValid={onValid} />);
  return {
    onValid,
    user: userEvent.setup(),
    first: screen.getByLabelText('Vorname'),
    last: screen.getByLabelText('Nachname'),
  };
}

describe('useFormErrors', () => {
  it('shows no error before the first submit', async () => {
    const { user, first } = renderForm();

    await user.type(first, 'E');

    expect(first).toBeValid();
  });

  it('shows the errors on submit, focuses the first invalid field and then follows the input', async () => {
    const { user, first, last, onValid } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Senden' }));

    expect(first).toBeInvalid();
    expect(last).toBeInvalid();
    expect(first).toHaveFocus();
    expect(onValid).not.toHaveBeenCalled();

    await user.type(first, 'Erza');
    expect(first).toBeValid();
  });

  it('keeps a server error until its field changes', async () => {
    const { user, last } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Ablehnen' }));
    expect(last).toHaveAccessibleDescription('Vom Server abgelehnt');
    expect(last).toHaveFocus();

    await user.type(last, 'x');
    expect(last).toBeValid();
  });

  it('submits once every check passes', async () => {
    const { user, first, last, onValid } = renderForm();

    await user.type(first, 'Erza{Enter}');
    expect(last).toHaveFocus();
    await user.type(last, 'Muster');
    await user.click(screen.getByRole('button', { name: 'Senden' }));

    expect(onValid).toHaveBeenCalledOnce();
  });
});
